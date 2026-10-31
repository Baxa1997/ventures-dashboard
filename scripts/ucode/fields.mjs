#!/usr/bin/env node
/* The fields of the batches in docs/ucode-migration.md, made and set through the
   ucode admin API (api.mjs), with the requests the ucode admin itself sends.

     node scripts/ucode/fields.mjs tables <batch> [--folder "<name>"]
        makes the batch's new tables that do not exist yet, in that sub-folder
        of Admin ("Settings and lists" unless named)
     node scripts/ucode/fields.mjs create <batch>
        makes the batch's fields that its tables do not have yet
     node scripts/ucode/fields.mjs options <batch|all> [--write] [--with-rows]
        sets each pick list's options to the values written in the batch
     node scripts/ucode/fields.mjs status [--write] [--with-rows] [--only table.field]
        makes the batches' status fields ucode STATUS fields: the pick list's
        values in ucode's groups, with their names and colours (names.mjs)

   Tables come first (`tables`, or the MCP's create_table, into Admin) and
   relations after (the MCP's update_table). `create` checks each reply's slug and type and
   stops at the first difference. `options` and `status` only print what they
   would change unless given --write. A field update replaces the whole field,
   so they also skip tables that have rows unless given --with-rows. `status`
   refuses a change that would drop a value the pick list has. */

import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ucode } from './api.mjs';
import { STATUS_OPTIONS, TONE_COLORS } from './names.mjs';
import { readBatches, readTables } from './schema.mjs';

// The batches' types that ucode names differently.
const TYPES = { BOOLEAN: 'CHECKBOX' };

const UPPER = {
   id: 'ID',
   ip: 'IP',
   mrr: 'MRR',
   moic: 'MOIC',
   dd: 'DD',
   ic: 'IC',
   ic1: 'IC1',
   ic2: 'IC2',
   safe: 'SAFE',
   ai: 'AI',
};
const OPTION_LABELS = {
   pre_seed: 'Pre-seed',
   pre_series_a: 'Pre-Series A',
   series_a: 'Series A',
};

// "confirmed_by_id" → "Confirmed By ID", as the in-app agent labels its fields
const fieldLabel = (slug) =>
   slug
      .split('_')
      .map((word) =>
         word === 'pct' ? '%' : (UPPER[word] ?? word[0].toUpperCase() + word.slice(1)),
      )
      .join(' ')
      .replace(/([A-Za-z])(\d)/g, '$1 $2');

// "in_6_months" → "In 6 months"
const optionLabel = (value) =>
   OPTION_LABELS[value] ??
   value
      .split('_')
      .map((word, index) =>
         UPPER[word] ?? (index ? word : word[0].toUpperCase() + word.slice(1)),
      )
      .join(' ');

const batchesOf = (id) => {
   const batches = readBatches().filter(
      (batch) => id === 'all' || batch.id === id,
   );
   if (!batches.length) throw new Error(`No batch "${id}"`);
   return batches;
};

const fieldCache = new Map();
const fieldsOf = async (table) => {
   if (!fieldCache.has(table)) {
      const { ok, status, data } = await ucode('GET', `/v2/fields/${table}`);
      if (!ok) throw new Error(`${table}: cannot read its fields (HTTP ${status})`);
      fieldCache.set(
         table,
         new Map((data?.data?.fields ?? []).map((field) => [field.slug, field])),
      );
   }
   return fieldCache.get(table);
};

const rowCache = new Map();
const rowsOf = async (table) => {
   if (!rowCache.has(table)) {
      const { ok, status, data } = await ucode(
         'POST',
         `/v1/object/get-list/${table}`,
         { data: { limit: 1, offset: 0 } },
      );
      if (!ok) throw new Error(`${table}: cannot count its rows (HTTP ${status})`);
      rowCache.set(table, data?.data?.data?.count ?? 0);
   }
   return rowCache.get(table);
};

// The Admin folder of ucode's menu (docs/ucode-migration.md).
const ADMIN_FOLDER = '60e0336b-5017-49ca-8c96-123aa5e2c9db';

const tables = async (id, folderName = 'Settings and lists') => {
   const menus = await ucode('GET', `/v3/menus?parent_id=${ADMIN_FOLDER}`);
   const folder = (menus.data?.data?.menus ?? []).find(
      (entry) =>
         entry.type === 'FOLDER' &&
         (entry.attributes?.label_en ?? entry.label) === folderName,
   );
   if (!folder) throw new Error(`No folder "${folderName}" in Admin`);
   const known = await ucode('GET', '/v1/table?limit=200');
   if (!known.ok) throw new Error(`Cannot read the tables (HTTP ${known.status})`);
   const existing = new Set((known.data?.data?.tables ?? []).map(({ slug }) => slug));
   let created = 0;
   for (const batch of batchesOf(id))
      for (const table of batch.tables) {
         if (table.existing || existing.has(table.name)) continue;
         const label = fieldLabel(table.name);
         const { ok, status, data } = await ucode('POST', '/v1/table', {
            label,
            slug: table.name,
            description: batch.title,
            show_in_menu: true,
            icon: 'https://api.iconify.design/mdi:table.svg',
            is_cached: false,
            soft_delete: false,
            order_by: false,
            menu_id: folder.id,
            attributes: { label: '', label_en: label },
         });
         if (!ok) {
            console.log(`✗ ${table.name}: HTTP ${status} ${JSON.stringify(data).slice(0, 400)}`);
            console.log(`Stopped. ${created} created.`);
            process.exit(1);
         }
         created++;
         console.log(`✓ ${table.name} "${label}" in ${folderName}`);
      }
   console.log(`Done. ${created} created.`);
};

const create = async (id) => {
   let created = 0;
   for (const batch of batchesOf(id))
      for (const table of batch.tables) {
         if (!table.fields.length) continue;
         const existing = await fieldsOf(table.name);
         for (const field of table.fields) {
            if (existing.has(field.slug)) continue;
            const type = TYPES[field.type] ?? field.type;
            const label = fieldLabel(field.slug);
            const { status, data } = await ucode('POST', `/v2/fields/${table.name}`, {
               id: randomUUID(),
               table_id: table.name,
               slug: field.slug,
               label,
               type,
               index: 'string',
               is_visible: true,
               required: false,
               attributes: { label: '', label_en: label },
            });
            const stored = data?.data;
            if (status !== 201 || stored?.slug !== field.slug || stored?.type !== type) {
               console.log(
                  `✗ ${table.name}.${field.slug} (${type}): HTTP ${status} ${JSON.stringify(data).slice(0, 400)}`,
               );
               console.log(`Stopped. ${created} created.`);
               process.exit(1);
            }
            created++;
            console.log(`✓ ${table.name}.${field.slug} ${type} "${label}"`);
         }
      }
   console.log(`Done. ${created} created.`);
};

// The whole field as the update takes it, with the given type and attributes.
const fieldBody = (field, type, attributes) => ({
   id: field.id,
   table_id: field.table_id,
   slug: field.slug,
   label: field.label,
   type,
   index: field.index || 'string',
   default: field.default ?? '',
   is_visible: field.is_visible ?? true,
   required: field.required ?? false,
   unique: field.unique ?? false,
   automatic: field.automatic ?? false,
   show_label: field.show_label ?? false,
   enable_multilanguage: field.enable_multilanguage ?? false,
   attributes,
});

const options = async (id, { write, withRows }) => {
   const counts = { set: 0, unchanged: 0, skipped: 0, problems: 0 };
   const final = readTables();
   for (const batch of batchesOf(id))
      for (const table of batch.tables)
         for (const spec of table.fields.filter((field) => field.options)) {
            const name = `${table.name}.${spec.slug}`;
            // a later batch made it a STATUS field (`status`)
            const type = final.get(table.name).fields.find(({ slug }) => slug === spec.slug).type;
            if (type !== 'PICK_LIST') continue;
            const field = (await fieldsOf(table.name)).get(spec.slug);
            if (!field || field.type !== 'PICK_LIST') {
               console.log(`✗ ${name}: ${field ? `is ${field.type}` : 'missing'}, not a PICK_LIST`);
               counts.problems++;
               continue;
            }
            const current = field.attributes?.options ?? [];
            const values = current.map((option) => option?.value ?? option);
            if (values.join() === spec.options.join()) {
               counts.unchanged++;
               continue;
            }
            const rows = await rowsOf(table.name);
            if (rows && !withRows) {
               console.log(`– ${name}: skipped, the table has ${rows} rows (--with-rows to include)`);
               counts.skipped++;
               continue;
            }
            const next = spec.options.map((value) => ({
               id: current.find((option) => option?.value === value)?.id ?? randomUUID(),
               value,
               label: optionLabel(value),
               icon: '',
               color: '',
            }));
            if (!write) {
               console.log(`· ${name}: would set [${spec.options.join(', ')}]`);
               counts.set++;
               continue;
            }
            const { ok, status, data } = await ucode(
               'PUT',
               `/v2/fields/${table.name}`,
               fieldBody(field, field.type, {
                  ...field.attributes,
                  options: next,
                  is_multiselect: false,
                  has_color: false,
               }),
            );
            const stored = data?.data?.attributes?.options?.map((option) => option.value);
            if (!ok || stored?.join() !== spec.options.join()) {
               console.log(`✗ ${name}: HTTP ${status} ${JSON.stringify(data).slice(0, 400)}`);
               console.log('Stopped.');
               process.exit(1);
            }
            console.log(`✓ ${name}: [${spec.options.join(', ')}]`);
            counts.set++;
         }
   console.log(
      `${write ? 'Set' : 'Would set'} ${counts.set}, already set ${counts.unchanged}, skipped ${counts.skipped}, problems ${counts.problems}.`,
   );
   if (counts.problems) process.exitCode = 1;
};

const GROUPS = ['todo', 'progress', 'complete'];

// A status field's options in ucode's groups: each value with its names and colour.
const statusGroups = (key, groups) =>
   Object.fromEntries(
      GROUPS.map((group) => [
         group,
         {
            options: groups[group].map((value) => {
               const [ru, uz, en, tone] = STATUS_OPTIONS[key][value];
               return { value, label: en, label_ru: ru, label_uz: uz, label_en: en, color: TONE_COLORS[tone] };
            }),
         },
      ]),
   );

// ucode returns an option's keys in its own order
const optionText = ({ value, label, label_ru, label_uz, label_en, color }) =>
   [value, label, label_ru, label_uz, label_en, color].join('|');

const sameStatus = (field, wanted) =>
   field.type === 'STATUS' &&
   GROUPS.every(
      (group) =>
         (field.attributes?.[group]?.options ?? []).map(optionText).join() ===
         wanted[group].options.map(optionText).join(),
   );

// Every row's value of one field, also saved to a file in the system's
// temporary folder, so they survive a run that stops halfway.
const keepValues = async (table, slug) => {
   const values = [];
   for (let offset = 0; ; offset += 200) {
      const query = encodeURIComponent(JSON.stringify({ limit: 200, offset }));
      const { ok, status, data } = await ucode('GET', `/v2/items/${table}?data=${query}`);
      if (!ok) throw new Error(`${table}: cannot read its rows (HTTP ${status})`);
      const page = data?.data?.data?.response ?? [];
      values.push(...page.filter((row) => row[slug] != null && row[slug] !== '').map((row) => [row.guid, row[slug]]));
      if (page.length < 200) break;
   }
   const file = join(tmpdir(), `ucode-${table}-${slug}-${Date.now()}.json`);
   writeFileSync(file, JSON.stringify(values));
   console.log(`  ${table}.${slug}: ${values.length} values kept in ${file}`);
   return values;
};

const restoreValues = async (table, slug, values) => {
   for (const [guid, value] of values) {
      const { ok, status } = await ucode('PUT', `/v2/items/${table}`, { data: { guid, [slug]: value } });
      if (!ok) throw new Error(`${table} ${guid}: ${slug} not written back (HTTP ${status})`);
   }
   for (const [guid, value] of values) {
      const { data } = await ucode('GET', `/v2/items/${table}/${guid}`);
      const now = data?.data?.data?.response?.[slug];
      if (now !== value) throw new Error(`${table} ${guid}: ${slug} reads "${now}" after writing "${value}" back`);
   }
};

const status = async ({ write, withRows, only }) => {
   const counts = { set: 0, unchanged: 0, skipped: 0, problems: 0 };
   for (const table of readTables().values())
      for (const spec of table.fields.filter((field) => field.type === 'STATUS')) {
         const name = `${table.name}.${spec.slug}`;
         if (only && only !== name) continue;
         const field = (await fieldsOf(table.name)).get(spec.slug);
         if (!field || !['PICK_LIST', 'STATUS'].includes(field.type)) {
            console.log(`✗ ${name}: ${field ? `is ${field.type}` : 'missing'}, not a PICK_LIST or STATUS`);
            counts.problems++;
            continue;
         }
         const wanted = statusGroups(name, spec.groups);
         if (sameStatus(field, wanted)) {
            counts.unchanged++;
            continue;
         }
         const values = GROUPS.flatMap((group) => spec.groups[group]);
         const had =
            field.type === 'PICK_LIST'
               ? (field.attributes?.options ?? []).map((option) => option?.value ?? option)
               : GROUPS.flatMap((group) => (field.attributes?.[group]?.options ?? []).map((option) => option.value));
         const dropped = had.filter((value) => !values.includes(value));
         if (dropped.length) {
            console.log(`✗ ${name}: would drop [${dropped.join(', ')}]`);
            counts.problems++;
            continue;
         }
         const rows = await rowsOf(table.name);
         if (rows && !withRows) {
            console.log(`– ${name}: skipped, the table has ${rows} rows (--with-rows to include)`);
            counts.skipped++;
            continue;
         }
         const groupsText = GROUPS.map((group) => `${group} [${spec.groups[group].join(', ')}]`).join(' ');
         if (!write) {
            console.log(`· ${name}: would make ${field.type} → STATUS ${groupsText}`);
            counts.set++;
            continue;
         }
         // A type change makes the column anew and empties it (checked on 22
         // October), so the rows' values are kept in a file first and written back.
         const kept = rows ? await keepValues(table.name, spec.slug) : [];
         // the pick list's own settings go; ucode keeps a status's options in its groups
         const { options: _options, is_multiselect: _multi, has_color: _color, ...attributes } = field.attributes ?? {};
         const { ok, status: code, data } = await ucode(
            'PUT',
            `/v2/fields/${table.name}`,
            fieldBody(field, 'STATUS', { ...attributes, ...wanted }),
         );
         const stored = data?.data;
         if (!ok || stored?.type !== 'STATUS' || !sameStatus(stored, wanted)) {
            console.log(`✗ ${name}: HTTP ${code} ${JSON.stringify(data).slice(0, 400)}`);
            console.log('Stopped.');
            process.exit(1);
         }
         if (kept.length) await restoreValues(table.name, spec.slug, kept);
         console.log(`✓ ${name}: STATUS ${groupsText}${rows ? ` (${rows} rows, ${kept.length} values written back)` : ''}`);
         counts.set++;
      }
   console.log(
      `${write ? 'Made' : 'Would make'} ${counts.set}, already set ${counts.unchanged}, skipped ${counts.skipped}, problems ${counts.problems}.`,
   );
   if (counts.problems) process.exitCode = 1;
};

const [command, target, ...flags] = process.argv.slice(2);
const flagValue = (name) => {
   const all = [target, ...flags];
   const index = all.indexOf(name);
   return index === -1 ? undefined : all[index + 1];
};
if (command === 'tables' && target) await tables(target, flagValue('--folder'));
else if (command === 'create' && target) await create(target);
else if (command === 'status')
   await status({
      write: [target, ...flags].includes('--write'),
      withRows: [target, ...flags].includes('--with-rows'),
      only: flagValue('--only'),
   });
else if (command === 'options' && target)
   await options(target, {
      write: flags.includes('--write'),
      withRows: flags.includes('--with-rows'),
   });
else {
   console.error(
      'Usage: node scripts/ucode/fields.mjs tables <batch> [--folder "<name>"] | create <batch> | options <batch|all> [--write] [--with-rows] | status [--write] [--with-rows] [--only table.field]',
   );
   process.exitCode = 2;
}

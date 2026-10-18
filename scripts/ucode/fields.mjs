#!/usr/bin/env node
/* The fields of the batches in docs/ucode-migration.md, made and set through the
   ucode admin API (api.mjs), with the requests the ucode admin itself sends.

     node scripts/ucode/fields.mjs create <batch>
        makes the batch's fields that its tables do not have yet
     node scripts/ucode/fields.mjs options <batch|all> [--write] [--with-rows]
        sets each pick list's options to the values written in the batch

   Tables come first (the MCP's create_table, into Admin) and relations after
   (the MCP's update_table). `create` checks each reply's slug and type and
   stops at the first difference. `options` only prints what it would change
   unless given --write. A field update replaces the whole field, so it also
   skips tables that have rows unless given --with-rows. */

import { randomUUID } from 'node:crypto';
import { ucode } from './api.mjs';
import { readBatches } from './schema.mjs';

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

const options = async (id, { write, withRows }) => {
   const counts = { set: 0, unchanged: 0, skipped: 0, problems: 0 };
   for (const batch of batchesOf(id))
      for (const table of batch.tables)
         for (const spec of table.fields.filter((field) => field.options)) {
            const name = `${table.name}.${spec.slug}`;
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
            const { ok, status, data } = await ucode('PUT', `/v2/fields/${table.name}`, {
               id: field.id,
               table_id: field.table_id,
               slug: field.slug,
               label: field.label,
               type: field.type,
               index: field.index || 'string',
               default: field.default ?? '',
               is_visible: field.is_visible ?? true,
               required: field.required ?? false,
               unique: field.unique ?? false,
               automatic: field.automatic ?? false,
               show_label: field.show_label ?? false,
               enable_multilanguage: field.enable_multilanguage ?? false,
               attributes: {
                  ...field.attributes,
                  options: next,
                  is_multiselect: false,
                  has_color: false,
               },
            });
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

const [command, target, ...flags] = process.argv.slice(2);
if (command === 'create' && target) await create(target);
else if (command === 'options' && target)
   await options(target, {
      write: flags.includes('--write'),
      withRows: flags.includes('--with-rows'),
   });
else {
   console.error(
      'Usage: node scripts/ucode/fields.mjs create <batch> | options <batch|all> [--write] [--with-rows]',
   );
   process.exitCode = 2;
}

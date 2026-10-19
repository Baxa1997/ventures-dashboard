#!/usr/bin/env node
/* How the ucode admin shows the fund's tables: the Admin folder split into the
   panel's sections, Russian and Uzbek names for folders, tables and columns
   (names.mjs), and the main columns of the Deals table. The panel and the
   website read tables by slug, so none of this changes them.

     node scripts/ucode/admin-ui.mjs folders|menus|fields|deals-view|all [--write]

   folders     makes Admin's sub-folders that are missing and moves each table
               into its own
   menus       names the folders and tables in every language
   fields      names the columns; a relation column also gets the name its
               table shows from the other side
   deals-view  the columns the Deals table shows

   Without --write it prints what it would change. A name someone already set
   by hand in a language is kept. Menu entries and fields are replaced with
   what is sent, so each is sent back as read, with only the change made, and
   read back afterwards. The login table's columns are left alone. */

import { ucode } from './api.mjs';
import {
   DEALS_COLUMNS,
   FIELDS,
   FOLDERS,
   ONE_OF,
   TABLE_FIELDS,
   TABLES,
   TOP_FOLDERS,
} from './names.mjs';

const PROJECT = '7b7f88ab-7ba6-41e5-8782-25e0c1c59d53';
const MAIN_MENU = 'c57eedc3-a954-4262-a0af-376c65b5a284';
const SKIP_FIELDS = new Set(['staff_users']);

const [command, ...flags] = process.argv.slice(2);
const write = flags.includes('--write');
let problems = 0;

const fail = (what, reply) => {
   problems++;
   console.log(`✗ ${what}: HTTP ${reply.status} ${JSON.stringify(reply.data).slice(0, 300)}`);
};

// The entries of a folder. The list holds one row per role and pages over
// those rows, so it is read until a page brings nothing new.
const entries = async (parentId) => {
   const found = new Map();
   for (let offset = 0; ; offset += 10) {
      const reply = await ucode(
         'GET',
         `/v3/menus?parent_id=${parentId}&project-id=${PROJECT}&offset=${offset}&limit=10`,
      );
      if (!reply.ok) throw new Error(`cannot read the menu ${parentId} (HTTP ${reply.status})`);
      const page = reply.data?.data?.menus ?? [];
      if (!page.length) break;
      for (const entry of page) found.set(entry.id, entry);
   }
   return [...found.values()];
};

// An entry as the update takes it: everything it has but its permissions.
const asSent = ({ data, is_static, ...entry }) => entry;

const putEntry = async (entry, what) => {
   const reply = await ucode('PUT', '/v3/menus', asSent(entry));
   if (!reply.ok) fail(what, reply);
   return reply.ok;
};

const topFolder = async (label) => {
   const folder = (await entries(MAIN_MENU)).find(
      (entry) => entry.type === 'FOLDER' && entry.label === label,
   );
   if (!folder) throw new Error(`no folder "${label}" in the main menu`);
   return folder;
};

// Admin's sub-folders by their English name.
const subFolders = async (admin) =>
   new Map(
      (await entries(admin.id))
         .filter((entry) => entry.type === 'FOLDER')
         .map((entry) => [entry.attributes?.label_en ?? entry.label, entry]),
   );

// The names an entry gets: English as it is, Russian and Uzbek unless set.
const named = (attributes = {}, [ru, uz], en) => ({
   ...attributes,
   label_en: attributes.label_en || en,
   label_ru: attributes.label_ru || ru,
   label_uz: attributes.label_uz || uz,
});

const sameNames = (a = {}, b = {}) =>
   ['label_en', 'label_ru', 'label_uz', 'label_to_ru', 'label_to_uz'].every(
      (key) => (a[key] ?? '') === (b[key] ?? ''),
   );

const folders = async () => {
   const admin = await topFolder('Admin');
   let made = await subFolders(admin);
   for (const folder of FOLDERS) {
      if (made.has(folder.en)) continue;
      console.log(`· folder ${folder.en}: ${write ? 'making' : 'would make'} it in Admin`);
      if (!write) continue;
      const reply = await ucode('POST', '/v3/menus', {
         label: folder.en,
         icon: folder.icon,
         parent_id: admin.id,
         type: 'FOLDER',
         attributes: { label_en: folder.en, label_ru: folder.ru, label_uz: folder.uz },
      });
      if (!reply.ok) fail(`folder ${folder.en}`, reply);
   }
   if (write) made = await subFolders(admin);

   // the tables still directly in Admin, then those already in a sub-folder
   const placed = new Map();
   for (const entry of await entries(admin.id))
      if (entry.type === 'TABLE') placed.set(entry.data?.table?.slug, entry);
   for (const folder of made.values())
      for (const entry of await entries(folder.id))
         if (entry.type === 'TABLE') placed.set(entry.data?.table?.slug, entry);

   for (const folder of FOLDERS) {
      const target = made.get(folder.en);
      for (const slug of folder.tables) {
         const entry = placed.get(slug);
         if (!entry) {
            problems++;
            console.log(`✗ ${slug}: no menu entry found in Admin`);
            continue;
         }
         if (target && entry.parent_id === target.id) continue;
         console.log(`· ${slug}: ${write ? 'moving' : 'would move'} to ${folder.en}`);
         if (write && target)
            (await putEntry({ ...entry, parent_id: target.id }, `move ${slug}`)) &&
               console.log(`✓ ${slug} → ${folder.en}`);
      }
   }
   const known = new Set(FOLDERS.flatMap(({ tables }) => tables));
   for (const slug of placed.keys())
      if (!known.has(slug)) console.log(`· ${slug}: in Admin but in no folder of names.mjs, left where it is`);
};

const menus = async () => {
   const admin = await topFolder('Admin');
   const subs = await subFolders(admin);
   const todo = [];
   for (const [label, names] of Object.entries(TOP_FOLDERS))
      todo.push([await topFolder(label), names, label]);
   for (const folder of FOLDERS)
      if (subs.has(folder.en)) todo.push([subs.get(folder.en), [folder.ru, folder.uz], folder.en]);
   const parents = [admin, ...subs.values(), await topFolder('Landing page')];
   for (const parent of parents)
      for (const entry of await entries(parent.id)) {
         const slug = entry.data?.table?.slug;
         if (entry.type === 'TABLE' && TABLES[slug])
            todo.push([entry, TABLES[slug], entry.attributes?.label_en || entry.label]);
      }

   let unchanged = 0;
   for (const [entry, names, en] of todo) {
      const attributes = named(entry.attributes, names, en);
      if (sameNames(entry.attributes, attributes)) {
         unchanged++;
         continue;
      }
      console.log(`· ${en}: ${write ? '' : 'would be '}${attributes.label_ru} / ${attributes.label_uz}`);
      if (write) await putEntry({ ...entry, attributes }, `name ${en}`);
   }
   console.log(`${todo.length} entries, ${unchanged} already named.`);
};

// "FROM investments TO decisions" → "decisions"
const targetOf = (field) =>
   field.label?.match(/ TO (\w+)$/)?.[1] ?? field.slug.replace(/_id$/, '');

const fieldNames = (table, field) => {
   if (field.type === 'LOOKUP') {
      const one = ONE_OF[targetOf(field)];
      const back = TABLES[table];
      if (!one || !back) return null;
      return {
         ...named(field.attributes, one, field.attributes?.label_en),
         label_to_ru: field.attributes?.label_to_ru || back[0],
         label_to_uz: field.attributes?.label_to_uz || back[1],
      };
   }
   const names = TABLE_FIELDS[table]?.[field.slug] ?? FIELDS[field.slug];
   return names ? named(field.attributes, names, field.attributes?.label_en || field.label) : null;
};

const fields = async () => {
   const counts = { named: 0, unchanged: 0, missing: [] };
   for (const table of Object.keys(TABLES)) {
      if (SKIP_FIELDS.has(table) || !FOLDERS.some(({ tables }) => tables.includes(table))) continue;
      const reply = await ucode('GET', `/v2/fields/${table}`);
      if (!reply.ok) {
         fail(`read ${table}`, reply);
         continue;
      }
      for (const field of reply.data?.data?.fields ?? []) {
         if (field.type === 'UUID') continue;
         const attributes = fieldNames(table, field);
         if (!attributes) {
            counts.missing.push(`${table}.${field.slug}`);
            continue;
         }
         if (sameNames(field.attributes, attributes)) {
            counts.unchanged++;
            continue;
         }
         counts.named++;
         if (!write) continue;
         const put = await ucode('PUT', `/v2/fields/${table}`, { ...field, attributes });
         const stored = put.data?.data;
         if (
            !put.ok ||
            stored?.type !== field.type ||
            stored?.slug !== field.slug ||
            stored?.label !== field.label ||
            !sameNames(stored?.attributes, attributes)
         ) {
            fail(`${table}.${field.slug}`, put);
            console.log('Stopped.');
            process.exit(1);
         }
      }
      console.log(`✓ ${table}`);
   }
   console.log(
      `${write ? 'Named' : 'Would name'} ${counts.named} columns, ${counts.unchanged} already named.`,
   );
   if (counts.missing.length) console.log(`No name in names.mjs for: ${counts.missing.join(', ')}`);
};

const dealsView = async () => {
   const admin = await topFolder('Admin');
   const parents = [admin, ...(await subFolders(admin)).values()];
   let menu;
   for (const parent of parents)
      menu ??= (await entries(parent.id)).find((entry) => entry.data?.table?.slug === 'deals');
   if (!menu) throw new Error('no menu entry for deals');
   const [views, fieldsReply] = await Promise.all([
      ucode('GET', `/v3/menus/${menu.id}/views?project-id=${PROJECT}`),
      ucode('GET', '/v2/fields/deals'),
   ]);
   const view = views.data?.data?.views?.find(({ type }) => type === 'TABLE');
   const ids = new Map((fieldsReply.data?.data?.fields ?? []).map((field) => [field.slug, field.id]));
   if (!view) throw new Error('the Deals menu entry has no table view');
   const columns = DEALS_COLUMNS.map((slug) => ids.get(slug));
   if (columns.some((id) => !id)) throw new Error('a column of DEALS_COLUMNS is not a field of deals');
   if (view.columns?.join() === columns.join()) return console.log('Deals already shows its main columns.');
   console.log(
      `· Deals table view: ${view.columns?.length ?? 0} columns → ${columns.length} (${DEALS_COLUMNS.join(', ')})${write ? '' : ', not written'}`,
   );
   if (!write) return;
   const reply = await ucode('PUT', `/v3/menus/${menu.id}/views`, { ...view, columns });
   if (!reply.ok) return fail('Deals table view', reply);
   const after = await ucode('GET', `/v3/menus/${menu.id}/views?project-id=${PROJECT}`);
   const stored = after.data?.data?.views?.find(({ id }) => id === view.id);
   if (stored?.columns?.join() !== columns.join()) fail('Deals table view read back', after);
   else console.log('✓ Deals shows its main columns');
};

const COMMANDS = { folders, menus, fields, 'deals-view': dealsView };
if (command === 'all') for (const run of Object.values(COMMANDS)) await run();
else if (COMMANDS[command]) await COMMANDS[command]();
else {
   console.error('Usage: node scripts/ucode/admin-ui.mjs folders|menus|fields|deals-view|all [--write]');
   process.exit(2);
}
if (problems) {
   console.log(`${problems} problem(s).`);
   process.exitCode = 1;
}

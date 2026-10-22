#!/usr/bin/env node
/* The reference rows of docs/ucode-migration.md, and the links that rows made
   before a list existed get to it, through the ucode admin API (api.mjs).

     node scripts/ucode/rows.mjs insert <batch> [--write]
        adds the batch's "Rows for <table> (…)" that the table does not have
        yet (by the first column), and fills "Every existing row of …" lines
     node scripts/ucode/rows.mjs link [--write]
        points the applications, deals and tasks made before batch 7 to its
        lists, read from their old text fields (stage, source, type, …)

   Both only print what they would change unless given --write. Nothing is
   deleted and no value that is set is changed. */

import { ucode } from './api.mjs';
import { readBatches, readTables } from './schema.mjs';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATION = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs/ucode-migration.md');

const [command, target, ...flags] = process.argv.slice(2);
const write = [target, ...flags].includes('--write');
let problems = 0;

const listAll = async (table) => {
   const rows = [];
   for (let offset = 0; ; offset += 200) {
      const query = encodeURIComponent(JSON.stringify({ limit: 200, offset }));
      const { ok, status, data } = await ucode('GET', `/v2/items/${table}?data=${query}`);
      if (!ok) throw new Error(`${table}: cannot read its rows (HTTP ${status})`);
      const page = data?.data?.data?.response ?? [];
      rows.push(...page);
      if (page.length < 200) return rows;
   }
};

const update = async (table, guid, data, what) => {
   if (!write) return console.log(`· ${what}`);
   const reply = await ucode('PUT', `/v2/items/${table}`, { data: { guid, ...data } });
   if (reply.ok) console.log(`✓ ${what}`);
   else {
      problems++;
      console.log(`✗ ${what}: HTTP ${reply.status} ${JSON.stringify(reply.data).slice(0, 300)}`);
   }
};

// "true" → true, "4" → 4 for a NUMBER field, "empty" → nothing
const valueOf = (type, text) => {
   if (text === 'empty') return undefined;
   if (type === 'BOOLEAN') return text === 'true';
   if (type === 'NUMBER') return Number(text);
   return text;
};

// ---- insert

const insert = async (id) => {
   const batch = readBatches().find((item) => item.id === id);
   if (!batch) throw new Error(`No batch "${id}"`);
   const tables = readTables();
   const text = readFileSync(MIGRATION, 'utf8');
   const body = text.match(new RegExp(`^## Batch ${id} — [^\\n]+\\n[\\s\\S]*?\`\`\`\\n([\\s\\S]*?)\`\`\``, 'm'))[1];

   let table = null;
   let columns = [];
   const blocks = [];
   for (const line of body.split('\n')) {
      let match;
      if ((match = line.match(/^Rows for (\w+) \(([^)]*)\)/))) {
         // batch 1 writes "name_ru = name_uz = name_en": its rows were inserted by the agent
         if (match[2].includes('=')) {
            table = null;
            continue;
         }
         table = match[1];
         columns = match[2].split(' | ').map((column) => column.trim());
         blocks.push({ table, columns, rows: [] });
      } else if ((match = line.match(/^Every existing row of ([\w ,]+?): (\w+) (\w+)$/))) {
         table = null;
         const names = match[1].split(/,\s*|\s+and\s+/);
         blocks.push({ every: names, field: match[2], value: match[3] });
      } else if (table && line.startsWith('- ')) {
         blocks.at(-1).rows.push(line.slice(2).split(' | ').map((cell) => cell.trim()));
      } else if (!line.trim()) table = null;
   }

   for (const block of blocks) {
      if (block.every) {
         for (const name of block.every) {
            const type = tables.get(name).fields.find(({ slug }) => slug === block.field).type;
            const value = valueOf(type, block.value);
            for (const row of await listAll(name))
               if (row[block.field] == null)
                  await update(name, row.guid, { [block.field]: value }, `${name} ${row.slug ?? row.code ?? row.guid}: ${block.field} ${value}`);
         }
         continue;
      }
      const spec = tables.get(block.table);
      const typeOf = (column) => spec.fields.find(({ slug }) => slug === column)?.type;
      const unknown = block.columns.filter((column) => !typeOf(column));
      if (unknown.length) throw new Error(`${block.table}: no fields ${unknown.join(', ')}`);
      const key = block.columns[0];
      const existing = new Set((await listAll(block.table)).map((row) => row[key]));
      for (const cells of block.rows) {
         if (existing.has(cells[0])) continue;
         const data = Object.fromEntries(
            block.columns
               .map((column, index) => [column, valueOf(typeOf(column), cells[index])])
               .filter(([, value]) => value !== undefined),
         );
         const what = `${block.table} ${cells[0]}`;
         if (!write) {
            console.log(`· ${what}: would add`);
            continue;
         }
         const reply = await ucode('POST', `/v2/items/${block.table}`, { data });
         if (reply.status === 201) console.log(`✓ ${what}`);
         else {
            problems++;
            console.log(`✗ ${what}: HTTP ${reply.status} ${JSON.stringify(reply.data).slice(0, 300)}`);
         }
      }
   }
};

// ---- link

// A text the old rows hold, as a list's key: "Social media" → "social_media"
const keyOf = (text) =>
   String(text ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

// What each old text field is in a list: [table, field, list, how the list is matched]
const LINKS = [
   ['applications', 'industry', 'industries', 'slug'],
   ['applications', 'stage', 'round_stages', 'slug'],
   ['applications', 'source', 'lead_sources', 'slug'],
   ['deals', 'round_stage', 'round_stages', 'slug'],
   ['deals', 'heard_from', 'lead_sources', 'slug'],
   ['deals', 'channel', 'lead_sources', 'slug'],
   ['deals', 'country', 'countries', 'name'],
   ['tasks', 'type', 'task_types', 'slug'],
];

const link = async () => {
   const lists = {};
   for (const list of new Set(LINKS.map(([, , name]) => name))) lists[list] = await listAll(list);

   const find = (list, how, text) => {
      if (!text) return null;
      if (how === 'name')
         return lists[list].find((row) =>
            [row.name_ru, row.name_uz, row.name_en, row.code].some((name) => keyOf(name) === keyOf(text)),
         );
      return lists[list].find((row) => row.slug === keyOf(text) || row.slug === String(text).trim().toLowerCase());
   };

   for (const table of new Set(LINKS.map(([name]) => name))) {
      for (const row of await listAll(table)) {
         const data = {};
         const notes = [];
         for (const [, field, list, how] of LINKS.filter(([name]) => name === table)) {
            const relation = `${list}_id`;
            // a website deal's channel is "site"; its source is the founder's answer
            if (row[relation] || data[relation] || !row[field] || row[field] === 'site') continue;
            const match = find(list, how, row[field]);
            if (match) {
               data[relation] = match.guid;
               notes.push(`${field} "${row[field]}" → ${list}`);
            } else notes.push(`${field} "${row[field]}" has no row in ${list}`);
         }
         const name = row.number ?? row.ref ?? row.title ?? row.guid;
         if (Object.keys(data).length) await update(table, row.guid, data, `${table} ${name}: ${notes.join('; ')}`);
         else if (notes.length) console.log(`– ${table} ${name}: ${notes.join('; ')}`);
      }
   }
};

if (command === 'insert' && target && target !== '--write') await insert(target);
else if (command === 'link') await link();
else {
   console.error('Usage: node scripts/ucode/rows.mjs insert <batch> [--write] | link [--write]');
   process.exitCode = 2;
}
if (problems) {
   console.log(`${problems} problems.`);
   process.exitCode = 1;
}

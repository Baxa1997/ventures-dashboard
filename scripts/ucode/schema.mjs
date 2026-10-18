#!/usr/bin/env node
/* The ucode schema of docs/ucode-migration.md, read from its batch messages so
   the file stays the one place it is written.

     node scripts/ucode/schema.mjs spec [batch]      the batch (T, 1–5) as JSON, or all of them
     node scripts/ucode/schema.mjs check <file.dbml> compares ucode's get_dbml export with the batches

   `check` exits with 1 when a table that exists is missing something or has a
   field of the wrong type. Batches with none of their tables yet are reported
   as not created. */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATION = resolve(
   dirname(fileURLToPath(import.meta.url)),
   '../../docs/ucode-migration.md',
);

// Fields ucode adds to every table by itself.
const SYSTEM_FIELDS = new Set([
   'guid',
   'created_at',
   'updated_at',
   'deleted_at',
   'folder_id',
]);

// ucode's own tables, which get_dbml lists too.
const SYSTEM_TABLES = new Set([
   'person',
   'client_type',
   'role',
   'sms_template',
]);

// The column type get_dbml prints for each field type of the batches.
const COLUMN_TYPES = {
   SINGLE_LINE: ['VARCHAR', 'TEXT'],
   MULTI_LINE: ['VARCHAR', 'TEXT'],
   PICK_LIST: ['VARCHAR', 'TEXT'],
   EMAIL: ['VARCHAR', 'TEXT'],
   PHONE: ['VARCHAR', 'TEXT'],
   PHOTO: ['VARCHAR', 'TEXT'],
   JSON: ['VARCHAR', 'TEXT', 'JSON', 'JSONB'],
   NUMBER: ['FLOAT', 'NUMERIC', 'DOUBLE PRECISION', 'REAL'],
   DATE: ['DATE'],
   DATE_TIME: ['TIMESTAMP', 'TIMESTAMPTZ'],
   BOOLEAN: ['BOOL', 'BOOLEAN'],
   RELATION: ['UUID'],
};

// ---- the batches, from the migration file

export const readBatches = () => {
   const text = readFileSync(MIGRATION, 'utf8');
   const batches = [];
   for (const [, id, title, body] of text.matchAll(
      /^## Batch (\w+) — ([^\n]+)\n[\s\S]*?```\n([\s\S]*?)```/gm,
   )) {
      if (id === '0') continue;
      const batch = { id, title, tables: [] };
      let table = null;
      let section = 'fields';
      const tableOf = (name) => batch.tables.find((item) => item.name === name);
      for (const line of body.split('\n')) {
         let match;
         if ((match = line.match(/^Table (\w+)/))) {
            table = {
               name: match[1],
               existing: false,
               fields: [],
               relations: [],
            };
            batch.tables.push(table);
            section = 'fields';
         } else if (
            (match = line.match(/^New fields in the existing table (\w+)/))
         ) {
            table = {
               name: match[1],
               existing: true,
               fields: [],
               relations: [],
            };
            batch.tables.push(table);
            section = 'fields';
         } else if (/^Relations/.test(line)) {
            section = 'relations';
         } else if (/^(Rows|One row)/.test(line)) {
            section = 'rows';
         } else if (
            section === 'fields' &&
            table &&
            (match = line.match(/^- (\w+): (\w+)(?: \[([^\]]*)\])?/))
         ) {
            table.fields.push({
               slug: match[1],
               type: match[2],
               ...(match[3] && { options: match[3].split(/,\s*/) }),
            });
         } else if (
            section === 'relations' &&
            (match = line.match(/^- (\w+) → (\w+)/))
         ) {
            const [, from, to] = match;
            // a relation may start from a table of an earlier batch (deals → meetings)
            const owner = tableOf(from) ?? {
               name: from,
               existing: true,
               fields: [],
               relations: [],
            };
            if (!tableOf(from)) batch.tables.push(owner);
            owner.relations.push({ target: to, field: `${to}_id` });
         }
      }
      batches.push(batch);
   }
   return batches;
};

// Every table of the batches with all its fields and relations, merged across
// batches (deals gets fields in batches 2 and 5 and a relation in batch 3).
export const readTables = () => {
   const tables = new Map();
   for (const batch of readBatches())
      for (const { name, fields, relations } of batch.tables) {
         const table = tables.get(name) ?? { name, fields: [], relations: [] };
         table.fields.push(...fields);
         table.relations.push(...relations);
         tables.set(name, table);
      }
   return tables;
};

// ---- get_dbml's export

const readDbml = (file) => {
   const text = readFileSync(file, 'utf8');
   const tables = new Map();
   for (const [, name, body] of text.matchAll(/Table\s+(\w+)\s*\{([^}]*)\}/g)) {
      const fields = new Map();
      for (const line of body.split('\n')) {
         const match = line.trim().match(/^(\w+)\s*(.*)$/);
         if (match)
            fields.set(
               match[1],
               match[2]
                  .replace(/\[.*\]/, '')
                  .trim()
                  .toUpperCase(),
            );
      }
      tables.set(name, fields);
   }
   const refs = new Set(
      [...text.matchAll(/Ref:\s*(\w+)\.(\w+)\s*>\s*(\w+)\.\w+/g)].map(
         ([, from, field, to]) => `${from}.${field}>${to}`,
      ),
   );
   return { tables, refs };
};

// ---- commands

const spec = (id) => {
   const batches = readBatches().filter((batch) => !id || batch.id === id);
   if (!batches.length) throw new Error(`No batch "${id}" in ${MIGRATION}`);
   console.log(JSON.stringify(id ? batches[0] : batches, null, 2));
};

const check = (file) => {
   const { tables, refs } = readDbml(file);
   const batches = readBatches();
   const expected = new Set();
   let problems = 0;

   for (const batch of batches) {
      const own = batch.tables.filter((table) => !table.existing);
      own.forEach((table) => expected.add(table.name));
      const created = own.filter((table) => tables.has(table.name));
      if (own.length && !created.length) {
         console.log(`\nBatch ${batch.id} — ${batch.title}: not created yet`);
         continue;
      }
      console.log(`\nBatch ${batch.id} — ${batch.title}`);

      for (const table of batch.tables) {
         const actual = tables.get(table.name);
         if (!actual) {
            console.log(`  ✗ ${table.name}: table missing`);
            problems++;
            continue;
         }
         const issues = [];
         for (const field of table.fields) {
            const type = actual.get(field.slug);
            if (type === undefined) issues.push(`missing field ${field.slug}`);
            else if (!COLUMN_TYPES[field.type]?.includes(type))
               issues.push(
                  `${field.slug} is ${type || 'of an unknown type'}, expected ${field.type}`,
               );
         }
         for (const { target, field } of table.relations) {
            const type = actual.get(field);
            if (type === undefined)
               issues.push(`missing relation field ${field} → ${target}`);
            else if (!COLUMN_TYPES.RELATION.includes(type))
               issues.push(`${field} is ${type}, expected a relation (UUID)`);
            if (!refs.has(`${table.name}.${field}>${target}`))
               issues.push(`no Ref ${table.name}.${field} > ${target}`);
         }
         if (!table.existing) {
            const known = new Set([
               ...table.fields.map(({ slug }) => slug),
               ...batches.flatMap((item) =>
                  item.tables
                     .filter(({ name }) => name === table.name)
                     .flatMap(({ fields, relations }) => [
                        ...fields.map(({ slug }) => slug),
                        ...relations.map(({ field }) => field),
                     ]),
               ),
            ]);
            const extra = [...actual.keys()].filter(
               (slug) => !known.has(slug) && !SYSTEM_FIELDS.has(slug),
            );
            if (extra.length)
               issues.push(`fields not in the spec: ${extra.join(', ')}`);
         }
         const count = (n, word) =>
            n ? `${n} ${word}${n === 1 ? '' : 's'}` : '';
         const counted = [
            count(
               table.fields.length,
               table.existing ? 'added field' : 'field',
            ),
            count(
               table.relations.length,
               table.existing ? 'added relation' : 'relation',
            ),
         ]
            .filter(Boolean)
            .join(', ');
         if (issues.length) {
            problems++;
            console.log(`  ✗ ${table.name} (${counted})`);
            issues.forEach((issue) => console.log(`      ${issue}`));
         } else console.log(`  ✓ ${table.name} (${counted})`);
      }
   }

   const extraTables = [...tables.keys()].filter(
      (name) => !expected.has(name) && !SYSTEM_TABLES.has(name),
   );
   if (extraTables.length)
      console.log(`\nTables not in the spec: ${extraTables.join(', ')}`);
   console.log(
      `\n${tables.size} tables in the export. ${problems ? `${problems} with problems.` : 'No problems.'}`,
   );
   process.exitCode = problems ? 1 : 0;
};

// The other scripts of this folder import readBatches; only a direct run is a command.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
   const [command, argument] = process.argv.slice(2);
   if (command === 'spec') spec(argument);
   else if (command === 'check' && argument) check(argument);
   else {
      console.error(
         'Usage: node scripts/ucode/schema.mjs spec [batch] | check <file.dbml>',
      );
      process.exitCode = 2;
   }
}

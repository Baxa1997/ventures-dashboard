#!/usr/bin/env node
/* Compares the live ucode project with the batches of docs/ucode-migration.md,
   field by field, through the ucode admin API (api.mjs). Stricter than
   `schema.mjs check`, which sees get_dbml's column types only: this reads
   ucode's own field types, so a MULTI_LINE or PICK_LIST made as SINGLE_LINE
   shows, and it checks each pick list's options, each STATUS field's groups
   and each field's visibility.

     node scripts/ucode/verify.mjs [--rows]

   --rows also checks the row counts of the test environment: industries 11,
   reject_reasons 6, stage_norms 8, fund_settings 1, round_stages 4,
   lead_sources 13, countries 12, task_types 8, employees 1 (Sqb-admin's
   profile, auth.mjs link), every other table empty. */

import { ucode } from './api.mjs';
import { readTables } from './schema.mjs';

const TYPES = { BOOLEAN: 'CHECKBOX' };
const SYSTEM = new Set(['guid', 'created_at', 'updated_at', 'deleted_at', 'folder_id']);
const ROWS = {
   industries: 11,
   reject_reasons: 6,
   stage_norms: 8,
   fund_settings: 1,
   round_stages: 4,
   lead_sources: 13,
   countries: 12,
   task_types: 8,
   employees: 1,
};
const withRows = process.argv.includes('--rows');

// "FROM investments TO decisions" → "decisions"
const targetOf = (field) =>
   field.label?.match(/ TO (\w+)$/)?.[1] ?? field.slug.replace(/_id$/, '');

let problems = 0;
let fieldCount = 0;
let relationCount = 0;
for (const table of readTables().values()) {
   const issues = [];
   const { ok, status, data } = await ucode('GET', `/v2/fields/${table.name}`);
   if (!ok) {
      console.log(`✗ ${table.name}: cannot read its fields (HTTP ${status})`);
      problems++;
      continue;
   }
   const actual = new Map((data?.data?.fields ?? []).map((field) => [field.slug, field]));

   for (const spec of table.fields) {
      const field = actual.get(spec.slug);
      const type = TYPES[spec.type] ?? spec.type;
      if (!field) issues.push(`missing ${spec.slug}`);
      else {
         if (field.type !== type) issues.push(`${spec.slug} is ${field.type}, expected ${type}`);
         if (field.is_visible === false) issues.push(`${spec.slug} is hidden`);
         if (spec.groups && field.type === 'STATUS')
            for (const [group, values] of Object.entries(spec.groups)) {
               const actual = (field.attributes?.[group]?.options ?? []).map((option) => option?.value ?? option?.label);
               if (actual.join() !== values.join())
                  issues.push(`${spec.slug} ${group} is [${actual.join(', ')}], expected [${values.join(', ')}]`);
            }
         if (spec.options) {
            const values = (field.attributes?.options ?? []).map((option) => option?.value ?? option);
            if (values.join() !== spec.options.join())
               issues.push(`${spec.slug} options are [${values.join(', ')}], expected [${spec.options.join(', ')}]`);
         }
      }
      fieldCount++;
   }
   for (const { target, field: slug } of table.relations) {
      const field = actual.get(slug);
      if (!field) issues.push(`missing relation ${slug} → ${target}`);
      else if (field.type !== 'LOOKUP' || targetOf(field) !== target)
         issues.push(`${slug} is ${field.type} to ${targetOf(field)}, expected a relation to ${target}`);
      relationCount++;
   }
   const known = new Set([
      ...table.fields.map(({ slug }) => slug),
      ...table.relations.map(({ field }) => field),
   ]);
   const extra = [...actual.keys()].filter((slug) => !known.has(slug) && !SYSTEM.has(slug));
   if (extra.length) issues.push(`fields not in the spec: ${extra.join(', ')}`);

   let rows = '';
   if (withRows) {
      const response = await ucode('POST', `/v1/object/get-list/${table.name}`, {
         data: { limit: 1, offset: 0 },
      });
      const count = response.data?.data?.data?.count;
      const expected = ROWS[table.name] ?? 0;
      rows = `, ${count} rows`;
      if (count !== expected) issues.push(`${count} rows, expected ${expected}`);
   }

   const summary = `${table.fields.length} fields, ${table.relations.length} relations${rows}`;
   if (issues.length) {
      problems++;
      console.log(`✗ ${table.name} (${summary})`);
      issues.forEach((issue) => console.log(`    ${issue}`));
   } else console.log(`✓ ${table.name} (${summary})`);
}
console.log(
   `\n${fieldCount} fields and ${relationCount} relations checked. ${problems ? `${problems} tables with problems.` : 'No problems.'}`,
);
process.exitCode = problems ? 1 : 0;

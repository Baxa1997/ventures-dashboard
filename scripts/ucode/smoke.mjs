#!/usr/bin/env node
/* An end-to-end test of the ucode schema with the panel's own kind of data:
   one deal (EasyTap, the design's example) followed from application to
   committee, portfolio, report and task, with a row in every table of the
   batches and every relation filled. It writes the rows through the ucode
   admin API (api.mjs), reads each back with its relations, loads every child
   row the way a card would (filtered by its parent's id), then deletes every
   row it made and checks each table is back to its row count from before.

     node scripts/ucode/smoke.mjs --write-test-rows

   Tables that hold reference rows (industries, reject_reasons, stage_norms,
   fund_settings) are only read: the test deal points to the existing fintech
   industry and no_demand reason. Test rows are named "ZZ test". It refuses to
   run against production (UCODE_MCP_SERVER=ucode-prod). */

import { randomUUID } from 'node:crypto';
import { ucode } from './api.mjs';
import { readTables } from './schema.mjs';

if (!process.argv.includes('--write-test-rows')) {
   console.error('This writes test rows and deletes them again. Run with --write-test-rows.');
   process.exit(2);
}
if (process.env.UCODE_MCP_SERVER === 'ucode-prod') {
   console.error('Refusing to write test rows to production.');
   process.exit(2);
}

const tables = readTables();

// Rows that already exist and are only linked to, found by one of their fields.
const REFERENCE = {
   industries: ['slug', 'fintech'],
   reject_reasons: ['code', 'no_demand'],
};
const READ_ONLY = new Set([...Object.keys(REFERENCE), 'stage_norms', 'fund_settings']);

const TERMS = {
   rows: [
      ['Инструмент', 'SAFE · Pre-Series A'],
      ['Раунд', '$1 000 000 · чек фонда $300 000 · 30% раунда'],
      ['Условия SAFE', 'Cap $15M или дисконт 20%, срок 12 месяцев', 'Запрос компании'],
   ],
   warning: 'Стадия Pre-Series A — вне основного мандата (pre-seed, seed).',
};
const METRICS = {
   hint: 'факт 2025',
   items: [
      { label: 'GMV', value: '$4,68M', note: '×2,6 к 2024' },
      { label: 'EBITDA', value: '+$125K', note: 'январь 2026 — отрицательная', warn: true },
   ],
};

// Values from the sample deal; every other field gets a value of its type.
const VALUES = {
   'employees.full_name': 'ZZ test Аналитик',
   'employees.role': 'analyst',
   'employees.access': 'work',
   'employees.duties': ['screening', 'dd'],
   'committee_members.name': 'ZZ test Председатель',
   'committee_members.role': 'chair',
   'committee_members.bodies': ['ic', 'board'],
   'applications.ref': 'ZZ-TEST-0031',
   'applications.startup_name': 'ZZ test EasyTap',
   'applications.contact_name': 'Ерлан Сапаров',
   'applications.industry': 'Сменная занятость',
   'applications.stage': 'pre_series_a',
   'applications.ask_amount': 300000,
   'applications.public_status': 'committee',
   'deals.number': 'ZZ-TEST-2026-0031',
   'deals.company': 'ZZ test EasyTap',
   'deals.about': 'маркетплейс сменной занятости',
   'deals.tags': 'KZ, KG, UZ',
   'deals.country': 'Казахстан',
   'deals.channel': 'network',
   'deals.round_stage': 'pre_series_a',
   'deals.amount': 300000,
   'deals.status': 'active',
   'deals.stage': 'ic2',
   'deals.stage_norm_days': 10,
   'deals.days_used': 6,
   'deals.paused_days': 66,
   'deals.waiting': false,
   'deals.next_title': 'Рассылка материалов членам ИК',
   'deals.next_time': '15:00',
   'deals.round_size': 1000000,
   'deals.pre_money': 7000000,
   'deals.stake_pct': 4.1,
   'deals.instrument': 'safe',
   'deals.terms': TERMS,
   'deals.metrics': METRICS,
   'meetings.body': 'ic',
   'meetings.number': '7',
   'meetings.stage': 'ic2',
   'meetings.date': '2026-10-09',
   'meetings.time': '15:00',
   'meetings.status': 'planned',
   'agenda_items.title': 'ZZ test EasyTap — SAFE $300 000',
   'agenda_items.kind': 'decision',
   'agenda_items.stage': 'ic2',
   'agenda_items.amount': 300000,
   'agenda_items.questions': ['Обоснование исключения из мандата', 'Оценка по DD'],
   'votes.choice': 'for',
   'decisions.body': 'ic',
   'decisions.stage': 'ic2',
   'decisions.outcome': 'approved_conditions',
   'screening_scores.criterion': 'market',
   'screening_scores.score': 4.5,
   'portfolio_companies.name': 'ZZ test EasyTap',
   'portfolio_companies.since': 2026,
   'portfolio_companies.status': 'active',
   'portfolio_companies.instrument': 'safe',
   'investments.kind': 'initial',
   'investments.instrument': 'safe',
   'investments.amount': 300000,
   'investments.valuation': 7000000,
   'investments.stake_pct': 4.1,
   'quarter_reports.quarter': '2026-Q3',
   'quarter_reports.mrr': 91000,
   'quarter_reports.churn': 3.5,
   'quarter_reports.runway': 14,
   'tasks.title': 'ZZ test Рассылка материалов членам ИК',
   'tasks.type': 'portfolio',
   'tasks.priority': 'high',
   'tasks.status': 'in_progress',
   'tasks.recurrence': 'none',
   'task_checklist.done': true,
   'task_checklist.sort_order': 1,
};

let employeeId = null;
const valueOf = (table, { slug, type, options, groups }) => {
   const key = `${table}.${slug}`;
   if (key in VALUES) return VALUES[key];
   if (type === 'SINGLE_LINE' && slug.endsWith('_id'))
      return employeeId ?? randomUUID(); // links to employees hold the row's guid
   switch (type) {
      case 'PICK_LIST':
         return options[0];
      case 'STATUS':
         return [...groups.todo, ...groups.progress, ...groups.complete][0];
      case 'NUMBER':
         return 7.5;
      case 'BOOLEAN':
         return true;
      case 'DATE':
         return '2026-10-18';
      case 'DATE_TIME':
         return '2026-10-18T09:30:00Z';
      case 'JSON':
         return { checked: true, items: [1, 2], text: 'проверка' };
      case 'EMAIL':
         return 'zz.test@example.com';
      case 'PHONE':
         return '+998901234567';
      case 'MULTI_LINE':
         return `ZZ test ${slug}\nвторая строка`;
      default:
         return `ZZ test ${slug}`;
   }
};

// Does the value read back equal the one written, for the field's type?
const same = (type, written, read) => {
   if (read === undefined || read === null) return false;
   switch (type) {
      case 'NUMBER':
         return Number(read) === written;
      case 'DATE':
         return String(read).slice(0, 10) === written;
      case 'DATE_TIME':
         return Date.parse(read) === Date.parse(written);
      case 'JSON': {
         const parsed = typeof read === 'string' ? JSON.parse(read) : read;
         return JSON.stringify(parsed) === JSON.stringify(written);
      }
      default:
         return read === written;
   }
};

const payload = (response) => response.data?.data?.data ?? response.data?.data;
const rowOf = (response) => {
   const data = payload(response);
   return data?.response && !Array.isArray(data.response) ? data.response : data;
};
const rowsOf = (response) => {
   const data = payload(response);
   return data?.response ?? data?.data?.response ?? [];
};
const list = (table, filter) =>
   ucode('GET', `/v2/items/${table}?data=${encodeURIComponent(JSON.stringify({ limit: 50, offset: 0, ...filter }))}`);
const count = async (table) =>
   (await ucode('POST', `/v1/object/get-list/${table}`, { data: { limit: 1, offset: 0 } }))
      .data?.data?.data?.count;

// Tables in an order where each one's relation targets come before it.
const order = [];
const placed = new Set(Object.keys(REFERENCE));
const pending = [...tables.values()].filter(({ name }) => !READ_ONLY.has(name));
pending.sort((a, b) => (a.name === 'employees' ? -1 : b.name === 'employees' ? 1 : 0));
while (pending.length) {
   const index = pending.findIndex((table) =>
      table.relations.every(({ target }) => placed.has(target)),
   );
   if (index < 0) throw new Error(`Relations form a cycle: ${pending.map((t) => t.name)}`);
   const [table] = pending.splice(index, 1);
   order.push(table);
   placed.add(table.name);
}

const results = { fields: 0, relations: 0, joins: 0, filters: 0 };
const problems = [];
const created = []; // [table, guid], deleted in reverse
const guids = {};

const before = {};
for (const name of tables.keys()) before[name] = await count(name);

try {
   for (const [table, [field, value]] of Object.entries(REFERENCE)) {
      const row = rowsOf(await list(table, { [field]: value })).find((r) => r[field] === value);
      if (!row) throw new Error(`${table}: no row with ${field} = ${value}`);
      guids[table] = row.guid;
   }

   // Create one row per table, linked to the rows made before it.
   for (const table of order) {
      const data = {};
      for (const field of table.fields) data[field.slug] = valueOf(table.name, field);
      for (const { target, field } of table.relations) data[field] = guids[target];
      // JSON fields are text columns: ucode stores the string it is given.
      const body = Object.fromEntries(
         Object.entries(data).map(([slug, value]) => [
            slug,
            table.fields.find((field) => field.slug === slug)?.type === 'JSON'
               ? JSON.stringify(value)
               : value,
         ]),
      );
      const response = await ucode('POST', `/v2/items/${table.name}`, { data: body });
      const guid = rowOf(response)?.guid;
      if (response.status !== 201 || !guid)
         throw new Error(`${table.name}: create failed, HTTP ${response.status} ${JSON.stringify(response.data).slice(0, 300)}`);
      created.push([table.name, guid]);
      guids[table.name] = guid;
      if (table.name === 'employees') employeeId = guid;
      table.written = data;
   }
   console.log(`Created ${created.length} rows in ${created.length} tables.`);

   // Read each row back with its relations and compare every field.
   for (const table of order) {
      const row = rowOf(await ucode('GET', `/v2/items/${table.name}/${guids[table.name]}?with_relations=true`));
      for (const field of table.fields) {
         if (same(field.type, table.written[field.slug], row?.[field.slug])) results.fields++;
         else
            problems.push(`${table.name}.${field.slug} (${field.type}): wrote ${JSON.stringify(table.written[field.slug])}, read ${JSON.stringify(row?.[field.slug])}`);
      }
      for (const { target, field } of table.relations) {
         if (row?.[field] === guids[target]) results.relations++;
         else problems.push(`${table.name}.${field}: read ${JSON.stringify(row?.[field])}, expected the ${target} row`);
         if (row?.[`${field}_data`]?.guid === guids[target]) results.joins++;
         else problems.push(`${table.name}.${field}_data: the ${target} row did not come with with_relations`);
      }
   }

   // Load each child the way a card does: filtered by its parent's id.
   for (const table of order)
      for (const { target, field } of table.relations) {
         const rows = rowsOf(await list(table.name, { [field]: guids[target] }));
         if (rows.some((row) => row.guid === guids[table.name])) results.filters++;
         else problems.push(`${table.name} filtered by ${field}: the test row is missing (${rows.length} rows)`);
      }

   // A value outside a pick list's options: accepted or refused by ucode?
   const probe = await ucode('POST', '/v2/items/pilots', { data: { title: 'ZZ test probe', status: 'not_an_option' } });
   const probeGuid = rowOf(probe)?.guid;
   if (probeGuid) created.push(['pilots', probeGuid]);
   console.log(`A pick-list value outside the options is ${probeGuid ? 'accepted (ucode does not enforce options on write)' : `refused (HTTP ${probe.status})`}.`);
} catch (error) {
   problems.push(`Stopped: ${error.message}`);
} finally {
   let deleted = 0;
   for (const [table, guid] of [...created].reverse()) {
      const response = await ucode('DELETE', `/v2/items/${table}/${guid}`, { data: {} });
      if (response.ok) deleted++;
      else problems.push(`${table}: could not delete test row ${guid} (HTTP ${response.status})`);
   }
   const changed = [];
   for (const name of tables.keys()) {
      const now = await count(name);
      if (now !== before[name]) changed.push(`${name} ${before[name]} → ${now}`);
   }
   console.log(`Deleted ${deleted} of ${created.length} test rows. Row counts ${changed.length ? `changed: ${changed.join(', ')}` : 'are back to where they were'}.`);
   if (changed.length) problems.push(`Row counts changed: ${changed.join(', ')}`);
}

const fieldTotal = order.reduce((sum, table) => sum + table.fields.length, 0);
const relationTotal = order.reduce((sum, table) => sum + table.relations.length, 0);
console.log(
   `Fields ${results.fields}/${fieldTotal}, relations ${results.relations}/${relationTotal}, joined rows ${results.joins}/${relationTotal}, filtered loads ${results.filters}/${relationTotal}.`,
);
if (problems.length) {
   console.log(`\n${problems.length} problems:`);
   problems.forEach((problem) => console.log(`  ✗ ${problem}`));
   process.exitCode = 1;
} else console.log('No problems.');

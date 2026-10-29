import {
   createRow,
   day,
   deleteFile,
   deleteRow,
   fromJson,
   listRows,
   num,
   type Row,
   str,
   toJson,
   updateRow,
} from '@shared/api/ucode';
import { createStore, newId, shortName, todayISO } from '@shared/helpers';
import { reloadTeam } from '@shared/hooks';
import attachments from '@shared/services/attachments';
// the instance @shared/i18n sets up; imported directly, so the services run
// without the browser setup (scripts/ucode/panel-test.ts runs them in Node)
import i18n from 'i18next';
import type { MetricFormat } from '@shared/types/portfolio.types';
import type {
   ItemFile,
   Access,
   EscalateTo,
   IndustryMandate,
   ItemTone,
   ListItem,
   ListItemInput,
   ListKind,
   SettingsState,
   StaffInput,
   StaffMember,
   StaffRole,
   StageInput,
   StageItem,
   StatusGroup,
} from '@shared/types/settings.types';
import { DEFAULT_STAGES } from '../constants';
import type { SupportedLanguageType } from '@shared/types/system/language.types';
import type { Role } from '@shared/types/work.types';

/* Настройки in ucode (docs/ucode-migration.md, batches 1, 7 and 8): the
   mandate and the portfolio flags are the one row of fund_settings, the
   stages of a deal with their norms are stage_norms, the journal is
   settings_journal, the staff are employees, and each reference list is a
   table of its own. */

const ESCALATIONS: EscalateTo[] = ['deputy', 'director', 'ic_chair'];

// A stage's place when its row has none: the default order, in tens.
const defaultOrder = (key: string) => {
   const index = DEFAULT_STAGES.findIndex((stage) => stage.key === key);
   return index === -1 ? 1000 : (index + 1) * 10;
};

const isSystemStage = (key: string) =>
   DEFAULT_STAGES.some((stage) => stage.key === key && stage.system);

const toStage = (row: Row): StageItem => {
   const key = str(row.stage);
   return {
      id: row.guid,
      key,
      names: {
         ru: str(row.name_ru),
         uz: str(row.name_uz),
         en: str(row.name_en),
      },
      sortOrder: optionalNumber(row.sort_order) ?? defaultOrder(key),
      isSystem: isSystemStage(key),
      norm: str(row.norm_text) || (row.norm_days ? String(row.norm_days) : ''),
      paused: str(row.paused_when),
      escalation: ESCALATIONS.find((one) => one === row.escalate_to) ?? '',
      isPublic: Boolean(row.is_public),
   };
};

const optionalNumber = (value: unknown) =>
   value === null || value === undefined || value === '' ? null : num(value);

/* The stages in their order: the rows of stage_norms, and a system stage
   that has no row yet with its defaults. A system stage the fund deleted
   keeps its row, turned off, and is left out. Batch 1's one "committee" row
   for both committees gave way to ic1 and ic2 rows and is left out. */
const stagesFrom = (rows: Row[]): StageItem[] => {
   const stages = rows
      .filter((row) => str(row.stage) && row.stage !== 'committee')
      .filter((row) => row.is_active !== false)
      .map(toStage);
   const legacy = rows.find((row) => row.stage === 'committee');
   for (const stage of DEFAULT_STAGES)
      if (stage.system && !rows.some((row) => row.stage === stage.key))
         stages.push({
            id: '',
            key: stage.key,
            names: { ru: '', uz: '', en: '' },
            sortOrder: defaultOrder(stage.key),
            isSystem: true,
            norm:
               (stage.key === 'ic1' || stage.key === 'ic2') && legacy
                  ? str(legacy.norm_text)
                  : '',
            paused: '',
            escalation: '',
            isPublic: false,
         });
   return stages.sort((a, b) => a.sortOrder - b.sortOrder);
};

// The system stages the fund deleted: their rows are turned off.
const removedFrom = (rows: Row[]) =>
   DEFAULT_STAGES.filter(
      ({ key, system }) =>
         system &&
         rows.some((row) => row.stage === key) &&
         !rows.some((row) => row.stage === key && row.is_active !== false),
   ).map(({ key }) => key);

const stageFields = (stage: StageInput) => ({
   stage: stage.key,
   name_ru: stage.names.ru,
   name_uz: stage.names.uz,
   name_en: stage.names.en,
   norm_text: stage.norm,
   norm_days: parseNorm(stage.norm),
   paused_when: stage.paused,
   escalate_to: stage.escalation,
   is_public: stage.isPublic,
   is_active: true,
});

const ROLES: Role[] = [
   'director',
   'deputy',
   'analyst',
   'manager',
   'accountant',
   'assistant',
   'ic_secretary',
   'lawyer',
   'other',
];

// "$50 000 – $300 000", "$50,000 - $300,000", "50K–300K", "от 50 000 до
// 300 000" → [50000, 300000]; null unless the text has two amounts, the
// smaller first. A comma or a dot before three digits groups thousands;
// otherwise it is the decimal point ("1,5M").
export const parseCheck = (text: string): [number, number] | null => {
   const values = [
      ...text
         .replace(/\s/g, '')
         .replace(/(\d)[.,](?=\d{3}(?!\d))/g, '$1')
         .matchAll(/(\d+(?:[.,]\d+)?)([KkMmКкМм]?)/g),
   ].map(
      ([, value, unit]) =>
         Number(value.replace(',', '.')) *
         (/[KkКк]/.test(unit) ? 1_000 : /[MmМм]/.test(unit) ? 1_000_000 : 1),
   );
   return values.length === 2 && values[0] < values[1]
      ? [values[0], values[1]]
      : null;
};

// "5 · публично" → 5; null for a stage that has no number of days.
export const parseNorm = (text: string) => {
   const value = parseInt(text, 10);
   return Number.isFinite(value) && value > 0 ? value : null;
};

const thousands = (value: number) =>
   String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const formatCheck = (min: unknown, max: unknown) =>
   num(min) && num(max)
      ? `$${thousands(num(min))} – $${thousands(num(max))}`
      : '';

// Each list's table, the column that holds its key, and how its names are
// called there (reject_reasons has label_ru, the others name_ru).
const LIST_TABLES: Record<
   ListKind,
   { table: string; key: 'slug' | 'code'; names: 'name' | 'label' }
> = {
   industries: { table: 'industries', key: 'slug', names: 'name' },
   rounds: { table: 'round_stages', key: 'slug', names: 'name' },
   sources: { table: 'lead_sources', key: 'slug', names: 'name' },
   countries: { table: 'countries', key: 'code', names: 'name' },
   reasons: { table: 'reject_reasons', key: 'code', names: 'label' },
   taskTypes: { table: 'task_types', key: 'slug', names: 'name' },
   taskStatuses: { table: 'task_statuses', key: 'slug', names: 'name' },
   metrics: { table: 'portfolio_metrics', key: 'slug', names: 'name' },
   reportDocs: { table: 'report_documents', key: 'slug', names: 'name' },
   docTemplates: { table: 'document_templates', key: 'slug', names: 'name' },
};

/* Where a list's rows are used: the tables whose rows point to an item, by
   its guid (a relation) or by its key. A row in use is deleted only once
   what uses it has another (deleteListItem). */
const USES: Record<
   ListKind,
   { table: string; field: string; by: 'id' | 'key' }[]
> = {
   industries: [
      { table: 'deals', field: 'industries_id', by: 'id' },
      { table: 'applications', field: 'industries_id', by: 'id' },
      { table: 'portfolio_companies', field: 'industries_id', by: 'id' },
   ],
   rounds: [
      { table: 'deals', field: 'round_stages_id', by: 'id' },
      { table: 'applications', field: 'round_stages_id', by: 'id' },
   ],
   sources: [
      { table: 'deals', field: 'lead_sources_id', by: 'id' },
      { table: 'applications', field: 'lead_sources_id', by: 'id' },
   ],
   countries: [
      { table: 'deals', field: 'countries_id', by: 'id' },
      { table: 'applications', field: 'countries_id', by: 'id' },
   ],
   reasons: [{ table: 'deals', field: 'reject_reasons_id', by: 'id' }],
   taskTypes: [{ table: 'tasks', field: 'task_types_id', by: 'id' }],
   taskStatuses: [{ table: 'tasks', field: 'status', by: 'key' }],
   metrics: [
      { table: 'metric_values', field: 'portfolio_metrics_id', by: 'id' },
   ],
   reportDocs: [],
   docTemplates: [],
};

const GROUPS: StatusGroup[] = ['todo', 'progress', 'complete'];
const HEX = /^#[0-9a-f]{6}$/i;
const TONES: ItemTone[] = ['neutral', 'accent', 'success', 'warning', 'danger'];
const FORMATS: MetricFormat[] = ['usd', 'percent', 'months', 'number'];
const oneOf = <T extends string>(options: T[], value: unknown, fallback: T) =>
   options.find((option) => option === value) ?? fallback;

export const LIST_KINDS = Object.keys(LIST_TABLES) as ListKind[];

/* Deletes a list's file — a template replaced or deleted — unless a request
   still offers it: a request's template is a copy pointing to the same file,
   and the applicant may not have downloaded it yet. */
export const releaseFile = async (file: ItemFile | null | undefined) => {
   if (!file?.id) return;
   const offered = (await attachments.getAll()).some(
      ({ url }) => url === file.url,
   );
   if (!offered) await deleteFile(file.id);
};

// The lists whose rows carry a file: a report document's or a template's.
const withFile = (kind: ListKind) =>
   kind === 'reportDocs' || kind === 'docTemplates';

const toItem = (kind: ListKind, row: Row): ListItem => {
   const { key, names } = LIST_TABLES[kind];
   return {
      id: row.guid,
      key: str(row[key]),
      names: {
         ru: str(row[`${names}_ru`]),
         uz: str(row[`${names}_uz`]),
         en: str(row[`${names}_en`]),
      },
      sortOrder: num(row.sort_order),
      // a row from before batch 7 has no mark: it is in use
      active: row.is_active !== false,
      ...(kind === 'industries' && {
         mandate: (str(row.mandate) || 'allowed') as IndustryMandate,
      }),
      ...((kind === 'rounds' || kind === 'countries') && {
         inMandate: Boolean(row.in_mandate),
      }),
      ...(kind === 'sources' && { onSite: Boolean(row.on_site) }),
      ...(kind === 'reasons' && { isMandate: Boolean(row.is_mandate) }),
      ...(row.is_system === true && { isSystem: true }),
      ...(kind === 'taskStatuses' && {
         group: oneOf(GROUPS, row.status_group, 'progress'),
         tone: oneOf(TONES, row.tone, 'neutral'),
         color: HEX.test(str(row.color)) ? str(row.color).toLowerCase() : '',
      }),
      ...(kind === 'metrics' && {
         format: oneOf(FORMATS, row.format, 'number'),
      }),
      ...(withFile(kind) && {
         file: row.file_url
            ? {
                 id: str(row.file_id),
                 url: str(row.file_url),
                 name: str(row.file_name),
              }
            : null,
      }),
   };
};

const itemFields = (kind: ListKind, item: ListItemInput) => {
   const { key, names } = LIST_TABLES[kind];
   return {
      [key]: item.key,
      [`${names}_ru`]: item.names.ru,
      [`${names}_uz`]: item.names.uz,
      [`${names}_en`]: item.names.en,
      is_active: item.active,
      ...(kind === 'industries' && { mandate: item.mandate ?? 'allowed' }),
      ...((kind === 'rounds' || kind === 'countries') && {
         in_mandate: Boolean(item.inMandate),
      }),
      ...(kind === 'sources' && { on_site: Boolean(item.onSite) }),
      ...(kind === 'reasons' && { is_mandate: Boolean(item.isMandate) }),
      ...(kind === 'taskStatuses' && {
         status_group: item.group ?? 'progress',
         tone: item.tone ?? 'neutral',
      }),
      // only once picked: batch 12 adds the field, and a table without it
      // still saves the rest
      ...(kind === 'taskStatuses' && item.color && { color: item.color }),
      ...(kind === 'metrics' && { format: item.format ?? 'number' }),
      ...(withFile(kind) && {
         file_url: item.file?.url ?? '',
         file_name: item.file?.name ?? '',
         file_id: item.file?.id ?? '',
      }),
   };
};

const toStaff = (row: Row): StaffMember => {
   const role = str(row.role) as Role;
   return {
      id: row.guid,
      name: str(row.full_name || row.short_name),
      position: str(row.position),
      email: str(row.email),
      phone: str(row.phone),
      role: ROLES.includes(role) ? role : 'other',
      roles: fromJson<StaffRole[]>(row.duties, []),
      access: (str(row.access) || 'work') as Access,
      addedAt: day(row.invited_at) || day(row.created_at),
      active: row.is_active !== false,
   };
};

const staffFields = (input: Partial<StaffInput>) => ({
   ...(input.name !== undefined && {
      full_name: input.name,
      short_name: shortName(input.name),
   }),
   ...(input.email !== undefined && { email: input.email }),
   ...(input.position !== undefined && { position: input.position }),
   ...(input.phone !== undefined && { phone: input.phone }),
   ...(input.role !== undefined && { role: input.role }),
   ...(input.roles !== undefined && { duties: toJson(input.roles) }),
   ...(input.access !== undefined && { access: input.access }),
   ...(input.active !== undefined && { is_active: input.active }),
});

const byCreated = (a: Row, b: Row) =>
   str(b.date).localeCompare(str(a.date)) ||
   str(b.created_at).localeCompare(str(a.created_at));

// The row behind the rules, to write changes back to.
let rowIds = { settings: '' };

const store = createStore<SettingsState>(async () => {
   const [settingsRows, normRows, journal, employees, ...listRowsOf] =
      await Promise.all(
         [
            'fund_settings',
            'stage_norms',
            'settings_journal',
            'employees',
            ...LIST_KINDS.map((kind) => LIST_TABLES[kind].table),
         ].map((table) => listRows(table)),
      );
   const row: Partial<Row> = settingsRows[0] ?? {};
   rowIds = { settings: row.guid ?? '' };
   return {
      mandate: {
         check: formatCheck(row.check_min, row.check_max),
         focus: str(row.focus_text),
         excluded: str(row.excluded_text),
      },
      stages: stagesFrom(normRows),
      removedStages: removedFrom(normRows),
      flags: {
         runway: num(row.flag_runway_months),
         churn: num(row.flag_churn_pct),
         revenue: num(row.flag_revenue_drop_pct),
         reportLate: num(row.flag_report_late_days),
      },
      journal: [...journal].sort(byCreated).map((item) => ({
         id: item.guid,
         date: day(item.date),
         userId: str(item.employee_id),
         field: str(item.field),
         from: str(item.from_value),
         to: str(item.to_value),
      })),
      staff: employees
         .map(toStaff)
         .sort((a, b) => Number(b.active) - Number(a.active)),
      lists: Object.fromEntries(
         LIST_KINDS.map((kind, index) => [
            kind,
            listRowsOf[index]
               .map((item) => toItem(kind, item))
               .sort((a, b) => a.sortOrder - b.sortOrder),
         ]),
      ) as Record<ListKind, ListItem[]>,
   };
});

// Other sections read the rules as they are now, without waiting: undefined
// until Настройки have been read (Сделки and Работа read them first).
export const currentSettings = () => store.peek();

// ---- the lists, for the other sections

// A list in its order; only the rows in use unless `all`.
export const listOf = (kind: ListKind, all = false) =>
   (currentSettings()?.lists[kind] ?? []).filter((item) => all || item.active);

export const itemOf = (kind: ListKind, key: string) =>
   listOf(kind, true).find((item) => item.key === key);

const language = () => (i18n.resolvedLanguage ?? 'ru') as SupportedLanguageType;

// An item's name in the interface language, then in Russian.
export const nameOf = (item: ListItem) =>
   item.names[language()] || item.names.ru || item.key;

// ---- the stages of a deal, for Сделки

const defaultStages = () => stagesFrom([]);

// The stages in their order (the defaults until Настройки are read).
export const stagesOf = () => currentSettings()?.stages ?? defaultStages();

export const stageItem = (key: string) =>
   stagesOf().find((stage) => stage.key === key);

/* A stage's name in the interface language: the fund's name for it, else
   the platform's own name of a default stage, else its Russian name; the key
   for a stage that no longer exists. */
export const stageName = (key: string) => {
   const item = stageItem(key);
   const own = item?.names[language()];
   if (own) return own;
   const fallback = DEFAULT_STAGES.find((stage) => stage.key === key);
   if (fallback) return i18n.t(fallback.label, { ns: 'settings' });
   return item?.names.ru || key;
};

// The name of a key; the key itself (an old row's text) when no row has it.
export const listName = (kind: ListKind, key: string) => {
   const item = itemOf(kind, key);
   return item ? nameOf(item) : key;
};

// A row's guid from its key and back, for the relation fields.
export const listIdOf = (kind: ListKind, key: string) =>
   itemOf(kind, key)?.id ?? null;
export const listKeyOf = (kind: ListKind, id: unknown) =>
   listOf(kind, true).find((item) => item.id === id)?.key;

class Settings {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   async getSettings(): Promise<SettingsState> {
      return store.get();
   }

   // Saves the rules; every changed value goes to the journal.
   async save(
      next: Pick<SettingsState, 'mandate' | 'flags'>,
      userId: string,
      labels: Record<string, string>, // how the journal names each value
   ) {
      const state = await store.get();
      const changes: { field: string; from: string; to: string }[] = [];
      const compare = (key: string, from: unknown, to: unknown) => {
         if (String(from) !== String(to))
            changes.push({
               field: labels[key] ?? key,
               from: String(from),
               to: String(to),
            });
      };
      Object.entries(next.mandate).forEach(([key, value]) =>
         compare(
            `mandate.${key}`,
            state.mandate[key as keyof typeof state.mandate],
            value,
         ),
      );
      Object.entries(next.flags).forEach(([key, value]) =>
         compare(
            `flag.${key}`,
            state.flags[key as keyof typeof state.flags],
            value,
         ),
      );
      if (!changes.length) return;

      const check = parseCheck(next.mandate.check);
      const settings = {
         check_min: check?.[0] ?? null,
         check_max: check?.[1] ?? null,
         focus_text: next.mandate.focus,
         excluded_text: next.mandate.excluded,
         flag_runway_months: next.flags.runway,
         flag_churn_pct: next.flags.churn,
         flag_revenue_drop_pct: next.flags.revenue,
         flag_report_late_days: next.flags.reportLate,
      };
      const today = todayISO();
      await Promise.all([
         rowIds.settings
            ? updateRow('fund_settings', { guid: rowIds.settings, ...settings })
            : createRow('fund_settings', { guid: newId(), ...settings }),
         ...changes.map((change) =>
            createRow('settings_journal', {
               guid: newId(),
               date: today,
               employee_id: userId,
               field: change.field,
               from_value: change.from,
               to_value: change.to,
            }),
         ),
      ]);
      await store.reload();
   }

   /* Adds a list's row, or changes one: its names, marks, or whether it is
      in use. A key stays as it was made, since records keep it. Each change
      goes to the journal, under `field` (how the journal names the list and
      the row) with what the row was and is (`describe`). */
   async saveListItem(
      kind: ListKind,
      id: string | null,
      item: ListItemInput,
      userId: string,
      field: string,
      describe: (item: ListItemInput | null) => string,
   ) {
      const state = await store.get();
      const list = state.lists[kind];
      const before = id ? list.find((row) => row.id === id) : undefined;
      if (id && !before) throw new Error(`No ${kind} row ${id}`);
      if (list.some((row) => row.key === item.key && row.id !== id))
         throw new Error(`${kind}: the key ${item.key} is taken`);
      const { table } = LIST_TABLES[kind];
      const fields = itemFields(
         kind,
         before ? { ...item, key: before.key } : item,
      );
      await Promise.all([
         before
            ? updateRow(table, { guid: before.id, ...fields })
            : createRow(table, {
                 guid: newId(),
                 ...fields,
                 sort_order:
                    Math.max(0, ...list.map((row) => row.sortOrder)) + 1,
              }),
         createRow('settings_journal', {
            guid: newId(),
            date: todayISO(),
            employee_id: userId,
            field,
            from_value: describe(before ?? null),
            to_value: describe(item),
         }),
      ]);
      await store.reload();
   }

   // ---- the stages

   // Writes every stage's place afresh, in tens, in the given order.
   private async renumber(order: StageItem[]) {
      await Promise.all(
         order.map((stage, index) => {
            const sortOrder = (index + 1) * 10;
            if (stage.id)
               return stage.sortOrder === sortOrder
                  ? Promise.resolve()
                  : updateRow('stage_norms', {
                       guid: stage.id,
                       sort_order: sortOrder,
                    });
            // a system stage without a row gets one now
            return createRow('stage_norms', {
               guid: newId(),
               ...stageFields(stage),
               is_system: true,
               sort_order: sortOrder,
            });
         }),
      );
   }

   /* Adds the fund's own stage after `after` (a stage's key; first when it
      is null for a new one), or changes a stage: its names, norm, when its
      clock stands and who a late deal goes to. A stage's key stays as made,
      since deals keep it. */
   async saveStage(
      id: string | null,
      key: string,
      input: StageInput,
      after: string | null,
      userId: string,
      field: string,
      describe: (stage: StageInput | null) => string,
   ) {
      const stages = (await store.get()).stages;
      // a system stage may have no row yet (id ''): it is still changed
      const before =
         id === null ? undefined : stages.find((stage) => stage.key === key);
      if (id !== null && !before) throw new Error(`No stage ${key}`);
      if (!before && stages.some((stage) => stage.key === input.key))
         throw new Error(`The stage ${input.key} exists`);
      const journal = createRow('settings_journal', {
         guid: newId(),
         date: todayISO(),
         employee_id: userId,
         field,
         from_value: describe(before ?? null),
         to_value: describe(input),
      });
      if (before) {
         const fields = { ...stageFields({ ...input, key: before.key }) };
         await Promise.all([
            before.id
               ? updateRow('stage_norms', { guid: before.id, ...fields })
               : createRow('stage_norms', {
                    guid: newId(),
                    ...fields,
                    is_system: before.isSystem,
                    sort_order: before.sortOrder,
                 }),
            journal,
         ]);
      } else {
         const guid = newId();
         await createRow('stage_norms', {
            guid,
            ...stageFields(input),
            is_system: false,
            sort_order: 0,
         });
         // right after `after`
         const at = stages.findIndex((stage) => stage.key === after) + 1;
         const order = [...stages];
         order.splice(at, 0, {
            ...input,
            id: guid,
            sortOrder: 0,
            isSystem: false,
         });
         await Promise.all([this.renumber(order), journal]);
      }
      await store.reload();
   }

   // Moves a stage to `to`, its place in the list.
   async moveStage(key: string, to: number) {
      const stages = (await store.get()).stages;
      const from = stages.findIndex((stage) => stage.key === key);
      if (from === -1 || from === to || to < 0 || to > stages.length - 1)
         return;
      const order = [...stages];
      order.splice(to, 0, ...order.splice(from, 1));
      await this.renumber(order);
      await store.reload();
   }

   // The deals on a stage now.
   async stageUsage(key: string) {
      return (await listRows('deals', { stage: key })).length;
   }

   /* Deletes a stage; the deals on it move to `replacement` first. A system
      stage's row is turned off instead, so it can be brought back. */
   async deleteStage(
      key: string,
      replacement: string | null,
      userId: string,
      field: string,
      from: string,
   ) {
      const stages = (await store.get()).stages;
      const stage = stages.find((item) => item.key === key);
      if (!stage) throw new Error(`No stage ${key}`);
      const deals = await listRows('deals', { stage: key });
      const other = stages.find(
         (item) => item.key === replacement && item.key !== key,
      );
      if (deals.length && !other) throw new Error(`The stage ${key} has deals`);
      await Promise.all(
         deals.map((row) =>
            updateRow('deals', { guid: row.guid, stage: other!.key }),
         ),
      );
      if (stage.isSystem)
         await (stage.id
            ? updateRow('stage_norms', { guid: stage.id, is_active: false })
            : createRow('stage_norms', {
                 guid: newId(),
                 ...stageFields(stage),
                 is_system: true,
                 is_active: false,
                 sort_order: stage.sortOrder,
              }));
      else if (stage.id) await deleteRow('stage_norms', stage.id);
      await createRow('settings_journal', {
         guid: newId(),
         date: todayISO(),
         employee_id: userId,
         field,
         from_value: from,
         to_value: other ? `→ ${stageName(other.key)}` : '',
      });
      await store.reload();
   }

   // Brings back a system stage the fund deleted, where it stood.
   async restoreStage(key: string, userId: string, field: string) {
      const rows = await listRows('stage_norms', { stage: key });
      await Promise.all([
         ...rows.map((row) =>
            updateRow('stage_norms', { guid: row.guid, is_active: true }),
         ),
         createRow('settings_journal', {
            guid: newId(),
            date: todayISO(),
            employee_id: userId,
            field,
            from_value: '',
            to_value: stageName(key),
         }),
      ]);
      await store.reload();
   }

   // How many records use a row: deals, applications, tasks, figures.
   async usageOf(kind: ListKind, id: string) {
      const item = (await store.get()).lists[kind].find((row) => row.id === id);
      if (!item) return 0;
      const counts = await Promise.all(
         USES[kind].map(
            async ({ table, field, by }) =>
               (await listRows(table, { [field]: by === 'id' ? id : item.key }))
                  .length,
         ),
      );
      return counts.reduce((sum, count) => sum + count, 0);
   }

   /* Deletes a row. What uses it gets `replacement` (another row's key)
      first; a row in use without one is refused, and the platform's own rows
      are never deleted. A report document's template file goes with it. */
   async deleteListItem(
      kind: ListKind,
      id: string,
      replacement: string | null,
      userId: string,
      field: string,
      from: string,
   ) {
      const list = (await store.get()).lists[kind];
      const item = list.find((row) => row.id === id);
      if (!item) return;
      if (item.isSystem)
         throw new Error(`${kind}: ${item.key} is the platform's own`);
      const other = replacement
         ? list.find((row) => row.key === replacement && row.id !== id)
         : undefined;
      const used = (
         await Promise.all(
            USES[kind].map(async (use) => ({
               ...use,
               rows: await listRows(use.table, {
                  [use.field]: use.by === 'id' ? id : item.key,
               }),
            })),
         )
      ).filter(({ rows }) => rows.length);
      if (used.length && !other)
         throw new Error(`${kind}: ${item.key} is in use`);
      for (const { table, field: column, by, rows } of used)
         await Promise.all(
            rows.map((row) =>
               updateRow(table, {
                  guid: row.guid,
                  [column]: by === 'id' ? other!.id : other!.key,
               }),
            ),
         );
      await deleteRow(LIST_TABLES[kind].table, id);
      await releaseFile(item.file);
      await createRow('settings_journal', {
         guid: newId(),
         date: todayISO(),
         employee_id: userId,
         field,
         from_value: from,
         to_value: other ? `→ ${nameOf(other)}` : '',
      });
      await store.reload();
   }

   // Moves a row to `to`, its place in the list: the order the forms show.
   async moveListItem(kind: ListKind, id: string, to: number) {
      const list = (await store.get()).lists[kind];
      const from = list.findIndex((row) => row.id === id);
      if (from === -1 || from === to || to < 0 || to > list.length - 1) return;
      const { table } = LIST_TABLES[kind];
      // the rows' own numbers may repeat; the new order is numbered afresh
      const order = list.map((row) => row.id);
      order.splice(to, 0, ...order.splice(from, 1));
      await Promise.all(
         order.flatMap((guid, position) =>
            list.find((row) => row.id === guid)?.sortOrder === position + 1
               ? []
               : [updateRow(table, { guid, sort_order: position + 1 })],
         ),
      );
      await store.reload();
   }

   /* Adds an employee. They sign in once they have a ucode user: made with
      `node scripts/ucode/auth.mjs user <email> <role> "<name>"`, which finds
      this row by its email (docs/ucode-migration.md, «Staff sign-in»). */
   async invite(input: Omit<StaffInput, 'active'>) {
      await createRow('employees', {
         guid: newId(),
         ...staffFields({ ...input, active: true }),
         invited_at: todayISO(),
      });
      await Promise.all([store.reload(), reloadTeam()]);
   }

   /* Changes an employee: their details, role, duties, access level, or
      whether they have access at all. Closed, they leave the team's lists
      and sign in with the least rights; their name stays on their records.
      The change goes to the journal as `field`, from `from` to `to`. */
   async updateStaff(
      id: string,
      patch: Partial<StaffInput>,
      userId: string,
      change: { field: string; from: string; to: string },
   ) {
      await Promise.all([
         updateRow('employees', { guid: id, ...staffFields(patch) }),
         createRow('settings_journal', {
            guid: newId(),
            date: todayISO(),
            employee_id: userId,
            field: change.field,
            from_value: change.from,
            to_value: change.to,
         }),
      ]);
      await Promise.all([store.reload(), reloadTeam()]);
   }
}

export default new Settings();

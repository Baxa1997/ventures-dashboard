import {
   createRow,
   day,
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
// the instance @shared/i18n sets up; imported directly, so the services run
// without the browser setup (scripts/ucode/panel-test.ts runs them in Node)
import i18n from 'i18next';
import type {
   Access,
   IndustryMandate,
   ListItem,
   ListItemInput,
   ListKind,
   NormStage,
   SettingsState,
   StaffMember,
   StaffRole,
} from '@shared/types/settings.types';
import type { SupportedLanguageType } from '@shared/types/system/language.types';
import type { Role } from '@shared/types/work.types';

/* Настройки in ucode (docs/ucode-migration.md, batches 1 and 7): the mandate
   and the portfolio flags are the one row of fund_settings, the norms are
   stage_norms, the journal is settings_journal, the staff are employees, and
   each reference list is a table of its own. */

const NORM_ORDER: NormStage[] = [
   'inbox',
   'screening',
   'meeting',
   'analysis',
   'committee',
   'dd',
   'board',
   'closing',
];

// stage_norms.escalate_to, as the norms table names it
const ESCALATION: Record<string, string> = {
   deputy: 'Зам. директора',
   director: 'Директор',
   ic_chair: 'Председатель ИК',
};

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
};

export const LIST_KINDS = Object.keys(LIST_TABLES) as ListKind[];

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
   };
};

const toStaff = (row: Row): StaffMember => {
   const role = str(row.role) as Role;
   return {
      id: row.guid,
      name: str(row.full_name || row.short_name),
      position: str(row.position),
      email: str(row.email),
      role: ROLES.includes(role) ? role : 'other',
      roles: fromJson<StaffRole[]>(row.duties, []),
      access: (str(row.access) || 'work') as Access,
      invitedAt: row.user_id ? null : day(row.invited_at) || null,
   };
};

const byCreated = (a: Row, b: Row) =>
   str(b.date).localeCompare(str(a.date)) ||
   str(b.created_at).localeCompare(str(a.created_at));

// The rows behind the state, to write changes back to.
let rowIds = { settings: '', norms: new Map<NormStage, string>() };

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
   const norms = new Map(
      normRows.map((item) => [str(item.stage) as NormStage, item]),
   );
   rowIds = {
      settings: row.guid ?? '',
      norms: new Map([...norms].map(([stage, item]) => [stage, item.guid])),
   };
   return {
      mandate: {
         check: formatCheck(row.check_min, row.check_max),
         focus: str(row.focus_text),
         excluded: str(row.excluded_text),
      },
      norms: NORM_ORDER.flatMap((stage) => {
         const item = norms.get(stage);
         if (!item) return [];
         return [
            {
               stage,
               norm:
                  str(item.norm_text) ||
                  (item.norm_days ? String(item.norm_days) : ''),
               paused: str(item.paused_when),
               escalation: ESCALATION[str(item.escalate_to)] ?? '',
            },
         ];
      }),
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
      staff: employees.filter((item) => item.is_active !== false).map(toStaff),
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
      next: Pick<SettingsState, 'mandate' | 'norms' | 'flags'>,
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
      next.norms.forEach((norm, index) =>
         compare(`norm.${norm.stage}`, state.norms[index]?.norm, norm.norm),
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
         ...next.norms.flatMap((norm, index) => {
            const guid = rowIds.norms.get(norm.stage);
            return guid && norm.norm !== state.norms[index]?.norm
               ? [
                    updateRow('stage_norms', {
                       guid,
                       norm_text: norm.norm,
                       norm_days: parseNorm(norm.norm),
                    }),
                 ]
               : [];
         }),
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

   // Moves a row one place up or down the list: the order the forms show.
   async moveListItem(kind: ListKind, id: string, step: -1 | 1) {
      const list = (await store.get()).lists[kind];
      const index = list.findIndex((row) => row.id === id);
      const other = list[index + step];
      if (index === -1 || !other) return;
      const { table } = LIST_TABLES[kind];
      // the rows' own numbers may repeat; the new order is numbered afresh
      const order = list.map((row) => row.id);
      [order[index], order[index + step]] = [order[index + step], order[index]];
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
   async invite(input: {
      name: string;
      email: string;
      position: string;
      role: Role;
      roles: StaffRole[];
      access: Access;
   }) {
      await createRow('employees', {
         guid: newId(),
         full_name: input.name,
         short_name: shortName(input.name),
         email: input.email,
         position: input.position,
         role: input.role,
         duties: toJson(input.roles),
         access: input.access,
         is_active: true,
         invited_at: todayISO(),
      });
      await Promise.all([store.reload(), reloadTeam()]);
   }
}

export default new Settings();

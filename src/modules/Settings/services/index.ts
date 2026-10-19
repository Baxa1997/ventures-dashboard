import { ROUND_STAGE_NAMES } from '@modules/Deals/constants';
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
import type {
   Access,
   Industry,
   IndustryMandate,
   NormStage,
   SettingsState,
   StaffMember,
   StaffRole,
} from '@shared/types/settings.types';
import type { Role } from '@shared/types/work.types';

/* Настройки in ucode (docs/ucode-migration.md, batch 1): the mandate and the
   portfolio flags are the one row of fund_settings, the norms are stage_norms,
   the journal is settings_journal and the staff are employees. */

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

// fund_settings.round_stages holds the values (["pre_seed","seed"]); the form
// shows their names.
const formatStages = (value: unknown) =>
   fromJson<string[]>(value, [])
      .map(
         (stage) =>
            ROUND_STAGE_NAMES[stage as keyof typeof ROUND_STAGE_NAMES] ?? stage,
      )
      .join(', ');

const parseStages = (text: string) =>
   text
      .split(/[,;]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map(
         (part) =>
            Object.entries(ROUND_STAGE_NAMES).find(
               ([, name]) => name.toLowerCase() === part.toLowerCase(),
            )?.[0] ?? part,
      );

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

const toIndustry = (row: Row): Industry => ({
   id: row.guid,
   name: str(row.name_ru || row.slug),
   mandate: (str(row.mandate) || 'allowed') as IndustryMandate,
});

const byCreated = (a: Row, b: Row) =>
   str(b.date).localeCompare(str(a.date)) ||
   str(b.created_at).localeCompare(str(a.created_at));

// The rows behind the state, to write changes back to.
let rowIds = { settings: '', norms: new Map<NormStage, string>() };

const store = createStore<SettingsState>(async () => {
   const [settingsRows, normRows, journal, employees, industries] =
      await Promise.all(
         [
            'fund_settings',
            'stage_norms',
            'settings_journal',
            'employees',
            'industries',
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
         stages: formatStages(row.round_stages),
         focus: str(row.focus_text),
         geography: str(row.geography_text),
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
      industries: [...industries]
         .sort((a, b) => num(a.sort_order) - num(b.sort_order))
         .map(toIndustry),
   };
});

// Other sections read the rules as they are now, without waiting: undefined
// until Настройки have been read (Сделки read them before their deals).
export const currentSettings = () => store.peek();

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
         round_stages: toJson(parseStages(next.mandate.stages)),
         focus_text: next.mandate.focus,
         geography_text: next.mandate.geography,
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

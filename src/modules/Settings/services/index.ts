import { createStore, newId, todayISO } from '@shared/helpers';
import type {
   Access,
   SettingsState,
   StaffRole,
} from '@shared/types/settings.types';
import { SAMPLE_SETTINGS } from './sample';

const store = createStore<SettingsState>(
   'sqbv_dashboard_settings_v1',
   () => SAMPLE_SETTINGS,
);

// Other sections read the rules as they are now, without waiting.
export const currentSettings = () => store.read();

// "$50 000 – $300 000" → [50000, 300000]; null when the text has no range.
export const parseCheck = (text: string): [number, number] | null => {
   const values = [
      ...text.replace(/\s/g, '').matchAll(/\$?(\d+(?:[.,]\d+)?)([KkMmКкМм]?)/g),
   ].map(
      ([, value, unit]) =>
         Number(value.replace(',', '.')) *
         (/[KkКк]/.test(unit) ? 1_000 : /[MmМм]/.test(unit) ? 1_000_000 : 1),
   );
   return values.length >= 2 && values[0] < values[1]
      ? [values[0], values[1]]
      : null;
};

// "5 · публично" → 5; null for a stage that has no number of days.
export const parseNorm = (text: string) => {
   const value = parseInt(text, 10);
   return Number.isFinite(value) && value > 0 ? value : null;
};

class Settings {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   async getSettings(): Promise<SettingsState> {
      return store.read();
   }

   // Saves the rules; every changed value goes to the journal.
   async save(
      next: Pick<SettingsState, 'mandate' | 'norms' | 'flags'>,
      userId: string,
      labels: Record<string, string>, // how the journal names each value
   ) {
      store.update((state) => {
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
         return {
            ...state,
            ...next,
            journal: [
               ...changes.map((change) => ({
                  id: newId(),
                  date: todayISO(),
                  userId,
                  ...change,
               })),
               ...state.journal,
            ],
         };
      });
   }

   // The site now shows the fund's mandate.
   async syncSite() {
      store.update((state) => ({ ...state, site: null }));
   }

   async invite(input: {
      name: string;
      email: string;
      position: string;
      roles: StaffRole[];
      access: Access;
   }) {
      store.update((state) => ({
         ...state,
         staff: [
            ...state.staff,
            { id: newId(), invitedAt: todayISO(), ...input },
         ],
      }));
   }
}

export default new Settings();

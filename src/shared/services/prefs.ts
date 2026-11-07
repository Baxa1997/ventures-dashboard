import { fromJson, type Row, toJson, updateOwnRow } from '@shared/api/ucode';

/* A person's own preferences: what they ticked in Мой день, the order of the
   cards in a board's columns, the notifications they have seen. They are
   kept with the person's employees row (prefs, batch 25), so they follow
   them to another browser or device; this browser keeps a copy, which is
   all there is until the field exists or the row is known. */
let owner = '';
let stored = false;
let prefs: Record<string, unknown> = {};
let timer: ReturnType<typeof setTimeout> | undefined;

const local = <T>(key: string, fallback: T): T => {
   try {
      const text = localStorage.getItem(key);
      return text === null ? fallback : (JSON.parse(text) as T);
   } catch {
      return fallback;
   }
};

// The signed-in person's employees row, as read with the team; none after
// signing out.
export const loadPrefs = (row?: Row) => {
   clearTimeout(timer);
   owner = row?.guid ?? '';
   stored = !!row && 'prefs' in row;
   prefs = fromJson<Record<string, unknown>>(row?.prefs, {});
};

export const readPref = <T>(key: string, fallback: T): T =>
   stored && key in prefs ? (prefs[key] as T) : local(key, fallback);

export const writePref = (key: string, value: unknown) => {
   prefs = { ...prefs, [key]: value };
   try {
      localStorage.setItem(key, JSON.stringify(value));
   } catch {
      // storage unavailable: ucode keeps it, or it lasts until a reload
   }
   if (!stored || !owner) return;
   // a few quick changes go in one write
   clearTimeout(timer);
   const guid = owner;
   timer = setTimeout(() => {
      updateOwnRow('employees', { guid, prefs: toJson(prefs) }).catch(
         (error: unknown) => console.error(error),
      );
   }, 800);
};

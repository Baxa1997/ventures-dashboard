import { useSyncExternalStore } from 'react';

/* Whether somebody is signed in. There is no authentication yet: the sign-in
   page accepts any email and password and only remembers that it was passed.
   "Keep me signed in" keeps the mark in localStorage; without it the mark
   lives in sessionStorage and goes away with the tab. */

const STORAGE_KEY = 'sqbv_dashboard_session';

export interface Session {
   email: string;
}

const listeners = new Set<() => void>();

const readStored = (): Session | null => {
   try {
      const stored =
         localStorage.getItem(STORAGE_KEY) ??
         sessionStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as Session;
   } catch {
      // storage unavailable or unreadable: nobody is signed in
   }
   return null;
};

let session = readStored();

const subscribe = (listener: () => void) => {
   listeners.add(listener);
   return () => {
      listeners.delete(listener);
   };
};

const change = (next: Session | null, store: () => void) => {
   session = next;
   try {
      store();
   } catch {
      // storage unavailable: the change lasts until the page is reloaded
   }
   listeners.forEach((listener) => listener());
};

export const signIn = (email: string, remember: boolean) =>
   change({ email }, () =>
      (remember ? localStorage : sessionStorage).setItem(
         STORAGE_KEY,
         JSON.stringify({ email }),
      ),
   );

export const signOut = () =>
   change(null, () => {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
   });

const useSession = () => useSyncExternalStore(subscribe, () => session);

export default useSession;

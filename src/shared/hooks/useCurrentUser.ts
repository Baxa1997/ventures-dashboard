import { DEFAULT_USER_ID, SIGN_IN_IDS, TEAM } from '@shared/constants';
import type { Employee } from '@shared/types/work.types';
import { useSyncExternalStore } from 'react';

/* Who is "signed in". There is no authentication yet, so the choice is kept in
   this browser's localStorage and changed from the sidebar. */

const STORAGE_KEY = 'sqbv_dashboard_user';

const listeners = new Set<() => void>();

const readStored = () => {
   try {
      const id = localStorage.getItem(STORAGE_KEY);
      if (id && SIGN_IN_IDS.includes(id)) return id;
   } catch {
      // storage unavailable: use the default user
   }
   return DEFAULT_USER_ID;
};

let currentId = readStored();

const subscribe = (listener: () => void) => {
   listeners.add(listener);
   return () => {
      listeners.delete(listener);
   };
};

export const setCurrentUser = (id: string) => {
   if (id === currentId || !SIGN_IN_IDS.includes(id)) return;
   currentId = id;
   try {
      localStorage.setItem(STORAGE_KEY, id);
   } catch {
      // storage unavailable: the choice lasts until the page is reloaded
   }
   listeners.forEach((listener) => listener());
};

const getUser = (id: string): Employee =>
   TEAM.find((employee) => employee.id === id) ?? TEAM[0];

const useCurrentUser = () =>
   getUser(useSyncExternalStore(subscribe, () => currentId));

export default useCurrentUser;

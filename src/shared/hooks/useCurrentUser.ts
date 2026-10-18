import { listRows, str } from '@shared/api/ucode';
import { TEAM } from '@shared/constants';
import { clearStores } from '@shared/helpers/store';
import type { Employee, Role } from '@shared/types/work.types';
import { useSyncExternalStore } from 'react';

/* Who is signed in, and the fund's team.

   After signing in, the employees rows of ucode are read into TEAM, so every
   name and role on the pages is the real one. The signed-in person is the row
   whose user_id is their ucode user; a user without a row is shown by their
   login, with the least access, until the director adds them in Настройки. */

export type TeamStatus = 'idle' | 'loading' | 'ready' | 'failed';

const listeners = new Set<() => void>();
let status: TeamStatus = 'idle';
let currentId = '';
let signedIn = { userId: '', login: '' };
let version = 0; // grows when TEAM or the person changes, so the pages read them again

const notify = () => {
   version += 1;
   listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
   listeners.add(listener);
   return () => {
      listeners.delete(listener);
   };
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

const toEmployee = (row: Record<string, unknown> & { guid: string }) => {
   const role = str(row.role) as Role;
   return {
      id: row.guid,
      name: str(row.short_name || row.full_name || row.email),
      role: ROLES.includes(role) ? role : 'other',
   } satisfies Employee;
};

// Reads the employees rows again, e.g. after somebody was invited.
export const reloadTeam = async () => {
   if (!signedIn.userId) return;
   const rows = await listRows('employees');
   TEAM.splice(
      0,
      TEAM.length,
      ...rows.filter((row) => row.is_active !== false).map(toEmployee),
   );
   currentId =
      rows.find((row) => str(row.user_id) === signedIn.userId)?.guid ?? '';
   notify();
};

// The person who signed in ('' after signing out) and the login they used.
export const setSignedInUser = async (userId: string, login = '') => {
   signedIn = { userId, login };
   clearStores();
   currentId = '';
   TEAM.splice(0, TEAM.length);
   status = userId ? 'loading' : 'idle';
   notify();
   if (!userId) return;
   try {
      await reloadTeam();
      status = 'ready';
   } catch (error) {
      status = 'failed';
      throw error;
   } finally {
      notify();
   }
};

export const useTeamStatus = () =>
   useSyncExternalStore(subscribe, () => status);

const getUser = (): Employee =>
   TEAM.find((employee) => employee.id === currentId) ?? {
      id: signedIn.userId,
      name: signedIn.login,
      role: 'other',
   };

const useCurrentUser = () => {
   useSyncExternalStore(subscribe, () => version);
   return getUser();
};

export default useCurrentUser;

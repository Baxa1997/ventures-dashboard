import { listRows, ucodeSignIn } from '@shared/api/ucode';
import { DEFAULT_USER_ID, SIGN_IN_IDS, TEAM } from '@shared/constants';
import type { Employee, Role } from '@shared/types/work.types';
import { useSyncExternalStore } from 'react';

/* Who is signed in.

   With staff sign-in (@shared/api/ucode) it is the employees row of the ucode
   user who signed in: after signing in, the employees rows take the place of the
   sample's people in TEAM, so every name and role on the pages is the real one.

   Without it there is no authentication: the choice among the sample's people
   is kept in this browser's localStorage and changed from the sidebar. */

const STORAGE_KEY = 'sqbv_dashboard_user';

const listeners = new Set<() => void>();
let version = 0; // grows when TEAM is replaced, so the pages read it again

const notify = () => {
   version += 1;
   listeners.forEach((listener) => listener());
};

const readStored = () => {
   if (ucodeSignIn) return '';
   try {
      const id = localStorage.getItem(STORAGE_KEY);
      if (id && SIGN_IN_IDS.includes(id)) return id;
   } catch {
      // storage unavailable: use the default user
   }
   return DEFAULT_USER_ID;
};

let currentId = readStored();
let signedInUser = ''; // the ucode user, with staff sign-in

const subscribe = (listener: () => void) => {
   listeners.add(listener);
   return () => {
      listeners.delete(listener);
   };
};

export const setCurrentUser = (id: string) => {
   if (ucodeSignIn || id === currentId || !SIGN_IN_IDS.includes(id)) return;
   currentId = id;
   try {
      localStorage.setItem(STORAGE_KEY, id);
   } catch {
      // storage unavailable: the choice lasts until the page is reloaded
   }
   notify();
};

// With staff sign-in: the person who signed in ('' after signing out), whose
// employees row is then looked up with the rest of the team.
export const setSignedInUser = async (userId: string) => {
   signedInUser = userId;
   currentId = '';
   notify();
   if (!userId) return;
   const rows = await listRows('employees');
   TEAM.splice(
      0,
      TEAM.length,
      ...rows
         .filter((row) => row.is_active !== false)
         .map(
            (row): Employee => ({
               id: row.guid,
               name: String(row.short_name || row.full_name || row.email || ''),
               role: (String(row.role || '') || 'other') as Role,
            }),
         ),
   );
   currentId = rows.find((row) => row.user_id === userId)?.guid ?? '';
   notify();
};

// Until the employees rows are read, or for a user without one, the signed-in
// person is shown without a name and with the least access.
const getUser = (id: string): Employee =>
   TEAM.find((employee) => employee.id === id) ??
   (ucodeSignIn ? { id: signedInUser, name: '', role: 'other' } : TEAM[0]);

const useCurrentUser = () => {
   useSyncExternalStore(subscribe, () => version);
   return getUser(currentId);
};

export default useCurrentUser;

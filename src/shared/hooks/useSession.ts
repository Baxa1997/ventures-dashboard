import { login, setUcodeTokens, type UcodeTokens } from '@shared/api/ucode';
import { useSyncExternalStore } from 'react';
import { setSignedInUser } from './useCurrentUser';

/* Whether somebody is signed in. ucode checks the login and password, and the
   session keeps the person's tokens. "Keep me signed in" keeps the session in
   localStorage; without it the session lives in sessionStorage and goes away
   with the tab. */

const STORAGE_KEY = 'sqbv_dashboard_session_v2';

export interface Session {
   login: string; // what the person signed in with: a login or a work email
   ucode: UcodeTokens;
}

const listeners = new Set<() => void>();

const readStored = (): { session: Session | null; remember: boolean } => {
   try {
      const local = localStorage.getItem(STORAGE_KEY);
      const stored = local ?? sessionStorage.getItem(STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as Partial<Session>) : null;
      if (parsed?.login && parsed.ucode?.accessToken)
         return { session: parsed as Session, remember: !!local };
   } catch {
      // storage unavailable or unreadable: nobody is signed in
   }
   return { session: null, remember: false };
};

let { session, remember } = readStored();

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

const keep = (next: Session) =>
   change(next, () =>
      (remember ? localStorage : sessionStorage).setItem(
         STORAGE_KEY,
         JSON.stringify(next),
      ),
   );

export const signOut = () => {
   setUcodeTokens(null);
   void setSignedInUser('');
   change(null, () => {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
   });
};

// The ucode client keeps refreshed tokens here and ends the session when it
// runs out; then the team is read, with the signed-in person among it.
const connect = (next: Session) => {
   setUcodeTokens(next.ucode, {
      refreshed: (tokens) => session && keep({ ...session, ucode: tokens }),
      expired: signOut,
   });
   setSignedInUser(next.ucode.userId, next.login).catch((error: unknown) =>
      console.error('The employees rows could not be read', error),
   );
};

if (session) connect(session);

// Reads the team again after it failed to load.
export const retryTeam = () => session && connect(session);

// Throws a UcodeError when ucode refuses the login and password.
export const signIn = async (
   loginName: string,
   password: string,
   keepSignedIn: boolean,
) => {
   const tokens = await login(loginName, password);
   remember = keepSignedIn;
   const next = { login: loginName, ucode: tokens };
   keep(next);
   connect(next);
};

const useSession = () => useSyncExternalStore(subscribe, () => session);

export default useSession;

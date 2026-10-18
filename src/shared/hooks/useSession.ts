import {
   login,
   setUcodeTokens,
   ucodeSignIn,
   type UcodeTokens,
} from '@shared/api/ucode';
import { useSyncExternalStore } from 'react';
import { setSignedInUser } from './useCurrentUser';

/* Whether somebody is signed in. With staff sign-in (@shared/api/ucode) ucode
   checks the work email and password, and the session keeps the person's tokens;
   without it the sign-in page accepts any email and password and only remembers
   that it was passed. "Keep me signed in" keeps the session in localStorage;
   without it the session lives in sessionStorage and goes away with the tab. */

const STORAGE_KEY = 'sqbv_dashboard_session';

export interface Session {
   email: string;
   ucode?: UcodeTokens; // with staff sign-in
}

const listeners = new Set<() => void>();

const readStored = (): { session: Session | null; remember: boolean } => {
   try {
      const local = localStorage.getItem(STORAGE_KEY);
      const stored = local ?? sessionStorage.getItem(STORAGE_KEY);
      if (stored) return { session: JSON.parse(stored) as Session, remember: !!local };
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
// runs out; the signed-in person's employees row is read for useCurrentUser.
const connect = (tokens: UcodeTokens | undefined) => {
   setUcodeTokens(tokens ?? null, {
      refreshed: (next) => session && keep({ ...session, ucode: next }),
      expired: signOut,
   });
   if (tokens)
      setSignedInUser(tokens.userId).catch((error: unknown) =>
         console.error('The employees rows could not be read', error),
      );
};

connect(session?.ucode);

// Throws a UcodeError when ucode refuses the email and password.
export const signIn = async (
   email: string,
   password: string,
   keepSignedIn: boolean,
) => {
   const tokens = ucodeSignIn ? await login(email, password) : undefined;
   remember = keepSignedIn;
   connect(tokens);
   keep(tokens ? { email, ucode: tokens } : { email });
};

const useSession = () => useSyncExternalStore(subscribe, () => session);

export default useSession;

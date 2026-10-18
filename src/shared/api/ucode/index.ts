/* ucode, the fund's backend (docs/ERP.md §2 and §9, docs/ucode-migration.md).

   Two ways in:
   - Staff sign-in, the real one: with VITE_UCODE_PROJECT_ID,
     VITE_UCODE_ENVIRONMENT_ID and VITE_UCODE_CLIENT_TYPE_ID set (public ids, not
     secrets), a person signs in with their work email and password, and every
     call carries their token; ucode applies their role's permissions.
   - The dev server's key, for work before anyone has a user: with UCODE_API_KEY,
     `yarn dev` forwards /ucode to the ucode admin API and adds the key
     (vite.config.ts); the browser holds no key.
   With neither, the panel runs on its sample data. */

const ADMIN_URL = 'https://api.admin.u-code.io';
const AUTH_URL = 'https://api.auth.u-code.io';
const PROXY = '/ucode';
const PAGE = 200;

const PROJECT = import.meta.env.VITE_UCODE_PROJECT_ID ?? '';
const ENVIRONMENT = import.meta.env.VITE_UCODE_ENVIRONMENT_ID ?? '';
const CLIENT_TYPE = import.meta.env.VITE_UCODE_CLIENT_TYPE_ID ?? '';

// Staff sign in to ucode with their own users.
export const ucodeSignIn = Boolean(PROJECT && ENVIRONMENT && CLIENT_TYPE);

// The panel's data comes from ucode.
export const ucodeEnabled: boolean = ucodeSignIn || __UCODE__;

export class UcodeError extends Error {
   constructor(
      message: string,
      readonly status: number,
   ) {
      super(message);
      this.name = 'UcodeError';
   }
}

// A row of a ucode table: its guid and the fields by their slugs.
export type Row = { guid: string } & Record<string, unknown>;

// ---- the signed-in person's token

export interface UcodeTokens {
   accessToken: string;
   refreshToken: string;
   userId: string; // the ucode user; employees.user_id points to it
}

let tokens: UcodeTokens | null = null;
let onRefreshed: (next: UcodeTokens) => void = () => {};
let onExpired: () => void = () => {};

// Set by the session (@shared/hooks/useSession): the tokens, what to keep when
// they are refreshed, and what to do when they can no longer be.
export const setUcodeTokens = (
   next: UcodeTokens | null,
   handlers?: { refreshed: (next: UcodeTokens) => void; expired: () => void },
) => {
   tokens = next;
   if (handlers) {
      onRefreshed = handlers.refreshed;
      onExpired = handlers.expired;
   }
};

const parse = async (response: Response) => {
   const text = await response.text();
   try {
      return text ? (JSON.parse(text) as { data?: unknown; description?: string }) : undefined;
   } catch {
      return { description: text.slice(0, 200) };
   }
};

interface LoginReply {
   token?: { access_token?: string; refresh_token?: string };
   user_id_auth?: string;
   user_id?: string;
   user?: { id?: string };
}

const tokensOf = (reply: LoginReply | undefined, refreshToken = ''): UcodeTokens | null =>
   reply?.token?.access_token
      ? {
           accessToken: reply.token.access_token,
           refreshToken: reply.token.refresh_token || refreshToken,
           userId: reply.user_id_auth || reply.user?.id || reply.user_id || tokens?.userId || '',
        }
      : null;

// Signs a staff member in with their work email and password.
export const login = async (email: string, password: string) => {
   const response = await fetch(`${AUTH_URL}/v2/login?project-id=${PROJECT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Environment-Id': ENVIRONMENT },
      body: JSON.stringify({
         username: email,
         password,
         client_type: CLIENT_TYPE,
         project_id: PROJECT,
         type: 'default',
      }),
   });
   const json = await parse(response);
   const next = response.ok ? tokensOf(json?.data as LoginReply) : null;
   if (!next)
      throw new UcodeError(
         typeof json?.data === 'string' ? json.data : (json?.description ?? 'Sign-in failed'),
         response.status,
      );
   return next;
};

// A new access token for the refresh token, or null when the session is over.
const refresh = async () => {
   if (!tokens?.refreshToken) return null;
   const response = await fetch(`${AUTH_URL}/v2/refresh?project-id=${PROJECT}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Environment-Id': ENVIRONMENT },
      body: JSON.stringify({
         refresh_token: tokens.refreshToken,
         client_type_id: CLIENT_TYPE,
         env_id: ENVIRONMENT,
         project_id: PROJECT,
      }),
   });
   return response.ok ? tokensOf((await parse(response))?.data as LoginReply, tokens.refreshToken) : null;
};

// ---- calls

const send = (path: string, method: string, body: unknown) =>
   fetch(ucodeSignIn ? `${ADMIN_URL}${path}` : `${PROXY}${path}`, {
      method,
      headers: {
         'Content-Type': 'application/json',
         ...(ucodeSignIn && {
            Authorization: `Bearer ${tokens?.accessToken ?? ''}`,
            'Environment-Id': ENVIRONMENT,
         }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
   });

const call = async <T>(method: string, path: string, body?: unknown) => {
   if (ucodeSignIn && !tokens) throw new UcodeError('Not signed in', 401);
   let response = await send(path, method, body);
   if (ucodeSignIn && response.status === 401) {
      // the access token ran out: refresh it once, or end the session
      const next = await refresh();
      if (!next) {
         onExpired();
         throw new UcodeError('The session has ended', 401);
      }
      tokens = next;
      onRefreshed(next);
      response = await send(path, method, body);
   }
   const json = await parse(response);
   if (!response.ok)
      throw new UcodeError(
         `ucode ${method} ${path}: ${response.status} ${json?.description ?? ''}`,
         response.status,
      );
   return json as T;
};

interface ListReply {
   data?: { data?: { count?: number; response?: Row[] } };
}

// Every row of a table that matches the filter (field slug → value).
export const listRows = async (table: string, filter: Record<string, unknown> = {}) => {
   const rows: Row[] = [];
   for (let offset = 0; ; offset += PAGE) {
      const query = encodeURIComponent(JSON.stringify({ ...filter, limit: PAGE, offset }));
      const reply = await call<ListReply>('GET', `/v2/items/${table}?data=${query}`);
      const page = reply.data?.data?.response ?? [];
      rows.push(...page);
      if (page.length < PAGE || rows.length >= (reply.data?.data?.count ?? 0)) return rows;
   }
};

// Creates a row; a guid in `data` is kept, so the panel's own ids stay the rows' ids.
export const createRow = async (table: string, data: Record<string, unknown>) =>
   (
      await call<{ data?: { data?: Row } }>('POST', `/v2/items/${table}`, {
         data,
         disable_faas: true,
      })
   ).data?.data;

// Changes the given fields of a row; the others keep their values.
export const updateRow = (table: string, data: Row) =>
   call('PUT', `/v2/items/${table}`, { data, disable_faas: true });

// JSON fields are text columns in ucode: written as JSON text, read back parsed.
export const toJson = (value: unknown) => (value === undefined ? undefined : JSON.stringify(value));

export const fromJson = <T>(value: unknown, fallback: T): T => {
   if (value === null || value === undefined || value === '') return fallback;
   if (typeof value !== 'string') return value as T;
   try {
      return JSON.parse(value) as T;
   } catch {
      return fallback;
   }
};

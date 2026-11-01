/* ucode, the fund's backend (docs/ERP.md §2 and §9, docs/ucode-migration.md).

   A person signs in with their ucode user (login or work email, and password)
   and every call carries their token, so ucode applies their role's
   permissions. Where to sign in is given by VITE_UCODE_PROJECT_ID,
   VITE_UCODE_ENVIRONMENT_ID and VITE_UCODE_CLIENT_TYPE_IDS: public ids, not
   secrets. The client types are tried in their order (STAFF, then ADMIN), since
   a user belongs to one of them and the sign-in has to name it. */

const ADMIN_URL = 'https://api.admin.u-code.io';
const AUTH_URL = 'https://api.auth.u-code.io';
const PAGE = 200;

const PROJECT = import.meta.env.VITE_UCODE_PROJECT_ID ?? '';
const ENVIRONMENT = import.meta.env.VITE_UCODE_ENVIRONMENT_ID ?? '';
const CLIENT_TYPES = (import.meta.env.VITE_UCODE_CLIENT_TYPE_IDS ?? '')
   .split(',')
   .map((id) => id.trim())
   .filter(Boolean);

// Whether the build knows where to sign in.
export const ucodeConfigured = Boolean(
   PROJECT && ENVIRONMENT && CLIENT_TYPES.length,
);

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
   clientType: string; // the client type the user signed in with
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
      return text
         ? (JSON.parse(text) as { data?: unknown; description?: string })
         : undefined;
   } catch {
      return { description: text.slice(0, 200) };
   }
};

// The reply also carries the user's row, password hash included: only the
// tokens and the user's id are kept.
interface LoginReply {
   token?: { access_token?: string; refresh_token?: string };
   user_id_auth?: string;
   user_id?: string;
}

const tokensOf = (
   reply: LoginReply | undefined,
   clientType: string,
   previous?: UcodeTokens,
): UcodeTokens | null =>
   reply?.token?.access_token
      ? {
           accessToken: reply.token.access_token,
           refreshToken:
              reply.token.refresh_token || previous?.refreshToken || '',
           userId:
              reply.user_id_auth || reply.user_id || previous?.userId || '',
           clientType,
        }
      : null;

const signInWith = async (
   clientType: string,
   username: string,
   password: string,
) => {
   const response = await fetch(`${AUTH_URL}/v2/login?project-id=${PROJECT}`, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
         'Environment-Id': ENVIRONMENT,
      },
      body: JSON.stringify({
         username,
         password,
         client_type: clientType,
         project_id: PROJECT,
         type: 'default',
      }),
   });
   const json = await parse(response);
   const next = response.ok
      ? tokensOf(json?.data as LoginReply, clientType)
      : null;
   if (next) return next;
   throw new UcodeError(
      typeof json?.data === 'string'
         ? json.data
         : (json?.description ?? 'Sign-in failed'),
      response.status,
   );
};

/* Signs a person in with their login or work email and password. ucode answers
   400 both for a user it does not know in a client type and for a wrong
   password, so each client type is asked in turn; the last refusal is thrown. */
export const login = async (username: string, password: string) => {
   if (!ucodeConfigured)
      throw new UcodeError('The panel is not connected to ucode', 0);
   let refusal: unknown;
   for (const clientType of CLIENT_TYPES)
      try {
         return await signInWith(clientType, username, password);
      } catch (error) {
         if (!(error instanceof UcodeError) || error.status >= 500) throw error;
         refusal = error;
      }
   throw refusal;
};

// A new access token for the refresh token, or null when the session is over.
const refresh = async () => {
   if (!tokens?.refreshToken) return null;
   const current = tokens;
   const response = await fetch(
      `${AUTH_URL}/v2/refresh?project-id=${PROJECT}`,
      {
         method: 'PUT',
         headers: {
            'Content-Type': 'application/json',
            'Environment-Id': ENVIRONMENT,
         },
         body: JSON.stringify({
            refresh_token: current.refreshToken,
            client_type_id: current.clientType,
            env_id: ENVIRONMENT,
            project_id: PROJECT,
         }),
      },
   );
   return response.ok
      ? tokensOf(
           (await parse(response))?.data as LoginReply,
           current.clientType,
           current,
        )
      : null;
};

// ---- calls

// A form (a file) goes as it is, with the browser's own content type.
const send = (path: string, method: string, body: unknown, base: string) =>
   fetch(`${base}${path}`, {
      method,
      headers: {
         ...(!(body instanceof FormData) && {
            'Content-Type': 'application/json',
         }),
         Authorization: `Bearer ${tokens?.accessToken ?? ''}`,
         'Environment-Id': ENVIRONMENT,
      },
      ...(body !== undefined && {
         body: body instanceof FormData ? body : JSON.stringify(body),
      }),
   });

const call = async <T>(
   method: string,
   path: string,
   body?: unknown,
   base = ADMIN_URL,
) => {
   if (!tokens) throw new UcodeError('Not signed in', 401);
   let response = await send(path, method, body, base);
   if (response.status === 401) {
      // the access token ran out: refresh it once, or end the session
      const next = await refresh();
      if (!next) {
         onExpired();
         throw new UcodeError('The session has ended', 401);
      }
      tokens = next;
      onRefreshed(next);
      response = await send(path, method, body, base);
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

/* Every row of a table that matches the filter (field slug → value). ucode
   matches a text field by a part of its value («it» finds «audit» too), so the
   rows it answers are compared exactly here. */
export const listRows = async (
   table: string,
   filter: Record<string, unknown> = {},
) => {
   const rows: Row[] = [];
   for (let offset = 0; ; offset += PAGE) {
      const query = encodeURIComponent(
         JSON.stringify({ ...filter, limit: PAGE, offset }),
      );
      const reply = await call<ListReply>(
         'GET',
         `/v2/items/${table}?data=${query}`,
      );
      const page = reply.data?.data?.response ?? [];
      rows.push(...page);
      if (page.length < PAGE || rows.length >= (reply.data?.data?.count ?? 0))
         return rows.filter((row) =>
            Object.entries(filter).every(
               ([field, value]) => String(row[field]) === String(value),
            ),
         );
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

export const deleteRow = (table: string, guid: string) =>
   call('DELETE', `/v2/items/${table}/${guid}`, { data: {} });

// ---- staff users, in ucode's auth service

// The client type the fund's staff sign in under (docs/ucode-migration.md,
// «Staff sign-in»); its roles carry the names of employees.role.
const STAFF_CLIENT_TYPE = 'STAFF';

interface AuthRow {
   guid: string;
   name: string;
   client_type_id?: string;
}

const authCall = <T>(
   method: string,
   path: string,
   body?: unknown,
   query = '',
) =>
   call<{ data?: T }>(
      method,
      `${path}?project-id=${PROJECT}${query}`,
      body,
      AUTH_URL,
   );

const authRows = async (path: string) => {
   const reply = await authCall<{
      data?: { response?: AuthRow[] };
      response?: AuthRow[];
   }>('GET', path);
   return reply.data?.data?.response ?? reply.data?.response ?? [];
};

// STAFF, and its role of that name.
const staffRole = async (name: string) => {
   const [types, roles] = await Promise.all([
      authRows('/v2/client-type'),
      authRows('/v2/role'),
   ]);
   const staff = types.find((type) => type.name === STAFF_CLIENT_TYPE);
   const role = roles.find(
      (item) => item.client_type_id === staff?.guid && item.name === name,
   );
   if (!staff || !role) throw new UcodeError(`ucode has no STAFF role ${name}`, 0);
   return { staff, role };
};

const staffType = async () => {
   const staff = (await authRows('/v2/client-type')).find(
      ({ name }) => name === STAFF_CLIENT_TYPE,
   );
   if (!staff) throw new UcodeError('ucode has no STAFF', 0);
   return staff;
};

/* Makes the ucode user a person signs in with, under the STAFF role of that
   name, the signed-in director's token doing it. Answers the user's id, which
   employees.user_id points to. ucode writes the row of its login table,
   staff_users, as well. Each one counts against the plan's users. */
export const createStaffUser = async (user: {
   login: string;
   password: string;
   name: string;
   phone: string;
   role: string;
}) => {
   const { staff, role } = await staffRole(user.role);
   const reply = await authCall<{ id?: string; guid?: string }>(
      'POST',
      '/v2/user',
      {
         login: user.login,
         email: user.login,
         password: user.password,
         name: user.name,
         phone: user.phone,
         project_id: PROJECT,
         client_type_id: staff.guid,
         role_id: role.guid,
         active: 1,
      },
   );
   const id = reply.data?.id ?? reply.data?.guid;
   if (!id) throw new UcodeError('ucode answered no user id', 0);
   return id;
};

/* Changes a user's name, phone or role as the ucode admin does: their record is
   read, changed and written back whole, since what is left out would be emptied. */
export const updateStaffUser = async (
   id: string,
   patch: { name?: string; phone?: string; role?: string },
) => {
   const staff = await staffType();
   const reply = await authCall<Record<string, unknown>>(
      'GET',
      `/v2/user/${id}`,
      undefined,
      `&client-type-id=${staff.guid}`,
   );
   const { password: _password, ...user } = reply.data ?? {};
   const role = patch.role ? (await staffRole(patch.role)).role : null;
   await authCall('PUT', '/v2/user', {
      ...user,
      id,
      project_id: PROJECT,
      client_type_id: staff.guid,
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.phone !== undefined && { phone: patch.phone }),
      ...(role && { role_id: role.guid }),
   });
};

// Takes the user away, with the row of the login table; ucode wants the client type.
export const deleteStaffUser = async (id: string) => {
   const staff = await staffType();
   await authCall(
      'DELETE',
      `/v2/user/${id}`,
      {},
      `&client-type-id=${staff.guid}`,
   );
};

// JSON fields are text columns in ucode: written as JSON text, read back parsed.
export const toJson = (value: unknown) =>
   value === undefined ? undefined : JSON.stringify(value);

export const fromJson = <T>(value: unknown, fallback: T): T => {
   if (value === null || value === undefined || value === '') return fallback;
   if (typeof value !== 'string') return value as T;
   try {
      return JSON.parse(value) as T;
   } catch {
      return fallback;
   }
};

// ---- reading rows

export const str = (value: unknown) =>
   value === null || value === undefined ? '' : String(value);

export const num = (value: unknown) =>
   value === null || value === undefined || value === '' ? 0 : Number(value);

// A number, or null for an empty field.
export const numOrNull = (value: unknown) =>
   value === null || value === undefined || value === '' ? null : Number(value);

// A DATE field comes back as 2026-10-18T00:00:00Z: its day.
export const day = (value: unknown) => str(value).slice(0, 10);

// Rows that point to a parent, grouped by the parent's guid.
export const groupBy = (rows: Row[], field: string) => {
   const groups = new Map<string, Row[]>();
   for (const row of rows) {
      const key = str(row[field]);
      if (!key) continue;
      groups.set(key, [...(groups.get(key) ?? []), row]);
   }
   return groups;
};

// ---- files

// Where ucode Files serves what it stores: the reply's link is a path under it.
const FILES_URL = 'https://cdn.u-code.io';

// A stored file's address; a path, as ucode answers and as the website kept
// pitch decks before 24 October, gets the Files server in front.
export const fileUrl = (link: string) =>
   !link || /^https?:/.test(link)
      ? link
      : `${FILES_URL}/${link.replace(/^\/+/, '')}`;

export interface StoredFile {
   id: string; // ucode Files' id, to delete it by
   url: string; // the address it opens at: anyone with it can open the file
   name: string;
}

/* Stores a file in ucode Files, in a folder of the project's storage. What is
   stored there opens for anyone who has its address (docs/ERP.md §7): fine
   for the fund's working files, as decided on 22 October; private storage
   comes later. */
export const uploadFile = async (file: File, folder: string) => {
   const form = new FormData();
   form.append('file', file, file.name);
   const reply = await call<{
      data?: { id?: string; link?: string; file_name_download?: string };
   }>(
      'POST',
      `/v1/files/folder_upload?folder_name=${encodeURIComponent(folder)}&project-id=${PROJECT}`,
      form,
   );
   const link = reply.data?.link;
   if (!link) throw new UcodeError('ucode stored no file', 0);
   return {
      id: reply.data?.id ?? '',
      url: fileUrl(link),
      name: reply.data?.file_name_download ?? file.name,
   } satisfies StoredFile;
};

// Removes a stored file by its id; a file already gone is not an error.
export const deleteFile = async (id: string) => {
   if (!id) return;
   try {
      await call('DELETE', '/v1/files', { objects: [{ object_id: id }] });
   } catch (error) {
      if (!(error instanceof UcodeError) || error.status !== 404) throw error;
   }
};

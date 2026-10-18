/* ucode, the fund's backend (docs/ERP.md §9, docs/ucode-migration.md).

   While the dev server runs with UCODE_API_KEY it forwards /ucode to the ucode
   admin API and adds the key (vite.config.ts); the browser holds no key. Signing
   staff in to ucode replaces that later: the same calls then carry the person's
   token. Without the key the panel runs on its sample data, as before. */

export const ucodeEnabled: boolean = __UCODE__;

const BASE = '/ucode';
const PAGE = 200;

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

const call = async <T>(method: string, path: string, body?: unknown) => {
   const response = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }),
   });
   const text = await response.text();
   let json: { description?: string } | undefined;
   try {
      json = text ? JSON.parse(text) : undefined;
   } catch {
      json = undefined;
   }
   if (!response.ok)
      throw new UcodeError(
         `ucode ${method} ${path}: ${response.status} ${json?.description ?? text.slice(0, 200)}`,
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

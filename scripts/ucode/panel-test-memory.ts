/* panel-test --dry-run: the panel's services run against ucode's real tables
   and fields with nothing written there. A table's rows are read once with the
   project's API key; from then on the run reads and writes a copy in memory.
   As ucode does, the copy drops a field its table lacks and answers every field
   a row has, empty ones as null. Only GET ever goes out: `memoryFetch` refuses
   anything else that it does not answer itself. It cannot show what only ucode
   does: a user's permissions, or a pick list refusing a value. */

type Row = Record<string, unknown>;

const SYSTEM = ['guid', 'created_at', 'updated_at', 'deleted_at', 'folder_id'];

const json = (body: unknown, status = 200) =>
   new Response(JSON.stringify(body), { status });

// A batch not made in ucode yet, as if it were: its tables' fields and rows.
export type Pending = Record<string, { fields: string[]; rows: Row[] }>;

export const memoryFetch = (send: typeof fetch, apiKey: string, environment: string, admin: string, pending: Pending = {}) => {
   const tables = new Map<string, { fields: string[]; rows: Row[] } | null>();
   const headers = { Authorization: 'API-KEY', 'X-API-KEY': apiKey, 'Environment-Id': environment };
   const dropped = new Map<string, Set<string>>();

   const read = async (table: string) => {
      if (tables.has(table)) return tables.get(table) ?? null;
      const reply = await send(`${admin}/v2/fields/${table}`, { headers });
      const fields = reply.ok ? (((await reply.json()) as { data?: { fields?: { slug: string }[] } }).data?.fields ?? []).map(({ slug }) => slug) : [];
      if (!fields.length && pending[table]) {
         const now = new Date().toISOString();
         const made = {
            fields: pending[table].fields,
            rows: pending[table].rows.map((row) => ({ ...Object.fromEntries(pending[table].fields.map((field) => [field, null])), ...row, guid: crypto.randomUUID(), created_at: now, updated_at: now })),
         };
         tables.set(table, made);
         return made;
      }
      if (!fields.length) {
         tables.set(table, null); // no such table: reading it fails, as in ucode
         return null;
      }
      const rows: Row[] = [];
      for (let offset = 0; ; offset += 500) {
         const query = encodeURIComponent(JSON.stringify({ limit: 500, offset }));
         const page = await send(`${admin}/v2/items/${table}?data=${query}`, { headers });
         if (!page.ok) throw new Error(`dry run: cannot read ${table} (HTTP ${page.status})`);
         const list = ((await page.json()) as { data?: { data?: { response?: Row[] } } }).data?.data?.response ?? [];
         rows.push(...list);
         if (list.length < 500) break;
      }
      const copy = { fields: [...new Set([...SYSTEM, ...fields])], rows };
      tables.set(table, copy);
      return copy;
   };

   // the row with only the fields its table has
   const kept = (table: string, fields: string[], data: Row) => {
      const row: Row = {};
      for (const [field, value] of Object.entries(data)) {
         if (fields.includes(field)) row[field] = value;
         else if (value !== undefined) {
            const set = dropped.get(table) ?? new Set<string>();
            dropped.set(table, set.add(field));
         }
      }
      return row;
   };

   const fetchInMemory = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const list = url.pathname.match(/^\/v2\/items\/(\w+)$/);
      const one = url.pathname.match(/^\/v2\/items\/(\w+)\/([^/]+)$/);
      if (url.hostname.startsWith('cdn.')) return new Response('file', { status: 200 });
      if (url.pathname === '/v1/files/folder_upload' && method === 'POST') {
         const id = crypto.randomUUID();
         const file = (init?.body as FormData).get('file') as File;
         return json({ data: { id, link: `dry-run/${id}/${file.name}`, file_name_download: file.name } }, 201);
      }
      if (url.pathname === '/v1/files' && method === 'DELETE') return json({ data: {} });
      if (list) {
         const table = await read(list[1]);
         if (!table) return json({ description: `relation "${list[1]}" does not exist (SQLSTATE 42P01)` }, 500);
         if (method === 'GET') {
            const { limit = 500, offset = 0, ...filter } = JSON.parse(url.searchParams.get('data') ?? '{}') as Row & { limit?: number; offset?: number };
            const found = table.rows.filter((row) => Object.entries(filter).every(([field, value]) => String(row[field] ?? '') === String(value ?? '')));
            return json({ data: { data: { count: found.length, response: found.slice(offset, offset + limit) } } });
         }
         const data = (JSON.parse(String(init?.body)) as { data?: Row }).data ?? {};
         const now = new Date().toISOString();
         if (method === 'POST') {
            const row: Row = { ...Object.fromEntries(table.fields.map((field) => [field, null])), ...kept(list[1], table.fields, data), created_at: now, updated_at: now };
            row.guid = data.guid || crypto.randomUUID();
            table.rows.unshift(row);
            return json({ data: { data: row } }, 201);
         }
         if (method === 'PUT') {
            const row = table.rows.find(({ guid }) => guid === data.guid);
            if (!row) return json({ description: `no row ${String(data.guid)}` }, 404);
            Object.assign(row, kept(list[1], table.fields, data), { updated_at: now });
            return json({ data: { data: row } });
         }
      }
      if (one && method === 'DELETE') {
         const table = await read(one[1]);
         if (!table) return json({}, 500);
         const at = table.rows.findIndex(({ guid }) => guid === one[2]);
         if (at < 0) return json({ description: `no row ${one[2]}` }, 404);
         table.rows.splice(at, 1);
         return json({ data: {} });
      }
      if (method !== 'GET') throw new Error(`dry run: refused ${method} ${url.pathname}`);
      return send(input, { ...init, headers });
   }) as typeof fetch;

   return { fetchInMemory, dropped };
};

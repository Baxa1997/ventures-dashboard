#!/usr/bin/env node
/* Staff sign-in in ucode (docs/ERP.md §2, §4.1, §6): the client type STAFF, a
   role for each value of employees.role, and staff users, each a ucode user
   whose profile is an employees row (employees.user_id = the user's id).
   Through ucode's auth service (api.mjs), with the project's API key.

     node scripts/ucode/auth.mjs list
        the client types, their roles and users, and the employees rows
     node scripts/ucode/auth.mjs setup
        makes STAFF and its roles where they are missing; changes nothing else
     node scripts/ucode/auth.mjs user <email> <role> "<Full name>"
        makes a staff user with a new password, printed once, and its
        employees row. A user may take a paid seat of the ucode plan.

   STAFF has no table of its own: its users live in ucode's system user table,
   like those of ADMIN, and the panel finds the person's employees row by
   user_id. Sign-in: POST https://api.auth.u-code.io/v2/login with STAFF's id. */

import { randomBytes } from 'node:crypto';
import { ucode, ucodeAuth } from './api.mjs';
import { readTables } from './schema.mjs';

const CLIENT_TYPE = 'STAFF';
const LOGIN_TABLE = 'staff_users'; // STAFF's sign-in rows: login, email, password, role, user
const ROLES = readTables().get('employees').fields.find(({ slug }) => slug === 'role').options;

// The project's id, which most of the auth service's routes want in the query:
// from UCODE_PROJECT_ID, or from the project's client types, which carry it.
let project;
const projectId = async () => {
   if (project) return project;
   project = process.env.UCODE_PROJECT_ID;
   if (!project) {
      const response = await ucodeAuth('GET', '/v2/client-type');
      project = response.data?.data?.data?.response?.find((type) => type.project_id)?.project_id;
   }
   if (!project) throw new Error('Cannot tell the project id: set UCODE_PROJECT_ID');
   return project;
};
const auth = async (method, path, body) =>
   ucodeAuth(method, `${path}${path.includes('?') ? '&' : '?'}project-id=${await projectId()}`, body);

const reply = (response, what) => {
   if (!response.ok) throw new Error(`${what}: HTTP ${response.status} ${JSON.stringify(response.data).slice(0, 300)}`);
   return response.data?.data;
};
const rowsOf = (data) => data?.data?.response ?? data?.response ?? data?.users ?? [];

const clientTypes = async () => rowsOf(reply(await auth('GET', '/v2/client-type'), 'client types'));
const roles = async () => rowsOf(reply(await auth('GET', '/v2/role'), 'roles'));
const users = async () => rowsOf(reply(await auth('GET', '/v2/user?limit=200&offset=0'), 'users'));

const staffType = async () => (await clientTypes()).find((type) => type.name === CLIENT_TYPE);

const list = async () => {
   const [types, allRoles, allUsers] = await Promise.all([clientTypes(), roles(), users()]);
   for (const type of types) {
      console.log(`${type.name} ${type.guid} (table: ${type.table_slug ?? 'ucode users'})`);
      for (const role of allRoles.filter((item) => item.client_type_id === type.guid))
         console.log(`   role ${role.name} ${role.guid}`);
      for (const user of allUsers.filter((item) => item.client_type_id === type.guid))
         console.log(`   user ${user.login ?? user.email} ${user.id}`);
   }
   const employees = reply(
      await ucode('GET', `/v2/items/employees?data=${encodeURIComponent(JSON.stringify({ limit: 200, offset: 0 }))}`),
      'employees',
   );
   console.log(`employees: ${(employees?.data?.response ?? []).map((row) => `${row.full_name} (${row.role}, user ${row.user_id || '—'})`).join('; ') || 'none'}`);
};

const setup = async () => {
   // A client type without a table makes ucode create one and fail ("error
   // getting project info"), so STAFF points to a login table made first.
   const fields = await ucode('GET', `/v2/fields/${LOGIN_TABLE}`);
   const slugs = (fields.data?.data?.fields ?? []).map(({ slug }) => slug);
   if (!fields.ok || !slugs.includes('user_id_auth'))
      throw new Error(
         `No login table ${LOGIN_TABLE}. Make it with the MCP's create_table: slug ${LOGIN_TABLE}, label "Staff Users", menu_id = the Admin folder, is_login_table true, attributes {label: "", label_en: "Staff Users", auth_info: {login_strategy: ["email", "login"]}}`,
      );
   console.log(`· login table ${LOGIN_TABLE} exists`);

   const types = await clientTypes();
   const admin = types.find((type) => type.name === 'ADMIN');
   const platforms = admin?.client_platform_ids ?? [];
   let staff = types.find((type) => type.name === CLIENT_TYPE);
   if (staff) console.log(`· ${CLIENT_TYPE} exists: ${staff.guid}`);
   else {
      reply(
         await auth('POST', '/v2/client-type', {
            name: CLIENT_TYPE,
            project_id: admin?.project_id,
            client_platform_ids: platforms,
            table_slug: LOGIN_TABLE,
            default_page: '',
            columns: [],
            self_register: false,
            self_recover: true,
            session_limit: 10,
         }),
         `create ${CLIENT_TYPE}`,
      );
      staff = await staffType();
      if (!staff) throw new Error(`${CLIENT_TYPE} was not created`);
      console.log(`✓ ${CLIENT_TYPE} created: ${staff.guid}`);
   }
   const existing = (await roles()).filter((role) => role.client_type_id === staff.guid);
   for (const name of ROLES) {
      if (existing.some((role) => role.name === name)) {
         console.log(`· role ${name} exists`);
         continue;
      }
      reply(
         await auth('POST', '/v2/role', {
            name,
            client_type_id: staff.guid,
            client_platform_id: platforms[0],
            project_id: await projectId(),
            grant_access: true,
            status: true,
         }),
         `create role ${name}`,
      );
      console.log(`✓ role ${name} created`);
   }
};

const user = async (email, role, fullName) => {
   if (!email || !ROLES.includes(role) || !fullName)
      throw new Error(`Usage: auth.mjs user <email> <${ROLES.join('|')}> "<Full name>"`);
   const staff = await staffType();
   if (!staff) throw new Error(`No ${CLIENT_TYPE}: run setup first`);
   const roleRow = (await roles()).find((item) => item.client_type_id === staff.guid && item.name === role);
   if (!roleRow) throw new Error(`No role ${role}: run setup first`);
   const password = randomBytes(9).toString('base64url');
   const created = reply(
      await auth('POST', '/v2/user', {
         login: email.toLowerCase(),
         email: email.toLowerCase(),
         password,
         name: fullName,
         project_id: await projectId(),
         client_type_id: staff.guid,
         role_id: roleRow.guid,
         active: 1,
      }),
      'create user',
   );
   const userId = created?.id ?? created?.guid;
   if (!userId) throw new Error(`ucode returned no user id: ${JSON.stringify(created).slice(0, 200)}`);
   const [first, ...rest] = fullName.split(' ');
   reply(
      await ucode('POST', '/v2/items/employees', {
         data: {
            user_id: userId,
            full_name: fullName,
            short_name: rest.length ? `${first[0]}. ${rest.join(' ')}` : fullName,
            email: email.toLowerCase(),
            role,
            is_active: true,
            invited_at: new Date().toISOString().slice(0, 10),
         },
         disable_faas: true,
      }),
      'create employees row',
   );
   console.log(`✓ ${fullName} <${email}> as ${role}: user ${userId}`);
   console.log(`  password (shown once, not stored): ${password}`);
};

const [command, ...args] = process.argv.slice(2);
try {
   if (command === 'list') await list();
   else if (command === 'setup') await setup();
   else if (command === 'user') await user(...args);
   else {
      console.error('Usage: node scripts/ucode/auth.mjs list | setup | user <email> <role> "<Full name>"');
      process.exitCode = 2;
   }
} catch (error) {
   console.error(`✗ ${error.message}`);
   process.exitCode = 1;
}

#!/usr/bin/env node
/* The startup cabinet and the panel on one set of data, with nothing written to
   ucode: the cabinet's real server (../startup-cabinet/server) and the panel's real
   services read ucode's rows and fields with the API key and keep every write in
   memory (panel-test-memory.ts). cabinet-cycle.ts says what it checks.

     node scripts/ucode/cabinet-cycle.mjs */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { apiKey } from './api.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CABINET = resolve(ROOT, '../startup-cabinet');
const env = {};
for (const file of ['.env', '.env.local'].map((name) => join(ROOT, name)).filter(existsSync))
   for (const [, key, value] of readFileSync(file, 'utf8').matchAll(/^(VITE_UCODE_\w+)=(.*)$/gm)) env[key] = value.trim();

const out = mkdtempSync(join(tmpdir(), 'sqbv-cycle-'));
const stub = join(out, 'nodemailer.mjs');
writeFileSync(stub, 'export const createTransport = () => { throw new Error("no mail in a test"); };\n');
await build({
   entryPoints: [join(CABINET, 'server/app.ts')],
   bundle: true,
   platform: 'node',
   format: 'esm',
   outfile: join(out, 'cabinet.mjs'),
   logLevel: 'warning',
   alias: { '@shared': join(CABINET, 'src/shared'), nodemailer: stub },
});
await build({
   entryPoints: [join(ROOT, 'scripts/ucode/cabinet-cycle.ts')],
   bundle: true,
   platform: 'node',
   format: 'esm',
   outfile: join(out, 'cycle.mjs'),
   jsx: 'automatic',
   logLevel: 'warning',
   alias: { '@shared': join(ROOT, 'src/shared'), '@modules': join(ROOT, 'src/modules'), '@assets': join(ROOT, 'src/assets') },
   loader: { '.png': 'empty', '.woff2': 'empty' },
   define: Object.fromEntries(Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
});
const { status } = spawnSync(process.execPath, [join(out, 'cycle.mjs')], {
   stdio: 'inherit',
   env: {
      ...process.env,
      NODE_ENV: 'test',
      PANEL_TEST_API_KEY: apiKey(),
      CABINET_BUNDLE: join(out, 'cabinet.mjs'),
      // the cabinet's own settings: the same key, no mail, the code on the page
      UCODE_API_KEY: apiKey(),
      UCODE_PROJECT_ID: env.VITE_UCODE_PROJECT_ID,
      UCODE_ENVIRONMENT_ID: env.VITE_UCODE_ENVIRONMENT_ID,
      UCODE_BASE_URL: 'https://api.admin.u-code.io',
      ACCOUNT_SESSION_SECRET: 'a test secret, for this run only, long enough',
      ACCOUNT_DEV_CODES: 'true',
      SMTP_HOST: '',
   },
});
process.exit(status ?? 1);

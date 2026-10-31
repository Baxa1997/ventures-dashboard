#!/usr/bin/env node
/* Runs the panel's services against the ucode project of .env.local, signed
   in as a real user (panel-test.ts says what it checks). The services are
   bundled with the panel's own aliases and the VITE_UCODE_* ids, then run in
   Node. It writes test rows (named "ZZ …") and deletes them again.

     UCODE_LOGIN=<login> UCODE_PASSWORD=<password> node scripts/ucode/panel-test.mjs --write-test-rows

   Without a login it runs with the project's API key (api.mjs) as the director:
   the same services and tables, but not the sign-in or a user's permissions.

     node scripts/ucode/panel-test.mjs --write-test-rows

   --dry-run writes nothing to ucode: the services read its real rows and fields
   with the API key and keep every write in memory (panel-test-memory.ts).

     node scripts/ucode/panel-test.mjs --dry-run

   The password and the key are never printed. Run it against the test project
   only. */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { apiKey } from './api.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const dryRun = process.argv.includes('--dry-run');
if (!dryRun && !process.argv.includes('--write-test-rows')) {
   console.error('This writes test rows and deletes them again. Run with --write-test-rows, or --dry-run to write nothing.');
   process.exit(2);
}
const signedIn = !dryRun && process.env.UCODE_LOGIN && process.env.UCODE_PASSWORD;

// the VITE_UCODE_* ids, from the environment or .env.local / .env
const env = {};
for (const file of ['.env', '.env.local'].map((name) => join(ROOT, name)).filter(existsSync))
   for (const [, key, value] of readFileSync(file, 'utf8').matchAll(/^(VITE_UCODE_\w+)=(.*)$/gm)) env[key] = value.trim();
for (const key of Object.keys(env)) env[key] = process.env[key] ?? env[key];
const missing = ['VITE_UCODE_PROJECT_ID', 'VITE_UCODE_ENVIRONMENT_ID', 'VITE_UCODE_CLIENT_TYPE_IDS'].filter((key) => !env[key]);
if (missing.length) {
   console.error(`Missing ${missing.join(', ')} (see .env.example)`);
   process.exit(2);
}

const outfile = join(tmpdir(), `sqbv-panel-test-${process.pid}.mjs`);
await build({
   entryPoints: [join(ROOT, 'scripts/ucode/panel-test.ts')],
   bundle: true,
   platform: 'node',
   format: 'esm',
   outfile,
   jsx: 'automatic',
   logLevel: 'warning',
   alias: {
      '@shared': join(ROOT, 'src/shared'),
      '@modules': join(ROOT, 'src/modules'),
      '@assets': join(ROOT, 'src/assets'),
   },
   loader: { '.png': 'empty', '.woff2': 'empty' },
   define: Object.fromEntries(Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
});
const { status } = spawnSync(process.execPath, [outfile], {
   stdio: 'inherit',
   env: {
      ...process.env,
      ...(!signedIn && { PANEL_TEST_API_KEY: apiKey() }),
      ...(dryRun && { PANEL_TEST_DRY: '1' }),
   },
});
process.exit(status ?? 1);

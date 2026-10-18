/* The ucode admin API, called the way the ucode admin itself calls it, with the
   project's API key. Shared by the scripts in this folder.

   The key is read from UCODE_API_KEY, or else from the ucode MCP server that
   Claude Code keeps in ~/.claude.json for this folder (UCODE_MCP_SERVER names
   it; "ucode" by default, "ucode-prod" for production). It is never printed. */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://api.admin.u-code.io';
const PROJECT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const readKey = () => {
   if (process.env.UCODE_API_KEY) return process.env.UCODE_API_KEY;
   const server = process.env.UCODE_MCP_SERVER || 'ucode';
   const file = `${homedir()}/.claude.json`;
   const config = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
   const key =
      config.projects?.[PROJECT_DIR]?.mcpServers?.[server]?.headers?.['X-API-KEY'];
   if (!key)
      throw new Error(
         `No ucode API key: set UCODE_API_KEY, or connect the "${server}" MCP server in this folder.`,
      );
   return key;
};

let key;

// Returns { status, ok, data } where data is the parsed reply (ucode wraps the
// payload in { status, description, data }).
export const ucode = async (method, path, body) => {
   key ??= readKey();
   const response = await fetch(`${BASE}${path}`, {
      method,
      headers: {
         Authorization: 'API-KEY',
         'X-API-KEY': key,
         'Content-Type': 'application/json',
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
   });
   const text = await response.text();
   let data;
   try {
      data = JSON.parse(text);
   } catch {
      data = { raw: text.slice(0, 500) };
   }
   return { status: response.status, ok: response.ok, data };
};

#!/usr/bin/env node
/* Moves a table's sidebar entry to another folder through the ucode admin API
   (api.mjs), with the request the ucode admin's «move to folder» sends
   (PUT /v3/menus). The gateway replaces the entry with what is sent, so the
   entry's label and English label go with it. The ids come from the MCP's
   get_menus: the entry's id, its table_id, and the folder's id.

     node scripts/ucode/menus.mjs move <entry_id> <table_id> "<Label>" <folder_id> */

import { ucode } from './api.mjs';

const [command, id, tableId, label, folderId] = process.argv.slice(2);
if (command !== 'move' || !id || !tableId || !label || !folderId) {
   console.error(
      'Usage: node scripts/ucode/menus.mjs move <entry_id> <table_id> "<Label>" <folder_id>',
   );
   process.exit(2);
}

const { ok, status, data } = await ucode('PUT', '/v3/menus', {
   id,
   parent_id: folderId,
   type: 'TABLE',
   label,
   table_id: tableId,
   attributes: { label: '', label_en: label },
});
const entry = data?.data;
const moved = ok && entry?.parent_id === folderId && entry?.table_id === tableId;
console.log(
   `${moved ? '✓' : '✗'} ${label}: HTTP ${status} ${JSON.stringify(
      entry && typeof entry === 'object'
         ? { id: entry.id, parent_id: entry.parent_id, table_id: entry.table_id }
         : data,
   )}`,
);
process.exitCode = moved ? 0 : 1;

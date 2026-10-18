# ucode migration — messages for the ucode agent

The tables of [ERP.md](ERP.md) §4, cut into messages for the ucode AI agent. Where the two differ, this file is what exists in ucode.

The agent can only add tables, fields, relations and rows. It cannot rename, retype or delete anything, and the pick lists it creates get no options at all (see «The ucode agent, from its code»). A wrong name stays for good, so:

- Send one message at a time, in order: each batch's relations point to tables made by the batches before it.
- After each batch, bring back the agent's list of what it created, with the slugs, to be checked before the next one.

The project's sidebar has one folder per audience:

- **Landing page** — the website's tables (`applications`, `partner_requests`, `portfolio`; in production also `news`, `team`, `pages`). Batch 5 only adds fields to two of them.
- **Admin** — every table batches 1–5 create: the fund's ERP.
- **Startup cabinet** — empty for now, for the founders' cabinet later.

Functions, roles and permissions, file folders and users are not here: the agent cannot make them.

## Status

As of 18 October 2026, in the test environment (project SQB Ventures; confirmed as the test one on 18 October, for testing only):

| Batch | Current environment | Production |
| --- | --- | --- |
| T — website tables | created, checked with `get_dbml` | not started |
| 1 — people, reference lists, settings | created, checked with `get_dbml`; rows 11 + 6 + 8 + 1 | not started |
| 2 — Сделки | created, checked with `get_dbml`; relations named `<target>_id` | not started |
| 3 — Инвесткомитет | created, checked with `get_dbml` | not started |
| 4 — Портфель | created by Claude Code, checked with `get_dbml` | not started |
| 5 — Работа, money, downloads | created by Claude Code, checked with `get_dbml` | not started |

- 18 October: the schema read through the MCP (`get_dbml`) and compared with `node scripts/ucode/schema.mjs check`: all 27 tables, every field with its column type and all 25 relations match batches T–3, with no extra fields.
- 18 October, batches 4 and 5: tables made with the MCP's `create_table` in Admin, fields with `POST /v2/fields/{table}` (see «The ucode MCP»), relations with `update_table`. After them, `check` on `get_dbml`'s output: 39 tables and all 41 relations, every table of batches 4 and 5 ✓ except three fields of `portfolio_companies`, fixed the same day (below).
- 18 October, fixes: `portfolio_companies.about`, `instrument` and `since`, made SINGLE_LINE by `update_table` before its type mapping was known, changed to MULTI_LINE, PICK_LIST and NUMBER with `PUT /v2/fields/{table}`. The 9 fields `update_table` had made (those three, `portfolio_companies.facts` and the 5 of `reporting_cycles`) were hidden and labelled from their slugs; they now have the same settings and labels as the rest. `check` afterwards: every table ✓ except `agenda_items` (below).
- 18 October, folders: **Landing page** and **Startup cabinet** created next to Admin with the MCP's `create_menu`; `applications`, `partner_requests` and `portfolio` moved from Admin to Landing page with `PUT /v3/menus` (see «The ucode MCP»). `get_menus` then shows 3 tables in Landing page, the 36 ERP tables in Admin, and Startup cabinet empty.
- `agenda_items.status` (type STATUS), made by hand in the ucode admin to capture the field request, was deleted by hand the same day.
- 18 October, pick-list options set with `node scripts/ucode/fields.mjs options all --write`, then `options 1 --write --with-rows` for the three on tables with rows (`industries.mandate`, `stage_norms.stage`, `stage_norms.escalate_to`): all 50 pick lists have their options (value = the batch's value, label readable). The rows kept their values.
- 18 October, `node scripts/ucode/verify.mjs --rows`: all 39 tables, 398 fields with their exact ucode type (batches T–3 included), visible, all 50 pick lists with their options, all 41 relations to the right tables, no extra fields, rows 11 + 6 + 8 + 1 and every other table empty. **No problems.**
- 18 October, the application flow end to end, on this environment: the website's Pitch Us form (repo `sqb-ventures-website`, branch `application-intake`) opened deal SQBV-2026-0001 in the inbox with its deck, facts and journal and set the application to `submitted`; the panel's Deals service on ucode (`src/modules/Deals/services/ucode.ts`) took it into screening, scored a criterion, asked for a document and declined it, which set the application to `rejected` with `resubmit_after` six months on, and the website then refused a new application from that email until that date and accepted it once the date had passed. A deal entered in the panel took the next number (SQBV-2026-0002) and moved to the meeting stage with its history. Every test row and the test deck were deleted afterwards.
- 18 October, `node scripts/ucode/smoke.mjs --write-test-rows`: the EasyTap deal of the panel's sample, one linked row in each of the 35 tables without reference rows (the deal points to the existing fintech industry and no_demand reason). All 362 fields read back with the value and type written, all 41 relations stored, returned with `with_relations` and found by filtering on the parent's id; every test row deleted and every row count back to the above. What it showed is in «Reading and writing rows».
- 18 October, staff sign-in started: login table `staff_users`, client type STAFF and nine roles made; no users yet. See «Staff sign-in».
- The ucode environment of this project is named "Production" in ucode (its only environment, `9f012d7a-0eb0-4a3a-87c7-16661eafce08`), though it is used for testing; the website's live deployment does not use it (its tables did not exist here until batch T).
- Folder ids: Admin `60e0336b-5017-49ca-8c96-123aa5e2c9db` (the only folder named Admin), Landing page `39d78d3e-d0dc-49ef-9e99-5491b0968a41`, Startup cabinet `21a20661-d27b-43a4-98ed-37604fe83833`. All three sit under ucode's main menu, `c57eedc3-a954-4262-a0af-376c65b5a284`.
- The tables of batches 2 and 3 were created outside the Admin folder and moved into it by hand; all of them, `votes` and `decisions` included, now have an entry in Admin.
- The pick lists were made without options (the agent's field tool cannot set them; batches 4–5 left them out on purpose) and got them in the separate step above. The agent's read-backs confirmed field names only, not types (see «The ucode agent, from its code»); `verify.mjs` has since read every field's type from ucode.
- Checked against the Figma screens (file "SQB VC Website", page "ERP · Операционная платформа — V2", screens 00–16 and 24–25) on 17 October. Every field the screens show has a place, except four, now added to batch 5: `deals.facts` and `deals.facts_note` (the «Из заявки» block of screens 04 and 07), `deals.terms` (the terms rows of screen 06), `employees.access` (screen 25), `fund_money.direct_allocation` (screen 01). Screens 17–23 are the Фонд modules of phase 3.

## The ucode MCP

ucode's AI agent is Claude connected to ucode's MCP server. Claude Code can connect to the same server and do the batches itself.

- Address: `https://mcp.u-code.io/mcp` (server `ucode` 0.1.1). It needs the project's App ID in the `X-API-KEY` header (without one it answers 401 "missing or invalid X-API-KEY"). The key decides the project and the environment, so production needs its own key. Connected in Claude Code on 18 October (local scope, this folder only).
- Its ten tools, from `tools/list`:

  | Tool | Use |
  | --- | --- |
  | `get_dbml` | the whole schema: tables, fields with column types, relations |
  | `get_menus` (parent_id) | the folders under a folder; the main menu is `c57eedc3-a954-4262-a0af-376c65b5a284` |
  | `get_table_details` (collection) | one table's fields with their settings, e.g. a pick list's options |
  | `get_table_items` | read rows, with filters, sorting, paging and related rows |
  | `create_menu` | a folder under `parent_id` |
  | `create_table` | a table; `menu_id` places it in a folder |
  | `create_field` | meant to make a field by `table_id`, slug and ucode type. **Fails on every call** with "An error occurred while creating the field" (6 tries, 18 October), so it is not used |
  | `update_table` | fields and relations in bulk, each with `action` create, update or **delete**. Used here for relations only, see below |
  | `dbml_to_ucode` | creates tables from a DBML text, with folders given in `menus` |
  | `create_table_item` | a row |

- `update_table` can delete fields and relations. It is never used with `action: delete` here: a deleted field takes its data with it.
- `update_table` reads `type` as a database type (`UpdateTableByMCP` in the gateway's `api/handlers/v1/table.go`): `varchar` → SINGLE_LINE, `text` → MULTI_LINE, `date`, `timestamp` → DATE_TIME, `boolean` → CHECKBOX, `json`, any number type → FLOAT, `enum` → MULTISELECT, and anything else → SINGLE_LINE. It cannot make NUMBER or PICK_LIST, ignores the labels given, and answers "Table updated successfully" even when a field or relation failed, so every call needs a read-back. Never use it to `update` a field: the same mapping would turn a PICK_LIST into SINGLE_LINE.
- Fields are made instead with the request the ucode admin sends: `POST https://api.admin.u-code.io/v2/fields/{table}`, headers `Authorization: API-KEY` and `X-API-KEY: <the same key>`, body `{id: <new uuid>, table_id: <table slug>, slug, label, type, index: "string", is_visible: true, required: false, attributes: {label: "", label_en: <label>}}`, with ucode's own types (BOOLEAN of the batches → CHECKBOX). ucode answers 201 with the field as stored, so the type can be checked from the reply. The UI and the in-app agent both send a new `id`; the MCP's `create_field` has no such parameter, which is the likely reason it fails.
- A field is changed with `PUT https://api.admin.u-code.io/v2/fields/{table}`. The gateway replaces the field with what is sent, so the body is the whole field: the body above with the field's own `id` and `table_id` (the table's guid), plus `default: ""`, `unique`, `automatic` and `show_label` false. A type change changes the column too (`since` went from VARCHAR to FLOAT). An update that keeps the type keeps the rows' values: on 18 October a test row's `pilots.status` = `planned` was still there after the field got its options. A type change on a table with rows was not tried. `fields.mjs` still skips tables with rows unless given `--with-rows`.
- `scripts/ucode/` holds these requests as commands, with the key read from `UCODE_API_KEY` or from the MCP entry in `~/.claude.json` (`UCODE_MCP_SERVER=ucode-prod` for production): `fields.mjs create <batch>` makes a batch's missing fields, `fields.mjs options <batch|all>` sets the pick lists' options (a dry run unless given `--write`), `menus.mjs move` moves a table to a folder, `verify.mjs` compares the live project with the batches field by field, and `smoke.mjs --write-test-rows` runs a deal through every table and deletes its rows again (it refuses `ucode-prod`).
- `menu_id` is the sidebar folder. ucode's agent passes the main menu, which is why its tables landed outside Admin; passing the Admin folder's id puts them inside.
- No MCP tool moves a table to another folder. The ucode admin's «move to folder» sends `PUT https://api.admin.u-code.io/v3/menus` with the table's sidebar entry and its new `parent_id` (`FolderModalComponent.jsx` in the admin frontend); the same key works with `Authorization: API-KEY`. The gateway replaces the entry with what is sent, so the body carries all of it: `{id: <the entry's id from get_menus>, parent_id: <folder id>, type: "TABLE", label, table_id, attributes: {label: "", label_en: <label>}}`. The entry keeps its id and permissions.
- Connect once per machine. The key stays in `~/.claude.json`, not in the repo. Make a key for this work (ucode: Settings → API keys) and revoke it when the migration is done.

  ```bash
  claude mcp add --transport http --scope local ucode https://mcp.u-code.io/mcp --header "X-API-KEY: <key>"
  ```

  Then reload with `/mcp`, or start a new session in this folder.

## The ucode agent, from its code

The «AI agent» button in the ucode admin (`Ucode-io/ucode_admin_frontend`, `src/components/AiChatPanel`) sends each message to the gateway (`POST /v1/ai-chat/ucode-messages/{chat}`, `ucode_go_admin_api_gateway`, `api/handlers/v1/ai_ucode_chat.go` and `ai_ucode_tools.go`). There a model (Anthropic, OpenAI or Gemini, set by ucode) works with these tools and the prompt in `chat_prompts/ucode_builder.go`:

| Tool | What it does | What it cannot do |
| --- | --- | --- |
| `get_schema` | lists table slugs, or one table's field slugs | no types, options, relations or folders |
| `create_table` | a table, in the main menu or under a given `menu_id` | — |
| `create_menu` | a new folder under the main menu, returns its `menu_id` | never finds an existing folder: each call makes a new one |
| `create_field` | a field with slug, label and type | no PICK_LIST options, no required/unique |
| `create_relation` | Many2One, field named `{table_to}_id` | no other relation types, no chosen field name |
| `create_login_table` | a table whose rows can sign in (login, email or phone + password), optionally with a new client type and role | — |
| `insert_items` | rows | — |
| `count_items`, `list_items`, `aggregate_items` | read rows | — |

Nothing can be updated or deleted. Its limits explain what happened in batches 2 and 3:

- **16 model steps per message.** A large batch can stop partway through; the next message then finds part of it done.
- **Memory: the last 20 messages, as text only.** It does not keep the ids its tools returned, so it cannot reuse the Admin folder's `menu_id` in a later message (batches 2–3 went to the main menu), and the rules sent once at the start drop out of its view.
- **Read-backs can check names only**, since `get_schema` returns nothing else. Its statements about types and options were not read from the platform.

So, through the agent:

1. Start a **new chat for each batch**, and put the rules (Decisions A–I) at the top of the same message as the batch.
2. Give it the Admin folder's id and ask it to pass it as `menu_id` to every `create_table`. Without the id, it either uses the main menu or, if asked to use Admin, makes a second folder called Admin.
3. Send at most 3–4 tables per message, the relations in a last message of their own.
4. Add pick-list options afterwards in ucode's field settings, not with the MCP's `update_table` (see «The ucode MCP»). The panel keeps to the allowed values either way.

## Running the remaining batches

Either way uses the batch messages below.

- **ucode agent:** send the batch's block, then a read-back; move the new tables into Admin by hand.
- **Claude Code with the MCP:** `node scripts/ucode/schema.mjs spec 4` prints the batch as JSON. Each table is made with `create_table` (Admin's `menu_id`), its fields with `node scripts/ucode/fields.mjs create 4` (`POST /v2/fields/{table}`), then its relations with `update_table` (`fields: []`, `relations: [{table_to, label_to, type: "Many2One", action: "create"}]`), one table per call. Then `get_dbml`'s output, saved to a file, is checked with `node scripts/ucode/schema.mjs check <file>`. This is how batches 4 and 5 were made.

## Production

1. Make an API key for the production environment and connect the MCP with it, as a second server (`ucode-prod`) so the two cannot be confused.
2. Read the schema with `get_dbml` first. If the website's tables exist there, skip batch T and let the check compare their fields; if not, run batch T, and also make `news`, `team` and `pages` if the website will read from this project (their fields are in the website's README).
3. Make the folders Landing page, Admin and Startup cabinet under the main menu if they are missing (`get_menus` first), and put the website's tables in Landing page.
4. Batches 1 to 5, in order, into Admin, as in «Running the remaining batches» with `UCODE_MCP_SERVER=ucode-prod`, then the rows of batch 1.
5. Pick-list options: `node scripts/ucode/fields.mjs options all --write --with-rows`.
6. Check with `UCODE_MCP_SERVER=ucode-prod node scripts/ucode/verify.mjs` (without `--rows`: production has its own rows). `smoke.mjs` does not run there.

## How the platform shaped the model

Batch 0 (questions only) has been answered. What followed from it:

- **Relations.** ucode names a Many2One field after its target, `<target table>_id`, and the name cannot be chosen — this is the platform's rule, not only the agent's. A table therefore cannot have two relations to the same table. So:
  - Every link to `employees` is a plain SINGLE_LINE field holding the employee row's guid, named for what it means: `owner_id`, `sponsor_id`, `assignee_id`. The panel loads the few employees once and joins them itself.
  - Every other link is a real relation, and its field is named by ucode: `deals_id`, `meetings_id`, `portfolio_companies_id`. No table links twice to the same target.
  - `tasks.previous_id` (a task's earlier occurrence) is a plain SINGLE_LINE field.
- **Types the agent cannot create:** FLOAT → NUMBER (stored as a decimal column: 7.5 stays 7.5); CHECKBOX → BOOLEAN; TIME → SINGLE_LINE holding `HH:mm`; MULTISELECT → JSON holding an array of option values; FILE → SINGLE_LINE holding the ucode file id; MULTI_FILE → JSON holding an array of file ids.
- **Field names.** ucode adds columns without quoting their names, so only Postgres reserved words would fail; none of these slugs is one (`order`, `table`, `user` are avoided). The website's tables already use `date`, `status`, `stage`, `source`.
- **Lists that will grow** and that only the backend writes (journal event kinds, task origins) are SINGLE_LINE rather than PICK_LIST.
- **Pick-list options.** The options written in the batches are the allowed values. The agent cannot store them (its field tool has no options), so they are added afterwards, in ucode's field settings or with `scripts/ucode/fields.mjs options`.

## Decisions A–H — send first

Replace the H line with what applies before sending.

```
Decisions for A–H:

A. Links to employees are plain SINGLE_LINE fields holding the employee row's guid (owner_id, sponsor_id, assignee_id, …). They are listed among each table's fields, not as relations. Every other link is a real Many2One relation, with the slug the platform gives it, {target_table}_id (deals_id, meetings_id, …); no table has two relations to the same target. tasks.previous_id is a plain SINGLE_LINE field as well.
B. NUMBER instead of FLOAT — confirmed.
C. BOOLEAN instead of CHECKBOX — confirmed.
D. TIME → SINGLE_LINE holding "HH:mm" — confirmed.
E. MULTISELECT → JSON holding an array of the option values, e.g. ["seed","pre_series_a"].
F. FILE → SINGLE_LINE holding the ucode file id; MULTI_FILE → JSON holding an array of file ids.
G. Proceed with the slugs as written: none is a Postgres reserved word, and the website's tables already use date, status, stage and source. If the platform rejects any field, stop that batch and tell me which field, before creating anything else.
H. The open environment is ______ . Proceed in it.
I. Every table these batches create goes inside the folder "Admin". If the folder does not exist yet, create it first. If you cannot place a table in a folder, tell me now, before Batch 1.

The batches I send next already use these types. Rules for every batch: create each new table inside the folder "Admin"; use the slugs exactly as written; every field optional; do not add fields I did not list; do not change existing fields. After each batch, list what you created: table, its folder, field slug, type, and for each relation the field slug ucode gave it and its target table.
```

## Batch T — only in an environment without the website's tables

The website's tables exist in production. In a fresh test environment they do not, and batches 2, 4 and 5 point to them, so create them first with the fields the website uses. Skip this batch in production.

```
Batch T. Create the website's tables as they are in production, inside the folder "Landing page". Same rules.

Table applications
- ref: SINGLE_LINE
- status: SINGLE_LINE
- contact_name: SINGLE_LINE
- email: EMAIL
- phone: PHONE
- startup_name: SINGLE_LINE
- website: SINGLE_LINE
- industry: SINGLE_LINE
- stage: SINGLE_LINE
- one_liner: SINGLE_LINE
- ask_amount: NUMBER
- source: SINGLE_LINE
- pitch_deck: SINGLE_LINE
- locale: SINGLE_LINE
- submitted_at: DATE_TIME

Table partner_requests
- name: SINGLE_LINE
- email: EMAIL
- phone: PHONE
- country: SINGLE_LINE
- request: MULTI_LINE
- locale: SINGLE_LINE
- submitted_at: DATE_TIME

Table portfolio
- name: SINGLE_LINE
- industry: SINGLE_LINE
- stage: SINGLE_LINE
- status: SINGLE_LINE
- city: SINGLE_LINE
- country: SINGLE_LINE
- invested: NUMBER
- year: SINGLE_LINE
- website: SINGLE_LINE
- founder: SINGLE_LINE
- founder_role: SINGLE_LINE
- founder_linkedin: SINGLE_LINE
- manager: SINGLE_LINE
- sort_order: NUMBER
- is_visible: BOOLEAN
- tagline_en: MULTI_LINE
- tagline_ru: MULTI_LINE
- tagline_uz: MULTI_LINE
- quote_en: MULTI_LINE
- quote_ru: MULTI_LINE
- quote_uz: MULTI_LINE
```

## Batch 1 — people, reference lists, settings

```
Batch 1. Create these tables inside the folder "Admin", with these fields, then insert the rows below. No relations in this batch.

Table industries
- slug: SINGLE_LINE
- name_ru: SINGLE_LINE
- name_uz: SINGLE_LINE
- name_en: SINGLE_LINE
- mandate: PICK_LIST [focus, allowed, licensed, excluded]
- sort_order: NUMBER

Table reject_reasons
- code: SINGLE_LINE
- label_ru: SINGLE_LINE
- label_uz: SINGLE_LINE
- label_en: SINGLE_LINE
- is_mandate: BOOLEAN
- sort_order: NUMBER

Table holidays
- date: DATE
- name: SINGLE_LINE
- is_workday: BOOLEAN

Table employees
- user_id: SINGLE_LINE
- full_name: SINGLE_LINE
- short_name: SINGLE_LINE
- position: SINGLE_LINE
- email: EMAIL
- phone: PHONE
- role: PICK_LIST [director, deputy, analyst, manager, accountant, ic_secretary, assistant, lawyer, other]
- duties: JSON
- linkedin: SINGLE_LINE
- photo: PHOTO
- is_active: BOOLEAN
- invited_at: DATE

Table fund_settings
- check_min: NUMBER
- check_max: NUMBER
- round_stages: JSON
- stake_min_pct: NUMBER
- stake_max_pct: NUMBER
- instruments: JSON
- focus_text: MULTI_LINE
- geography_text: MULTI_LINE
- excluded_text: MULTI_LINE
- ic_quorum: NUMBER
- ic_materials_days: NUMBER
- ic_discussion_at: NUMBER
- ic_reject_at: NUMBER
- flag_runway_months: NUMBER
- flag_churn_pct: NUMBER
- flag_revenue_drop_pct: NUMBER
- flag_report_late_days: NUMBER
- request_answer_days: NUMBER

Table stage_norms
- stage: PICK_LIST [inbox, screening, meeting, analysis, committee, dd, board, closing]
- norm_days: NUMBER
- norm_text: SINGLE_LINE
- is_public: BOOLEAN
- paused_when: SINGLE_LINE
- escalate_to: PICK_LIST [deputy, director, ic_chair]

Table settings_journal
- date: DATE
- employee_id: SINGLE_LINE
- field: SINGLE_LINE
- from_value: MULTI_LINE
- to_value: MULTI_LINE

Rows for industries (slug | name_ru = name_uz = name_en | mandate | sort_order)
- fintech | FinTech | focus | 1
- ai | AI | focus | 2
- saas | SaaS | focus | 3
- e-commerce | E-commerce | focus | 4
- agrotech | AgroTech | allowed | 5
- edtech | EdTech | allowed | 6
- healthtech | HealthTech | allowed | 7
- logistics | Logistics | allowed | 8
- greentech | GreenTech | allowed | 9
- insurtech | InsurTech | allowed | 10
- industrial-tech | Industrial Tech | allowed | 11

Rows for reject_reasons (code | label_ru | label_uz | label_en | is_mandate | sort_order)
- mandate_check | Вне мандата: размер чека | Mandatdan tashqari: chek miqdori | Outside the mandate: check size | true | 1
- mandate_scope | Вне мандата: стадия, отрасль или география | Mandatdan tashqari: bosqich, soha yoki geografiya | Outside the mandate: stage, industry or geography | true | 2
- no_demand | Нет подтверждённого спроса | Tasdiqlangan talab yo‘q | No confirmed demand | false | 3
- team | Команда не закрывает ключевые компетенции | Jamoa asosiy kompetensiyalarni qoplamaydi | The team does not cover key competences | false | 4
- valuation | Оценка выше, чем готов платить фонд | Baho fond to‘lashga tayyor bo‘lganidan yuqori | Valuation above what the fund is ready to pay | false | 5
- other | Другое | Boshqa | Other | false | 6

Rows for stage_norms (stage | norm_days | norm_text | is_public | paused_when | escalate_to); "empty" means leave the field empty
- inbox | 2 | 2 | false | empty | deputy
- screening | 5 | 5 · публично | true | ждём ответа заявителя | deputy
- meeting | 10 | 10 | false | заявитель перенёс встречу | deputy
- analysis | 10 | 10 | false | ждём ответа заявителя | director
- committee | empty | до заседания | false | empty | ic_chair
- dd | 30 | 30 | false | ждём документов компании | director
- board | empty | график НС | false | empty | director
- closing | 20 | 20 | false | подпись второй стороны | director

One row for fund_settings, with only these fields filled (the mandate fields stay empty for now):
ic_quorum 3, ic_materials_days 3, ic_discussion_at 1, ic_reject_at 2, flag_runway_months 6, flag_churn_pct 5, flag_revenue_drop_pct 0, flag_report_late_days 5, request_answer_days 5
```

## Batch 2 — Сделки

```
Batch 2. Same rules: every table inside the folder "Admin". Fields ending in _id that are listed among a table's fields are plain SINGLE_LINE fields (they hold an employee's guid), not relations. The relations are listed at the end.

Table deals
- number: SINGLE_LINE
- company: SINGLE_LINE
- about: MULTI_LINE
- website: SINGLE_LINE
- niche: SINGLE_LINE
- tags: SINGLE_LINE
- channel: PICK_LIST [site, network, conference, partner_fund, accelerator, portfolio, other]
- heard_from: SINGLE_LINE
- country: SINGLE_LINE
- round_stage: PICK_LIST [pre_seed, seed, pre_series_a, series_a]
- amount: NUMBER
- applicant_name: SINGLE_LINE
- applicant_email: EMAIL
- applicant_phone: PHONE
- received_at: DATE_TIME
- status: PICK_LIST [review, active, paused, portfolio, withdrawn, rejected]
- stage: PICK_LIST [inbox, screening, meeting, analysis, ic1, dd, ic2, board, closing]
- owner_id: SINGLE_LINE
- proposed_owner_id: SINGLE_LINE
- second_reviewer_id: SINGLE_LINE
- sponsor_id: SINGLE_LINE
- stage_entered_at: DATE
- stage_due: DATE
- stage_norm_days: NUMBER
- days_used: NUMBER
- paused_days: NUMBER
- waiting: BOOLEAN
- paused_since: DATE
- next_title: SINGLE_LINE
- next_due: DATE
- next_time: SINGLE_LINE
- closed_note: MULTI_LINE
- closed_letter: MULTI_LINE
- closed_at: DATE
- resubmit: PICK_LIST [now, in_6_months, in_12_months]
- round_size: NUMBER
- pre_money: NUMBER
- stake_pct: NUMBER
- instrument: PICK_LIST [safe, convertible, equity]
- terms_warning: MULTI_LINE
- metrics: JSON
- synergy: JSON
- related: JSON
- screening_decision: PICK_LIST [meeting, request, reject]
- screening_essence: MULTI_LINE
- screening_why_now: MULTI_LINE
- screening_red_flags: MULTI_LINE
- screening_questions: MULTI_LINE
- screening_completed_at: DATE
- dd_due: DATE
- dd_closed_note: MULTI_LINE
- dd_external_cost: NUMBER
- dd_external_note: MULTI_LINE
- dd_strengths: MULTI_LINE
- dd_alert_title: SINGLE_LINE
- dd_alert_text: MULTI_LINE

Table deal_stage_history
- stage: PICK_LIST [inbox, screening, meeting, analysis, ic1, dd, ic2, board, closing, portfolio]
- entered_at: DATE
- left_at: DATE
- norm_days: NUMBER
- days_used: NUMBER
- paused_days: NUMBER
- late: BOOLEAN
- moved_by_id: SINGLE_LINE

Table deal_events
- at: DATE_TIME
- kind: SINGLE_LINE
- stage: SINGLE_LINE
- title: SINGLE_LINE
- result: SINGLE_LINE
- reason: SINGLE_LINE
- text: MULTI_LINE
- employee_id: SINGLE_LINE

Table screening_scores
- criterion: PICK_LIST [market, demand, product, economics, team, regulation, mandate]
- score: NUMBER
- rationale: MULTI_LINE
- source: SINGLE_LINE
- scored_by_id: SINGLE_LINE

Table deal_requests
- title: SINGLE_LINE
- text: MULTI_LINE
- sent_by_id: SINGLE_LINE
- sent_at: DATE
- due_date: DATE
- status: PICK_LIST [waiting, answered, accepted]
- answer: MULTI_LINE
- closed_at: DATE
- warning: SINGLE_LINE
- is_dd_questionnaire: BOOLEAN

Table deal_documents
- title: SINGLE_LINE
- status: PICK_LIST [required, review, accepted, rejected]
- version: NUMBER
- file: SINGLE_LINE
- uploaded_by: PICK_LIST [applicant, fund]
- uploaded_at: DATE_TIME
- handled_by_id: SINGLE_LINE
- handled_at: DATE_TIME
- reason: MULTI_LINE

Table deal_risks
- level: PICK_LIST [high, medium]
- severity: NUMBER
- title: SINGLE_LINE
- short: SINGLE_LINE
- note: MULTI_LINE
- measure: MULTI_LINE
- owner_id: SINGLE_LINE

Table deal_checklists
- list: PICK_LIST [exit, readiness, memo]
- stage: PICK_LIST [inbox, screening, meeting, analysis, ic1, dd, ic2, board, closing]
- text: SINGLE_LINE
- note: SINGLE_LINE
- state: PICK_LIST [done, open, waiting, attention, blocking]
- fulfilled_by: SINGLE_LINE
- sort_order: NUMBER

Table deal_team
- employee_id: SINGLE_LINE
- external_name: SINGLE_LINE
- role: SINGLE_LINE

Table workstreams
- name: SINGLE_LINE
- executor: SINGLE_LINE
- handed_at: DATE
- due_date: DATE
- status: PICK_LIST [not_started, in_progress, rework, done]
- conclusion: MULTI_LINE
- report: SINGLE_LINE

Table memos
- version: NUMBER
- version_date: DATE
- version_note: SINGLE_LINE
- author_id: SINGLE_LINE
- sponsor_id: SINGLE_LINE
- recommendation: PICK_LIST [strong_yes, yes, conditional, no]
- snapshot: MULTI_LINE
- summary: JSON
- sections: JSON
- file: SINGLE_LINE
- approved_at: DATE
- comment_by_id: SINGLE_LINE
- comment_at: DATE_TIME
- comment_text: MULTI_LINE

Relations (Many2One, from table → target table; ucode names the field {target}_id)
- deals → applications
- deals → industries
- deals → reject_reasons
- deal_stage_history → deals
- deal_events → deals
- screening_scores → deals
- deal_requests → deals
- deal_documents → deals
- deal_documents → deal_requests
- deal_risks → deals
- deal_checklists → deals
- deal_team → deals
- workstreams → deals
- memos → deals
```

## Batch 3 — Инвесткомитет

```
Batch 3. Same rules: every table inside the folder "Admin". Fields ending in _id listed among a table's fields are plain SINGLE_LINE fields, not relations.

Table committee_members
- name: SINGLE_LINE
- role: PICK_LIST [chair, bank, international, independent]
- bodies: JSON
- remote: BOOLEAN
- contract: SINGLE_LINE
- email: EMAIL
- user_id: SINGLE_LINE
- is_active: BOOLEAN

Table meetings
- body: PICK_LIST [ic, board]
- number: SINGLE_LINE
- stage: PICK_LIST [ic1, ic2]
- date: DATE
- time: SINGLE_LINE
- format: SINGLE_LINE
- secretary_id: SINGLE_LINE
- materials_due: DATE
- materials_sent_at: DATE
- status: PICK_LIST [planned, live, break, held]
- started_at: SINGLE_LINE
- break_at: SINGLE_LINE
- result: PICK_LIST [planned, live, approved, approved_conditions, postponed, rejected, mixed]
- protocol_state: PICK_LIST [none, signing, signed]
- protocol_file: SINGLE_LINE
- summary: MULTI_LINE

Table meeting_attendance
- attendance: PICK_LIST [confirmed, no_answer, declined]

Table agenda_items
- sort_order: NUMBER
- kind: PICK_LIST [decision, info]
- title: SINGLE_LINE
- stage: PICK_LIST [ic1, ic2, board]
- amount: NUMBER
- instrument: SINGLE_LINE
- speaker_id: SINGLE_LINE
- materials_ready: NUMBER
- materials_total: NUMBER
- questions: JSON
- protocol_pros: MULTI_LINE
- protocol_cons: MULTI_LINE
- protocol_conditions: MULTI_LINE
- protocol_next: MULTI_LINE
- outcome: PICK_LIST [approved, approved_conditions, sponsor_approved, rejected, postponed, noted]
- outcome_note: MULTI_LINE

Table votes
- choice: PICK_LIST [for, against, dissent, absent]
- note: MULTI_LINE

Table decisions
- body: PICK_LIST [ic, board]
- meeting_label: SINGLE_LINE
- date: DATE
- stage: PICK_LIST [ic1, ic2, board]
- subject: SINGLE_LINE
- outcome: PICK_LIST [approved, approved_conditions, sponsor_approved, rejected, postponed, noted]
- note: MULTI_LINE
- conditions: MULTI_LINE

Relations (Many2One, from table → target table; ucode names the field {target}_id)
- meetings → committee_members (the chair)
- meeting_attendance → meetings
- meeting_attendance → committee_members
- agenda_items → meetings
- agenda_items → deals
- agenda_items → memos
- votes → agenda_items
- votes → committee_members
- decisions → meetings
- decisions → deals
- deals → meetings (the meeting the deal is on the agenda of)
```

## Batch 4 — Портфель

```
Batch 4. Same rules: every table inside the folder "Admin". Fields ending in _id listed among a table's fields are plain SINGLE_LINE fields, not relations.

Table portfolio_companies
- name: SINGLE_LINE
- tagline: SINGLE_LINE
- about: MULTI_LINE
- countries: SINGLE_LINE
- instrument: PICK_LIST [safe, convertible, equity]
- since: NUMBER
- owner_id: SINGLE_LINE
- current_note: MULTI_LINE
- valuation: SINGLE_LINE
- moic: SINGLE_LINE
- facts: JSON
- commercial_title: SINGLE_LINE
- commercial_note: MULTI_LINE
- status: PICK_LIST [active, exit, written_off]

Table investments
- date: DATE
- kind: PICK_LIST [initial, follow_on]
- instrument: PICK_LIST [safe, convertible, equity]
- amount: NUMBER
- valuation: NUMBER
- stake_pct: NUMBER
- note: MULTI_LINE

Table reporting_cycles
- quarter: SINGLE_LINE
- due: DATE
- requested_at: DATE
- reminded_at: DATE
- auto_reminder_at: DATE

Table quarter_reports
- quarter: SINGLE_LINE
- fund_template_at: DATE
- company_template_at: DATE
- form1_at: DATE
- form2_at: DATE
- files: JSON
- metrics_state: PICK_LIST [none, check, confirmed]
- filled_at: DATE
- confirmed_by_id: SINGLE_LINE
- mrr: NUMBER
- revenue: NUMBER
- margin: NUMBER
- burn: NUMBER
- runway: NUMBER
- clients: NUMBER
- churn: NUMBER
- team: NUMBER

Table pilots
- title: SINGLE_LINE
- customer: SINGLE_LINE
- status: PICK_LIST [planned, in_progress, success, failed]
- note: MULTI_LINE
- started_at: DATE
- ended_at: DATE

Table company_requests
- title: SINGLE_LINE
- opened_at: DATE
- status: PICK_LIST [waiting_fund, in_work, closed]
- note: MULTI_LINE
- owner_id: SINGLE_LINE
- answer: MULTI_LINE
- answered_at: DATE

Table company_documents
- title: SINGLE_LINE
- kind: SINGLE_LINE
- date: DATE
- file: SINGLE_LINE

Relations (Many2One, from table → target table; ucode names the field {target}_id)
- portfolio_companies → industries
- portfolio_companies → deals
- portfolio_companies → portfolio (the website's row)
- investments → portfolio_companies
- investments → deals
- investments → decisions
- quarter_reports → portfolio_companies
- pilots → portfolio_companies
- company_requests → portfolio_companies
- company_documents → portfolio_companies
```

## Batch 5 — Работа, money, downloads, the website's tables

```
Batch 5. Same rules: every new table inside the folder "Admin". Fields ending in _id listed among a table's fields are plain SINGLE_LINE fields, not relations. In applications, partner_requests, deals and employees only add the fields below; do not change their existing fields and do not move them to another folder.

Table tasks
- title: SINGLE_LINE
- context: SINGLE_LINE
- basis: SINGLE_LINE
- type: PICK_LIST [acceleration, finance, reporting, correspondence, legal, portfolio, regions, other]
- assignee_id: SINGLE_LINE
- reviewer_id: SINGLE_LINE
- created_by_id: SINGLE_LINE
- previous_id: SINGLE_LINE
- due_date: DATE
- due_label: SINGLE_LINE
- priority: PICK_LIST [low, medium, high]
- status: PICK_LIST [assigned, in_progress, waiting, postponed, review, done]
- recurrence: PICK_LIST [none, monthly, quarterly]
- origin: SINGLE_LINE
- completed_at: DATE

Table task_checklist
- text: SINGLE_LINE
- done: BOOLEAN
- sort_order: NUMBER

Table task_events
- date: DATE
- kind: SINGLE_LINE
- status: SINGLE_LINE
- text: MULTI_LINE
- employee_id: SINGLE_LINE

Table fund_money
- as_of: DATE
- capital: NUMBER
- direct_allocation: NUMBER
- on_accounts: NUMBER
- plan_year: NUMBER
- plan_direct_deals: NUMBER
- approved_unpaid: NUMBER
- approved_note: MULTI_LINE
- follow_on_reserve: NUMBER
- follow_on_note: MULTI_LINE
- operating_left: NUMBER
- operating_note: MULTI_LINE

Table file_downloads
- file_id: SINGLE_LINE
- file_name: SINGLE_LINE
- table_slug: SINGLE_LINE
- record_id: SINGLE_LINE
- employee_id: SINGLE_LINE
- downloaded_at: DATE_TIME
- ip: SINGLE_LINE
- download_no: SINGLE_LINE

New fields in the existing table applications
- public_status: PICK_LIST [submitted, screening, meeting, due_diligence, committee, closing, portfolio, rejected, withdrawn]
- public_status_at: DATE_TIME
- founder_user_id: SINGLE_LINE
- resubmit_after: DATE

New fields in the existing table partner_requests
- status: PICK_LIST [new, in_work, closed]
- owner_id: SINGLE_LINE
- note: MULTI_LINE

New fields in the existing table deals
- facts: JSON
- facts_note: SINGLE_LINE
- terms: JSON

New fields in the existing table employees
- access: PICK_LIST [full, work, limited]

Relations (Many2One, from table → target table; ucode names the field {target}_id)
- tasks → decisions
- tasks → deals
- tasks → portfolio_companies
- tasks → meetings
- task_checklist → tasks
- task_events → tasks
```

## Checking what was created

With the API: `node scripts/ucode/verify.mjs` reads every table's fields from ucode and reports, table by table, missing fields, a ucode type other than the batch's, hidden fields, pick lists whose options differ, missing or misdirected relations and fields that are not in the spec; `--rows` adds the test environment's row counts. Then `node scripts/ucode/smoke.mjs --write-test-rows` (test environment only) writes and reads a linked row in every table and removes them.

With the MCP: save `get_dbml`'s output to a file and run `node scripts/ucode/schema.mjs check <file>`. It reports the same per table, but from column types: SINGLE_LINE, MULTI_LINE and PICK_LIST are all VARCHAR there, so it cannot tell them apart.

Through the ucode agent: send this after the batches, and bring the answer back to be compared with the table below.

```
Please report what exists now. Do not create or change anything in reply to this message.

1. Environment: which project and environment are these tables in?

2. Inventory: for every table in the folder "Admin", one line:
   table slug | number of my fields that exist | relation fields (slug → target table, relation type) | number of rows
   Count only the fields from my batches, not system fields (guid, created_at, updated_at, …).

3. Did you create any table outside the folders "Admin" and "Landing page", or any table twice (for example deals_2, after a retry)? List them.

4. Differences from my batches, field by field. List every field that was:
   - not created, or rejected by the platform (with the error);
   - created with a different slug;
   - created with a type other than agreed in A–F (and which type it has);
   - created as required, unique, or with a default value;
   - added although I did not ask for it, including fields ucode added by itself when a relation was created.
   Write "none" if there are none.

5. PICK_LIST fields: are the stored option values exactly the lowercase values I wrote (pre_seed, in_6_months, …), not labels such as "Pre-seed"? List every pick list whose values differ.

6. Relations: confirm that each one is Many2One and give the field slug ucode created for it. Did creating a relation add a field to the target table?

7. Website tables:
   - list the fields of applications and of partner_requests, with their types;
   - confirm their existing fields were not changed and the tables were not moved to another folder;
   - does portfolio exist, and in which folder?

8. Rows: list every row of industries, reject_reasons and stage_norms with all their fields, and the one row of fund_settings. Did any other table get rows, for example test rows?

9. Anything that failed and was retried, or that you could not finish.
```

What the answer should show: 36 tables in Admin (and the 3 of batch T in Landing page), 41 relations, and these counts.

| Table | Fields | Relation fields |
| --- | --- | --- |
| industries | 6 | — |
| reject_reasons | 6 | — |
| holidays | 3 | — |
| employees | 12 | — |
| fund_settings | 18 | — |
| stage_norms | 6 | — |
| settings_journal | 5 | — |
| deals | 56 | applications_id, industries_id, reject_reasons_id, meetings_id |
| deal_stage_history | 8 | deals_id |
| deal_events | 8 | deals_id |
| screening_scores | 5 | deals_id |
| deal_requests | 10 | deals_id |
| deal_documents | 9 | deals_id, deal_requests_id |
| deal_risks | 7 | deals_id |
| deal_checklists | 7 | deals_id |
| deal_team | 3 | deals_id |
| workstreams | 7 | deals_id |
| memos | 14 | deals_id |
| committee_members | 8 | — |
| meetings | 16 | committee_members_id |
| meeting_attendance | 1 | meetings_id, committee_members_id |
| agenda_items | 16 | meetings_id, deals_id, memos_id |
| votes | 2 | agenda_items_id, committee_members_id |
| decisions | 8 | meetings_id, deals_id |
| portfolio_companies | 14 | industries_id, deals_id, portfolio_id |
| investments | 7 | portfolio_companies_id, deals_id, decisions_id |
| reporting_cycles | 5 | — |
| quarter_reports | 17 | portfolio_companies_id |
| pilots | 6 | portfolio_companies_id |
| company_requests | 7 | portfolio_companies_id |
| company_documents | 4 | portfolio_companies_id |
| tasks | 15 | decisions_id, deals_id, portfolio_companies_id, meetings_id |
| task_checklist | 3 | tasks_id |
| task_events | 5 | tasks_id |
| fund_money | 12 | — |
| file_downloads | 8 | — |
| applications | +4 added | — |
| partner_requests | +3 added | — |
| deals | +3 added | — |
| employees | +1 added | — |

Rows: industries 11, reject_reasons 6, stage_norms 8, fund_settings 1; every other table empty.

## Reading and writing rows

What the backend that replaces the panel's `services/` needs to know, from `smoke.mjs` (18 October):

- Rows go through `/v2/items/{table}` with the same key: `POST` with `{data: {…}}` makes a row and answers 201 with it, guid included; `GET /v2/items/{table}/{guid}?with_relations=true` reads one, each relation's row coming as `<field>_data`; `GET /v2/items/{table}?data=<URL-encoded JSON>` lists, with filters as keys (`{"deals_id": "…", "limit": 50, "offset": 0}`); `DELETE /v2/items/{table}/{guid}` with a `{data: {}}` body removes one. The older `/v1/object/…` create answers "does not implemented" in this project.
- **JSON fields are text columns.** Send `JSON.stringify(value)`; an array or object sent as is is refused (HTTP 500, "cannot find encode plan … for varchar"). Parse them when reading.
- **ucode does not check pick-list values.** A row with `status: "not_an_option"` was stored. The options only drive ucode's own admin, so the backend checks values against the batches' lists.
- A DATE comes back as `2026-10-18T00:00:00Z`; take its first ten characters.
- **A DATE_TIME is kept to the second.** Rows made within one second have the same `at`; order them by ucode's own `created_at` as well, which has microseconds.
- `PUT /v2/items/{table}` with `{data: {guid, …}}` changes only the fields sent; the others keep their values.
- A `guid` sent with a new row is kept, so the panel creates rows under its own ids.
- Links to employees (`owner_id`, `assignee_id`, …) are plain text holding the employee row's guid, as decided in A; ucode does not join them.
- Files: `GET /v1/files` lists them; `DELETE /v1/files` with `{objects: [{object_id: <the file's id>}]}` removes one (`DELETE /v1/files/{id}` expects the storage path and removes only the stored object).

Who writes what, as of 18 October:

| Step | Written by |
| --- | --- |
| a Pitch Us application, its deal in the inbox, the deck, the first journal entry, `public_status = submitted` | the website's server (`src/modules/PitchUs/services/intake.server.ts` there) |
| everything done to a deal in Сделки, its stage history, the applicant's `public_status` and `resubmit_after` | the panel (`src/modules/Deals/services/ucode.ts`), with the signed-in person's token, or the dev server's key |
| whether an email may apply again | the website, from `public_status` and `resubmit_after` |

## Staff sign-in

ERP.md §2 and §4.1: a staff member is a ucode user, signs in with work email and password, and the panel sends their token; their profile is the `employees` row whose `user_id` is that user. `scripts/ucode/auth.mjs` does the ucode side.

What exists in the test environment (18 October):

| Piece | Id / slug | Made by |
| --- | --- | --- |
| login table `staff_users` (Admin): login, email, password, role_id, client_type_id, user_id_auth, added by ucode | `66eff581-758d-48ec-82c6-072790b674a4` | the MCP's `create_table` with `is_login_table: true`, `auth_info.login_strategy: ["email", "login"]` |
| client type `STAFF`, on `staff_users` | `730fcd15-19e9-4822-8bb5-758965fedf95` | `auth.mjs setup` |
| roles under STAFF: director, deputy, analyst, manager, accountant, ic_secretary, assistant, lawyer, other (the values of `employees.role`) | — | `auth.mjs setup`, with `grant_access: true` |
| staff users | none yet | `auth.mjs user <email> <role> "<Full name>"` (open, below) |

- **ucode bug:** a client type made without a table makes ucode create `<name>_users` for it, and that fails with "error getting project info" (the auth service leaves out the project the builder's check wants, `services/object-builder/grpc/service/table.go`). So the login table is made first and the client type points to it, as the admin UI does.
- STAFF came back from the create call without `project_id` and client platform; filling them in with `PUT /v2/client-type` was not done (below).
- Sign-in: `POST https://api.auth.u-code.io/v2/login?project-id=<project>`, header `Environment-Id`, body `{username: <email>, password, client_type: <STAFF id>, project_id, type: "default"}`; the reply has `token.access_token`, `token.refresh_token` and `user_id_auth`. Refresh: `PUT /v2/refresh` with the refresh token. Calls to the admin API then carry `Authorization: Bearer <token>` and `Environment-Id`; its CORS allows any origin, so the browser calls it directly. A made-up user is refused with HTTP 400 ("invalid hash type"), which the panel shows as a wrong email or password.
- Users, client types and roles are made through the auth service with the same API key (`Authorization: API-KEY`, `X-API-KEY`, `?project-id=`). **A user may take a paid seat**: the auth service reserves one when the project has a per-user price, and otherwise checks the plan's user limit.
- The panel: `.env.example` and the README («Сделки on ucode»).

Open:
1. **Permissions.** The nine roles were made with `grant_access: true`, which gives them broad access; they are to be narrowed to ERP.md §6 (`/v2/role-permission/detailed`, `/v2/menu-permission/detailed`) before real people get them. Changing roles and client types was stopped by Claude Code's safety check («Permission Grant») and waits for the owner's decision.
2. **The first staff users**, each a possible paid seat: the owner's decision.
3. Signing in end to end has not been tried: it needs a user.

## What stays empty or open

- `fund_settings` mandate fields (check, stages, stake, instruments, texts) — after the mandate is chosen (ERP.md §8, question 1).
- `employees`, `committee_members` — the real staff and members; the panel's sample names are made up, except the director's.
- `holidays` — the official calendar for the year, from the fund's accountant or HR.
- `applications.public_status` keeps all seven stages plus rejected and withdrawn; the website can show them grouped into four (ERP.md §5.6).
- The `industries` mandate marks follow the website's Focus page (fintech, AI, SaaS, e-commerce in focus) and can be changed as rows.
- Values the backend writes into plain-text fields (`deal_events.kind`, `tasks.origin`, `deal_checklists.fulfilled_by`, …) use the lists in ERP.md §4.

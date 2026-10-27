# SQB Ventures ERP — data model and logic for ucode

What the fund's backend holds and how it behaves, so it can be built on ucode (app.u-code.io) and this admin panel and the website can be connected to it.

Sources: the system map «Операционная платформа фонда — карта системы» (ERP V2, 2 October 2026); this repo's types (`src/shared/types/*.types.ts`) and services, which carry the rules of the design's screens 01–25; the website repo (`Ucode-io/sqb-ventures-website`), which already talks to ucode; the «SQB VC website» feedback document.

## 1. Scope

| Phase | Part | State today |
| --- | --- | --- |
| 1 | **Website** — Pitch Us form, Become a partner form, public content | Built. Writes `applications` and `partner_requests` to ucode, reads `portfolio`, `news`, `team`, `pages` |
| 1 | **Admin: Работа** — Обзор, Мой день, Задачи | On ucode (tasks; Мой день and Обзор counted from the tables, §5.7) |
| 1 | **Admin: Инвестиции** — Сделки, Инвесткомитет, Портфель | On ucode |
| 1 | **Admin: Настройки** — mandate, stage norms, staff and roles, the reference lists, integrations | On ucode. Сделки take the mandate, the norms and the lists from it; the website's form offers the same lists |
| 2 | **Startup cabinet** — the applicant's status, the fund's requests and documents; the portfolio company's quarterly reports and requests | Built as its own app (`venture/startup-cabinet`, docs/cabinet-and-website.md), not deployed |
| 3 | **Fund: Документы** — the register of the fund's documents and the open governance questions | On ucode (§4.9). A document links to its file where the fund keeps it |
| 3 | Финансы, Договоры, Закупки, Корреспонденция | Screens built, hidden from the panel until their tables exist (they come back from the repo's history) |

## 2. How the parts connect

```
  Website (Next.js server)        Admin panel (this repo, browser)      Startup cabinet (phase 2)
        │ project API key               │ the staff member's token            │ the founder's token
        │                               │ (email + password)                  │ (one-time code to email)
        ▼                               ▼                                     ▼
  ┌──────────────────────────────────── ucode project ────────────────────────────────────┐
  │  tables (§4)                       functions (§5): triggers, actions, nightly job       │
  │  roles and permissions (§6)        files: private, downloaded with a watermark (§7)    │
  └────────────────────────────────────────────────────────────────────────────────────────┘
```

- The website keeps calling ucode from its server with the project API key, as it does now.
- The admin panel runs in the browser, so it must not carry the API key. Each person signs in to ucode (`POST /v2/login`) and the panel sends that person's token; ucode then applies their role's permissions.
- The startup cabinet signs a founder in with a one-time code sent to the application's email (ucode supports `EMAIL_OTP` logins).

## 3. Rules the model follows

1. **A record is made once and moves on.** Заявка → Сделка → Решение ИК → Договор или SAFE → Платёж → Компания портфеля → Квартальный отчёт (system map, «Связи между модулями»). The deal is made from the application, the portfolio company from the deal, and tasks from the protocol's conditions. Nothing is typed in twice.
2. **State changes go through functions.** Moving a stage, rejecting, forming a protocol: each checks its conditions, writes the journal, sends the letters and updates what the applicant sees. A plain update from the panel would let any client skip those rules. Ordinary edits (a score, a note, a task's text) stay plain updates.
3. **Figures are counted, not stored.** The register's counters, the funnel, conversion, rejection reasons and the sidebar counters come from queries. The panel stores and adjusts them today (`DealsSummary`) only because its sample holds 32 of the 486 deals. The one stored figure is the stage clock: working days need the holiday calendar and the paused days, so the nightly job keeps it.
4. **Public and internal data live in different tables.** The website reads `portfolio`, `team`, `news` and `pages`. The ERP keeps `portfolio_companies`, `employees` and the rest, linked to them. The website's API key gets no rights on ERP tables, so a wrong field permission cannot publish a memorandum.
5. Every row has ucode's `guid`, `created_at` and `updated_at`. Dates are `YYYY-MM-DD` in Asia/Tashkent; amounts are USD numbers.

## 4. Tables

This section is the model. What is created in ucode — with the platform's type substitutions and field names — is [ucode-migration.md](ucode-migration.md), which wins where the two differ.

Field types are ucode's (`SINGLE_LINE`, `PICK_LIST`, `FILE`, …). A field that holds a status — of a deal, a request, a document, a meeting, a task, … — is a ucode `STATUS` field (batch 7): fixed options in ucode's groups To-do, In progress and Complete, each with its names and colour; its options are written below as a pick list's. **→ table** is a link to another table, written here by its meaning (`deal_id`, `owner_id`). In ucode:

- a link to `employees` is a plain text field holding the employee's guid, under the name written here (`owner_id`, `sponsor_id`);
- every other link is a Many2One relation, and ucode names its field after the target table: `deal_id → deals` is created as `deals_id`, `company_id → portfolio_companies` as `portfolio_companies_id`. ucode allows one such relation per target in a table, which is why the links to employees are plain fields.

### 4.1 People and reference lists

**employees** is the fund's staff. The login is the ucode user and this row is the profile. It replaces `TEAM` in `src/shared/constants/system/user.ts` and `staff` in Настройки.

| Field | Type | Note |
| --- | --- | --- |
| user_id | SINGLE_LINE | the ucode user's guid |
| full_name, short_name | SINGLE_LINE | Шерзод Юлдашев, Ш. Юлдашев |
| position | SINGLE_LINE | |
| email, phone | EMAIL, PHONE | |
| role | PICK_LIST | director, deputy, analyst, manager, accountant, ic_secretary, assistant — decides access (§6) |
| duties | MULTISELECT | sponsor, deal_owner, second_reviewer, ic_secretary, procurement_chair, … (`StaffRole`) — who can be picked for what |
| linkedin | SINGLE_LINE | |
| photo | PHOTO | |
| is_active | CHECKBOX | |
| access | PICK_LIST | full, work, limited — the «Доступ» column of screen 25 |
| invited_at | DATE | kept until the first sign-in |

**industries** is one list for the website form, the mandate check and the filters.

| Field | Type | Note |
| --- | --- | --- |
| slug | SINGLE_LINE | fintech, ai, saas, … — the ids the website already sends |
| name_ru, name_uz, name_en | SINGLE_LINE | |
| mandate | PICK_LIST | focus, allowed, licensed (needs a Central Bank licence), excluded |
| sort_order | NUMBER | |

**reject_reasons** (Справочники): code, label_ru, label_uz, label_en, is_mandate (CHECKBOX: the applicant may apply again at once), sort_order, is_active.

**round_stages**, **lead_sources**, **countries** and **task_types** (batch 7) are the other lists the fund keeps in Настройки, each with its key (slug; `code` for a country, ISO 3166), name_ru, name_uz, name_en, sort_order and is_active, and one mark: `round_stages.in_mandate` and `countries.in_mandate` (the stages and the geography the mandate accepts), `lead_sources.on_site` (offered by the website's form). One list of sources serves the founder's «Откуда вы о нас узнали?» and the fund's own channels (network, conference, partner fund, accelerator, a follow-on), so «where deals come from» is one report.

Every list row is turned off (`is_active` false), never deleted: applications, deals and tasks point to it. industries and reject_reasons got `is_active` in batch 7 too.

**holidays**: date, name, is_workday (CHECKBOX: a weekend day moved to a working day). The public holidays and moved working days of Uzbekistan, for every deadline counted in working days.

### 4.2 Settings

**fund_settings** has one row. It replaces the free text that Настройки parse today (`$50 000 – $300 000` through `parseCheck`) with numbers.

| Field | Type | Note |
| --- | --- | --- |
| check_min, check_max | FLOAT | |
| round_stages | MULTISELECT | unused since batch 7: the stages are `round_stages.in_mandate` |
| stake_min_pct, stake_max_pct | FLOAT | 5 and 15 |
| instruments | MULTISELECT | safe, convertible, equity |
| focus_text, geography_text, excluded_text | MULTI_LINE | how the fund words its mandate; `geography_text` is unused since batch 7 (`countries.in_mandate`) |
| ic_quorum, ic_materials_days, ic_discussion_at, ic_reject_at | NUMBER | 3, 3, 1, 2 — `IC_RULES` today |
| flag_runway_months, flag_churn_pct, flag_revenue_drop_pct, flag_report_late_days | NUMBER | the portfolio's risk flags |
| request_answer_days | NUMBER | 5: a company's request unanswered for longer turns red |

**stage_norms**: stage (PICK_LIST: inbox, screening, meeting, analysis, committee, dd, board, closing — `committee` covers ИК-1 and ИК-2), norm_days (NUMBER; empty when the stage follows the meeting schedule), norm_text, is_public (CHECKBOX), paused_when (MULTI_LINE), escalate_to (PICK_LIST of roles).

**settings_journal**: date, employee_id → employees, field, from_value, to_value. Written by `settings_save`.

### 4.3 Intake, written by the website

**applications** holds the Pitch Us form. The website writes the first fifteen fields today; they stay as they are.

| Field | Type | Note |
| --- | --- | --- |
| ref | SINGLE_LINE | SQBV-2026-7K3QX9, shown to the founder |
| status | SINGLE_LINE | the website writes `new`; `public_status` takes over from it |
| contact_name, email, phone | SINGLE_LINE, EMAIL, PHONE | email in lower case |
| startup_name, website, one_liner | SINGLE_LINE | |
| industry | SINGLE_LINE | an `industries.slug` |
| stage | SINGLE_LINE | Pre-seed, Seed, Pre-Series A, Series A |
| ask_amount | FLOAT | USD |
| source | SINGLE_LINE | how they heard of the fund: Telegram, Social media, … |
| pitch_deck | FILE | |
| locale, submitted_at | SINGLE_LINE, DATE_TIME | |
| industries_id, round_stages_id, lead_sources_id, countries_id | → the lists | the rows chosen in the form (batch 7); `industry` keeps the slug, `stage` and `source` the English names, as before |
| public_status | STATUS | what the cabinet shows (§5.6) |
| public_status_at | DATE_TIME | |
| founder_user_id | SINGLE_LINE | the cabinet's ucode user (phase 2) |
| resubmit_after | DATE | set on rejection |

The application's deal is the deal whose `application_id` points to it; the application keeps no link of its own.

**partner_requests** holds the Become a partner form. The website writes name, email, phone, country, request, locale and submitted_at. Add status (PICK_LIST: new, in_work, closed), owner_id → employees and note.

### 4.4 Сделки

**deals** matches `Deal` in `src/shared/types/deals.types.ts`.

| Field | Type | Note |
| --- | --- | --- |
| number | SINGLE_LINE | SQBV-2026-0173, given by the function that creates the deal |
| application_id | → applications | empty for a deal entered by hand |
| company, about, website | SINGLE_LINE | |
| industry_id | → industries | the sector |
| niche | SINGLE_LINE | «Цифровые чеки» — the analyst's words; the panel shows it, or else the sector |
| tags | SINGLE_LINE | |
| lead_source_id | → lead_sources | where the deal came from: the founder's answer, or the fund's channel |
| channel | PICK_LIST | `site` for a website deal; before batch 7 also the fund's channel |
| heard_from | SINGLE_LINE | the application's `source` |
| country_id, country | → countries, SINGLE_LINE | the country; the text keeps its Russian name |
| round_stage_id, round_stage | → round_stages, PICK_LIST | the round; the pick list keeps its key |
| amount | FLOAT | USD asked for |
| applicant_name, applicant_email, applicant_phone | SINGLE_LINE, EMAIL, PHONE | |
| received_at | DATE_TIME | |
| status | STATUS | review, active, paused, portfolio, withdrawn, rejected |
| stage | PICK_LIST | inbox, screening, meeting, analysis, ic1, dd, ic2, board, closing |
| owner_id, proposed_owner_id, second_reviewer_id, sponsor_id | → employees | |
| stage_entered_at, stage_due | DATE | |
| stage_norm_days, days_used, paused_days | NUMBER | `days_used` is kept by `nightly_clock` |
| waiting | CHECKBOX | the clock stands: the fund waits for the applicant |
| paused_since | DATE | |
| next_title, next_due, next_time | SINGLE_LINE, DATE, TIME | the next step; empty title means the stage's own |
| meeting_id | → meetings | the meeting the deal is on the agenda of |
| closed_reason_id | → reject_reasons | |
| closed_note, closed_letter | MULTI_LINE | |
| closed_at | DATE | |
| resubmit | PICK_LIST | now, in_6_months, in_12_months |
| round_size, pre_money, stake_pct | FLOAT | the terms block, as numbers |
| instrument | PICK_LIST | safe, convertible, equity |
| terms | JSON | the terms block's rows as the card shows them: SAFE terms, valuation from DD, structure, founder (screen 06) |
| terms_warning | MULTI_LINE | |
| facts | JSON | «Из заявки»: revenue, clients, team, round, documents (screens 04 and 07) |
| facts_note | SINGLE_LINE | «с сайта · проверено» |
| metrics, synergy, related | JSON | label–value lists the analyst fills in |
| screening_decision | PICK_LIST | meeting, request, reject |
| screening_essence, screening_why_now, screening_red_flags, screening_questions | MULTI_LINE | the screening note |
| screening_completed_at | DATE | |
| dd_due | DATE | |
| dd_closed_note, dd_external_note, dd_strengths, dd_alert_title, dd_alert_text | MULTI_LINE | |
| dd_external_cost | FLOAT | |

«Из заявки» (`facts`) is filled from the application and completed by the analyst: the website form does not ask for revenue, team or round, which the screens show there.

**deal_stage_history**: deal_id, stage, entered_at, left_at, norm_days, days_used, paused_days, late (CHECKBOX), moved_by_id → employees. It draws «Путь сделки» and counts how many deals reached each stage.

**deal_events** is the journal, `JournalEntry`: deal_id, at (DATE_TIME), kind (PICK_LIST: created, taken, stage, screening, request, document, memo, workstream, decision, paused, resumed, withdrawn, rejected, text), stage, title, result, reason, text, employee_id. The columns are flat rather than JSON, so the journal can be filtered.

**screening_scores**: deal_id, criterion (PICK_LIST: market, demand, product, economics, team, regulation, mandate), score (NUMBER 1–5), rationale (MULTI_LINE), source, scored_by_id. One row per deal and criterion.

**deal_requests**: deal_id, title, text, sent_by_id → employees, sent_at, due_date, status (PICK_LIST: waiting, answered, accepted), answer (MULTI_LINE; from the cabinet in phase 2), closed_at, warning, is_dd_questionnaire (CHECKBOX).

**deal_documents**: deal_id, request_id → deal_requests, title, status (PICK_LIST: required, review, accepted, rejected), version (NUMBER), file (FILE, private), uploaded_by (PICK_LIST: applicant, fund), uploaded_at, handled_by_id → employees, handled_at, reason. Each version is its own row with the same title and the next `version` number, so every version keeps its author and time (screen 08).

**deal_risks**: deal_id, level (high, medium), severity (1–5), title, short, note, measure, owner_id → employees.

**deal_checklists**: deal_id, list (PICK_LIST: exit, readiness, memo), stage, text, note, state (PICK_LIST: done, open, waiting, attention, blocking), fulfilled_by (PICK_LIST: dd_questionnaire, ic_decision), sort_order. Screening's exit conditions are not stored: they follow from `screening_scores` and `second_reviewer_id`, as `exitConditions` counts them now.

**deal_team**: deal_id, employee_id → employees (empty for an outside party), external_name, role.

**workstreams** (DD): deal_id, name, executor, handed_at, due_date, status (PICK_LIST: not_started, in_progress, rework, done), conclusion, report (FILE).

**memos**: one row per version. deal_id, version, version_date, version_note, author_id, sponsor_id, recommendation (PICK_LIST: strong_yes, yes, conditional, no), snapshot (MULTI_LINE), summary (JSON), sections (JSON), file (FILE), approved_at, comment_by_id, comment_at, comment_text. The current memorandum is the deal's highest version.

### 4.5 Инвесткомитет

**committee_members**: name, role (PICK_LIST: chair, bank, international, independent), bodies (MULTISELECT: ic, board), remote (CHECKBOX), contract (SINGLE_LINE; → contracts in phase 3), email, user_id (only if members vote in the system, §8), is_active.

**meetings**: body (PICK_LIST: ic, board), number (SINGLE_LINE: 7, 6.3), stage (PICK_LIST: ic1, ic2, empty), date, time, format, secretary_id → employees, chair_id → committee_members, materials_due, materials_sent_at, status (PICK_LIST: planned, live, break, held), started_at, break_at, result (PICK_LIST: planned, live, approved, approved_conditions, postponed, rejected, mixed), protocol_state (PICK_LIST: none, signing, signed), protocol_file (FILE), summary.

**meeting_attendance**: meeting_id, member_id → committee_members, attendance (PICK_LIST: confirmed, no_answer, declined).

**agenda_items**: meeting_id, sort_order, kind (PICK_LIST: decision, info), title, deal_id → deals, stage, amount, instrument, speaker_id → employees, memo_id → memos (the version put before the committee), materials_ready, materials_total (used only for an item whose deal has no readiness list), questions (JSON), protocol_pros, protocol_cons, protocol_conditions, protocol_next (MULTI_LINE), outcome (PICK_LIST: approved, approved_conditions, sponsor_approved, rejected, postponed, noted), outcome_note.

**votes**: agenda_item_id, member_id → committee_members, choice (PICK_LIST: for, against, dissent, absent; empty until the member votes), note.

**decisions** is the register (Реестр решений): meeting_id (empty for decisions from before the register), body, meeting_label (ИК № 6.3, ИК 2024), date, stage (ic1, ic2, board), deal_id → deals, subject, outcome, note, conditions. A deal's «Решения ИК и НС» tab lists the decisions of that deal. The panel writes them in two places today (`formProtocol`, then `addDecision`); here there is one row.

The conditions somebody has to carry out become **tasks** (§4.7) with `origin = ic_condition` and `decision_id`.

### 4.6 Портфель

**portfolio_companies**: name, tagline, about, countries, industry_id → industries, instrument (PICK_LIST: safe, equity), since (NUMBER: year), owner_id → employees, current_note (MULTI_LINE: what is going on, `now` in the panel), deal_id → deals, valuation, moic, facts (JSON), commercial_title, commercial_note, status (PICK_LIST: active, exit, written_off), site_portfolio_id → portfolio (the website's row). The amount invested is the sum of the company's investments.

**investments** («Позиция и сделки»): company_id, deal_id, decision_id → decisions, date, kind (PICK_LIST: initial, follow_on), instrument, amount, valuation, stake_pct, note.

**reporting_cycles**: quarter (2026-Q3), due, requested_at, reminded_at, auto_reminder_at.

**quarter_reports** has one row per company and quarter, with what came in and the figures.

| Field | Type | Note |
| --- | --- | --- |
| company_id | → portfolio_companies | |
| quarter | SINGLE_LINE | 2026-Q3 |
| fund_template_at, company_template_at, form1_at, form2_at | DATE | when each document came in; empty while it is missing |
| files | MULTI_FILE | |
| metrics_state | PICK_LIST | none, check, confirmed |
| filled_at | DATE | when the figures came from the fund's template |
| confirmed_by_id | → employees | |
| mrr, revenue, margin, burn, runway, clients, churn, team | FLOAT | the eight metrics (`MetricKey`) |

**pilots** (Пилоты с SQB): company_id, title, customer (the SQB division), status (PICK_LIST: success, in_progress, failed), note, started_at, ended_at.

**company_requests** (Запросы к фонду): company_id, title, opened_at, status (PICK_LIST: waiting_fund, in_work, closed), note, owner_id → employees, answer, answered_at.

**company_documents**: company_id, title, kind, date, file (FILE).

### 4.7 Работа

**tasks** matches `Task` in `work.types.ts` and also holds the work other sections create.

| Field | Type | Note |
| --- | --- | --- |
| title, context, basis | SINGLE_LINE | basis is the document the task comes from |
| type_id, type | → task_types, PICK_LIST | the list's row (batch 7); `type` keeps its key: acceleration, finance, reporting, … |
| deal_id, company_id, meeting_id | → deals, portfolio_companies, meetings | what the task is about, at most one of them; contract_id, letter_id and procurement_id are added in phase 3 |
| assignee_id, reviewer_id, created_by_id | → employees | an empty assignee is set to the director |
| due_date | DATE | |
| due_label | SINGLE_LINE | «до ИК-2» when the deadline is an event, not a date |
| priority | PICK_LIST | low, medium, high |
| status | STATUS | assigned, in_progress, waiting, postponed, review, done |
| recurrence | PICK_LIST | none, monthly, quarterly |
| previous_id | → tasks | the earlier occurrence of a recurring task |
| origin | PICK_LIST | manual, ic_condition, memo_approval, screening_confirm, company_request, report_check, data_request, letter |
| decision_id | → decisions | |
| completed_at | DATE | |

**task_checklist**: task_id, text, done, sort_order.

**task_events** (the task's history): task_id, date, kind (PICK_LIST: status, recurred, comment, note), status, text, employee_id.

Мой день and the sidebar counters have no tables of their own: §5.7 lists the queries behind them.

### 4.8 Обзор: money, until Финансы are connected

Обзор shows the fund's money, which Финансы count from bank statements. Until Финансы are connected (phase 3), **fund_money** holds one row the chief accountant keeps up to date: as_of, capital, direct_allocation (the part of the capital the fund invests itself, $5M of $10M; the rest is with external managers), on_accounts, plan_year, plan_direct_deals, approved_unpaid, approved_note, follow_on_reserve, follow_on_note, operating_left, operating_note. Money free for deals is counted from it, as `moneyParts` does now: on accounts, less approved payments, the follow-on reserve and the operating budget.

### 4.9 Документы фонда (phase 3)

**fund_documents**: category (PICK_LIST: corporate, orders, hr, templates), title (an order's title is its number, «№ 4Р»), note (an order's subject), approved_by (PICK_LIST: participant, board, director), status (PICK_LIST: active, reregistration, updating, draft, archived), doc_date (the version in force; an order's date), link (where the fund keeps the file), created_by_id. One row per document: its version in force. Orders are numbered within the year by the panel.

**governance_issues**: title, note, status (PICK_LIST: awaiting_reply, in_work, resolved), opened_at, resolved_at, owner_id.

A document holds a link, not the file: what is uploaded to ucode Files opens for anyone who has its address (checked on 19 October with a pitch deck), and the fund's documents include HR papers. They can move into ucode once files are private and downloaded through §7.

## 5. Logic

### 5.1 The way of a deal

```
 website form ─► applications ──on_application_created──► deals: review · inbox
                                                             │ deal_take              │ deal_reject
                                                             ▼                        ▼
   screening ─► meeting ─► analysis ─► ic1 ─► dd ─► ic2 ─► board ─► closing ─► portfolio_companies
   each move: deal_transfer, only when the stage's exit conditions are met
   from any stage: deal_reject · deal_pause / deal_resume · deal_withdraw
```

| Stage | Norm | Leaves when | Moved by | Applicant sees |
| --- | --- | --- | --- | --- |
| inbox | 2 wd | taken into screening or rejected | an analyst takes it; the director assigns | Заявка отправлена |
| screening | 5 wd, published | 7 criteria scored with reasons; a second employee confirms | owner | Скрининг |
| meeting | 10 wd | meeting protocol; DD questionnaire sent | owner | Встреча |
| analysis | 10 wd | memorandum and IC materials 3 wd before the meeting; readiness list done | owner, with the director's approval | Due diligence |
| ic1 | until the meeting | ИК-1 decides: detailed DD or refusal | the protocol | Due diligence |
| dd | 30 wd | workstreams closed: commercial, legal, financial | owner | Due diligence |
| ic2 | until the meeting | ИК-2 decides on the investment and its terms | the protocol, with the director's approval | Инвесткомитет |
| board | board schedule | the supervisory board approves | the protocol | Инвесткомитет |
| closing | 20 wd | contract signed, details checked, payment made | owner | Оформление |
| portfolio | — | — | — | Портфель |

wd = working days. The clock stands while the fund waits for the applicant (an open request), and while a deal is paused.

### 5.2 Functions: Сделки

**on_application_created** runs after a row is created in `applications`. The website already creates rows with functions switched on (`disable_faas: false`). Until ucode functions are set up, the website's server does steps 2–4 itself right after creating the row, and checks step 1 before it (docs/ucode-migration.md, «Reading and writing rows»).
1. Refuses a second application from the same email before its `resubmit_after` date. The website checks this too, but a direct call must not get around it.
2. Creates the deal: the next number of the year, status review, stage inbox, channel site, company, contact, amount, industry and round stage from the form, `received_at = submitted_at`, `stage_due` = 2 wd later, and a proposed owner (§8, question 5).
3. Adds the pitch deck to `deal_documents` (accepted, version 1).
4. Writes `created` to the journal and sets `public_status = submitted`.
5. Phase 2: creates the founder's ucode user (founder role, one-time code login) and emails the reference and the cabinet's address.

**deal_create** is a deal entered by hand (`?new=1`): steps 2 and 4, with the channel the person chose and no application.

**deal_take**(deal, owner): review → active, stage screening, starts the clock, makes the seven empty `screening_scores` rows, writes `taken` and `stage`.

**deal_transfer**(deal):
1. Checks the current stage's exit conditions: for screening, all seven criteria scored with reasons and a second reviewer chosen; for the other stages, every `deal_checklists` row of the list `exit` done.
2. The moves analysis → ic1 and dd → ic2 need the director's approval (system map: the director approves moves to the committee).
3. Closes the stage: `left_at`, `days_used`, `late` in `deal_stage_history`.
4. Opens the next one: norm and due date from `stage_norms`, the next step's wording from the stage.
5. After closing: status portfolio; creates `portfolio_companies` and its initial `investments` row from the deal and its ИК-2 decision; creates a hidden row in the website's `portfolio` for the content editor.
6. Updates `public_status` and writes the journal.

**screening_complete**(deal): marks the screening done and moves the deal to meeting, as `completeScreening` does.

**deal_reject**(deal, reason, letter, comment, resubmit): status rejected and the `closed_*` fields; sets `applications.resubmit_after` (at once for a mandate reason, otherwise 6 or 12 months); sets `public_status = rejected`; emails the letter in the applicant's language; writes the journal.

**deal_pause**(deal, note, return_date), **deal_resume**(deal), **deal_withdraw**(deal, note): pausing stops the clock until the return date.

**deal_request**(deal, title, text, due, dd_questionnaire): adds a `deal_requests` row (waiting), sets `waiting` and, if not set yet, `paused_since`; a DD questionnaire ticks the checklist rows with `fulfilled_by = dd_questionnaire`; emails the applicant (phase 2: the request also appears in the cabinet).

**request_close**(request): the applicant answered or the analyst accepted it. When no request of the deal is still waiting: `waiting = false` and `paused_days` grows by the working days since `paused_since`.

**document_review**(document, accepted, reason) and **document_upload**(deal, title, file): status, version, who and when; journal.

**memo_new_version**(deal, file, note) and **memo_approve**(memo): the sponsor approves; the approval closes the sponsor's `memo_approval` task.

**The mandate check** stays in the panel (`checkMandate`): it only shows whether the application fits the rules. Its inputs are in ucode: the check range in `fund_settings`, the stages in `round_stages.in_mandate`, the geography in `countries.in_mandate`, and focus, licensed and excluded sectors in `industries.mandate`.

### 5.3 Functions: Инвесткомитет

**meeting_schedule**(body, stage, date, time, format, deal_ids):
1. Number: the body's last number plus one.
2. `materials_due` = the meeting date less `ic_materials_days` working days.
3. An attendance row for each member of the body, set to no_answer.
4. An agenda item for each deal: its company, amount and owner as speaker, and its latest memorandum.
5. `meeting_id` on each deal, and a task for the secretary to send the materials by `materials_due`.

**attendance_set**, **materials_send**: the second sets `materials_sent_at` and emails the members links that go through `download_file` (§7).

**meeting_start**: status live; members who did not confirm get the vote `absent`. **meeting_break** toggles a break.

**vote**(item, member, choice, note) works only while the meeting is live. The result follows the fund's rules, counted from `fund_settings`:
- fewer than `ic_quorum` present (not absent): no decision;
- a dissenting opinion is a veto: rejected;
- `ic_reject_at` (2) or more votes against: rejected;
- `ic_discussion_at` (1) vote against: the sponsor decides — sponsor_approved or rejected;
- otherwise approved, or approved_conditions when conditions are written.

The panel counts this for the screen (`tallyVotes`); `protocol_form` counts it again before saving.

**protocol_form**(meeting): every decision item must have an outcome.
1. The meeting becomes held, its protocol signing, and its result is set.
2. A `decisions` row for each decided item; the deal's journal gets `decision`.
3. The conditions of an approval become tasks for the deal's owner, or for the director when there is none: «до ИК-2» after ИК-1, «до подписания» after ИК-2.
4. Information items become noted.
5. An approval ticks the exit condition of the deal's ic1, ic2 or board stage (`fulfilled_by = ic_decision`). A refusal does not reject the deal by itself: the owner rejects it with a reason and a letter.

**protocol_sign**(meeting, file): protocol signed, file attached.

### 5.4 Functions: Портфель

**cycle_open**(quarter, due): a `quarter_reports` row for each active company; the request goes out (email now, the company's cabinet in phase 2); the automatic reminder date is set.

**report_received**(company, quarter, document, file): the document's date. Phase 1: the analyst uploads; phase 2: the company uploads in its cabinet.

**metrics_fill**: the figures from the fund's template (phase 1 typed in; later read from the XLSX), `metrics_state = check`, and a `report_check` task for the company's owner. **metrics_confirm** sets confirmed and closes the task.

**company_request_open**: a `company_requests` row and a `company_request` task for the owner; **company_request_answer** closes both.

**data_request**(company, text): a request in `company_data_requests` (batch 11), which the company answers in its startup cabinet, as «Запросить данные» does now.

**follow_on_open**(company): a deal in Сделки linked to the company, as «Открыть follow-on» does now.

The risk flags (runway, churn, revenue fall, late report) are counted from the latest confirmed quarter against `fund_settings`.

### 5.5 Functions: Работа, Настройки, the nightly job

**Tasks** (a trigger on `tasks`): an empty assignee becomes the director; a status change writes `task_events`; `done` sets `completed_at`; closing a recurring task creates the next one — due date a month or a quarter later, checklist unticked, `previous_id` set, event `recurred`.

**settings_save**(changes): the director only. Writes every changed value to `settings_journal`. The website's Focus page should read `fund_settings` rather than its own constants, so the published mandate and the one the check uses cannot drift apart again (§8, question 1).

**Reminders** (screens 02 and 03): every working day at 09:00 each employee gets an email with their Мой день, and the assignee of a task due this week gets a reminder.

**nightly_clock** runs every night at 01:00 Tashkent time:
- `days_used` of each active deal that is not waiting: working days from `stage_entered_at` to today, less `paused_days`;
- a deal past its norm: notifies its owner and the stage's `escalate_to` role;
- applications in inbox past their 2 working days;
- reporting reminders on `auto_reminder_at`;
- portfolio flags.

### 5.6 What the applicant sees

`applications.public_status` is set by the deal's functions and never moves back (system map: «Публичный этап не идёт назад»). The two versions in circulation are in §8, question 2. Both come from the same stages:

| Deal | System map (7) | Feedback document and website FAQ (4) |
| --- | --- | --- |
| inbox | Заявка отправлена | Awaiting review |
| screening | Скрининг | Awaiting review |
| meeting | Встреча | Reviewed |
| analysis, ic1, dd | Due diligence | Reviewed |
| ic2, board | Инвесткомитет | Reviewed |
| closing | Оформление | Accepted |
| portfolio | Портфель | Accepted |
| rejected | Отказ | Rejected |

Paused and withdrawn deals keep the status they had.

### 5.7 Read-only views

These are not tables. Each is a query: a ucode custom endpoint or one function that returns the shape the page already uses (`Dashboard`, `QueueItem[]`, `ScheduleItem[]`, `UpcomingItem[]`, `SectionCounters`), so the pages do not change.

| View | Made from |
| --- | --- |
| Мой день — Мои задачи | my open tasks (not those sent for review) due by a week from today, and those I closed today; from my deals: applications offered to me, next steps due within 5 wd, answers and documents from the cabinet to check |
| Мой день — Ждут моего согласования | tasks in review that I check; memorandums waiting for me as sponsor; screenings waiting for me as the second reviewer |
| Мой день — Расписание | today's meetings of ИК and НС; my deals' next steps set for an hour today |
| Мой день — Ближайшие сроки | planned meetings of the coming 14 days; stage deadlines of my deals (every deal for the director) within 7 days or past; the quarterly reports' due date within 14 days |
| Обзор — decisions waiting for me | my tasks with origin memo_approval or screening_confirm; approvals of contracts, acts and letters in phase 3 |
| Обзор — deadlines this week | meetings (the week's key event), deals' stage due dates, task due dates, the reporting due date; letters and payments in phase 3 |
| Обзор — funnel | deals by stage; overdue where `days_used` > norm |
| Сделки — register figures | counts by status and by rejection reason, received last month; reached = deals per stage in `deal_stage_history` |
| Sidebar counters | counts per section for the person |

## 6. Roles and permissions

ucode roles with table rights (read, create, update, delete), field rights and record rules. Taken from the system map's «Роли». A person can hold several roles.

| Role | Gets | Record rule |
| --- | --- | --- |
| director | everything, settings included; approves moves to the committee and payments | — |
| deputy | deals, committee, portfolio, tasks; finance read-only | — |
| analyst | all deals read; screening, requests, DD | writes deals where owner, second reviewer or a member of `deal_team` |
| manager | the portfolio in full; own deals and contracts | writes deals they own |
| ic_secretary | meetings, agenda, votes, protocols, letters | — |
| accountant | finance in full; the rest read-only | — |
| ic_member (outside) | agenda items and memorandums of meetings they sit on; their own vote | attendance row for them |
| founder (phase 2) | their application's status; requests and documents of their deal | `applications.email` = their email |
| portfolio_company (phase 2) | their company's reports, requests and documents | their company |
| website (API key) | creates `applications` and `partner_requests`; reads `portfolio`, `news`, `team`, `pages` | — |

A founder never reads `deals`. The cabinet shows `applications.public_status`, and `deal_requests` and `deal_documents` with only the fields meant for the applicant.

The panel hides buttons by role, but the rules that matter are checked inside the functions too: moving a stage, the protocol, saving the settings.

## 7. Files and the download watermark

The feedback document asks that a file downloaded from the CRM carry the name of whoever downloaded it, so a document that leaves the fund points to the person.

- ERP files live in a private folder. FILE fields hold the file's id, not a public link.
- Every download goes through **download_file**(file_id):
  1. Checks the person may read the record the file belongs to.
  2. Stamps each page of a PDF with the person's name, email, date and time and a download number: a light diagonal mark plus a footer line (pdf-lib). PPTX, DOCX and XLSX are converted to PDF first; originals are for the director only (§8, question 13).
  3. Writes **file_downloads**: file_id, file_name, table_slug, record_id, employee_id, downloaded_at, ip, download_no.
  4. Returns a link that works for a few minutes.
- The download number finds the row in `file_downloads`, so a leaked copy names the person even when the visible name has been cropped.
- **Pitch decks.** The website uploads them to ucode Files and keeps the returned `link`. If that link opens without a token, every deck is readable by anyone who has its address. Check this, and move the decks to the private folder.

## 8. To decide before building

1. **The mandate exists in four versions.** The automatic check rejects by its numbers, so one has to be chosen:
   - Настройки (the fund's documents): $50K–$300K, pre-seed and seed;
   - the old site (system map, question 1): $200K–$2M, up to Series A;
   - the feedback document: $150K–$500K, seed and pre-Series A, 5–15%;
   - the new website's Focus page: $50K–$500K, seed and pre-Series A, 5–15%.

   Recommendation: one `fund_settings` row that both the site and the check read.
2. **What the applicant sees:** four statuses (feedback document, website FAQ) or seven (system map). §5.6 maps both. Recommendation: store the seven; the site can group them into four.
3. **Industries.** The website offers 11 sectors (fintech, ai, saas, …). The panel holds free-text niches («Цифровые чеки», «Онлайн-ставки»), and its excluded-industry check looks for «онлайн-ставки», which the form can never send. Recommendation: the `industries` table with a mandate mark, the niche as free text the analyst writes, and the anti-thesis (crypto, LLM wrappers, …) judged in screening rather than checked automatically.
4. **Two numbers for one application.** The site gives the founder a random reference (SQBV-2026-7K3QX9); the panel numbers deals in sequence (SQBV-2026-0173). Recommendation: keep both — the reference for the founder, since it cannot be guessed, the number for the register — and show the reference on the deal's card.
5. **Who gets a new application:** analysts in turn, by sector, or the director assigns each one.
6. **Outside committee members and accounting** (system map, question 3): if members vote in the system, they need ucode users with the ic_member role; otherwise the secretary records their votes, as the panel does now.
7. **The second reviewer on screening** (system map, question 5): the panel blocks the move without one; Notion has no such rule. Keep it?
8. **After a committee decision**, does the deal move by itself? Recommendation: no — the approval ticks the exit condition and the owner moves the deal, because a condition from the protocol may still be open.
9. **The ИК-2 norm:** the panel counts 10 working days (`STAGE_NORMS.ic2`); the system map says «до заседания».
10. **Founder sign-in:** the feedback document asks to show a login and password after submitting. Recommendation: a one-time code to the email — no password is shown or sent. The website already tells the founder their login was emailed.
11. **Partner requests:** who handles them in the panel — a task for the director, or a list of their own?
12. **Обзор's money in phase 1:** kept by hand in `fund_money`, or Финансы connected in phase 1 as well.
13. **Watermarking files that are not PDF:** convert to PDF for everyone, or also let some roles download originals.

## 9. Connecting this repo

Done on 18 October 2026, as described below: every phase 1 section reads and writes ucode with the signed-in person's token, and the sample data and localStorage stores are gone (README, «Data»; ucode-migration.md, «Status»). The state changes are still worked out in the panel and written as plain updates; moving them into the functions of §5 is next, together with the permissions of §6.

- Each module's service already returns promises in the page's types (`src/modules/*/services/index.ts`). Replace their bodies with ucode calls and keep the types; put the row ↔ type mapping next to each service, as the website does in `mappers.ts`.
- Add `src/shared/api/ucode/`: base URL, the signed-in person's token and its refresh (`POST /v2/auth/refresh`), CRUD over `/v2/items/{table}`, file upload, and calls to the functions of §5.
- Signing in: `useSession` signs in through ucode, `useCurrentUser` reads the `employees` row of the token's user, and the sidebar's person switch goes away.
- Remove `SAMPLE_TODAY` (`src/shared/constants/system/sample.ts`) so «today» is the real date, and drop the localStorage stores, keeping `subscribe` so the pages reload after a change.
- Order of work:
  1. employees, roles and sign-in; `fund_settings`, `stage_norms`, `industries`, `reject_reasons`, `holidays`;
  2. applications → deals, the deal's card and its functions;
  3. tasks and Мой день;
  4. Инвесткомитет;
  5. Портфель;
  6. Обзор;
  7. phase 2: the startup cabinet.
- **Moving the data in.** The work lives in Notion today (system map, «Сейчас»): the deal register, portfolio companies, committee protocols, tasks. Export them and import into the tables above (ucode imports Excel and inserts many rows at once) before the panel replaces Notion.

What was checked about ucode: field and relation types, roles and permissions, email-code login and the routes above come from its open-source code (`Ucode-io/ucode-opensource`); the items and files calls come from the website's working client. Confirm in the hosted project: functions triggered on table events, scheduled functions (for `nightly_clock`), sending email from a function, and private file storage.

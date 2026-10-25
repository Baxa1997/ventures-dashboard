# Startup cabinet and website connections — what to build

The task spec for the next phase. Part A covers the startup cabinet, where a founder follows the application, answers the fund's requests and sends documents. Part B covers the website pages that still need to be connected to the data the fund keeps in the panel.

Written on 24 October 2026, against the panel at `0ea30d1`, the website at `738edf1` and the ucode test project (batches 1–9). Related docs:

- [ERP.md](ERP.md) is the original design (phase 2 = the cabinet).
- [ucode-migration.md](ucode-migration.md) has every table and field as created; it wins where this file differs.
- [how-it-works.md](how-it-works.md) describes the panel as the fund uses it.

Field names below are ucode slugs. Values in `code` are the exact values to write.

**Status, 25 October 2026.** Part A is built, as a separate app in the venture folder, `venture/startup-cabinet` (React + TypeScript like this panel, with a small Node server of its own), instead of inside the website repo as §2 recommended; everything else in §2 holds: ucode only on the cabinet's server with the project key, a signed httpOnly session cookie, no ucode user per founder. Its README lists what each page reads and writes.

- Decisions taken: D1 (a), a one-time code to the email (needs SMTP; in development the code is shown on the page); D2, four statuses with the stage under them; D3, the fund's files hidden; D4, `answered`; D5, uploads allowed into «Другие документы»; D6, never back; D10, uz/ru/en. D7, D8 and D9 are left for later.
- Batch 10 is created in the test project: `founder_codes` and `deal_questionnaires` (ucode-migration.md).
- The panel: P1 (answered requests with «Принять» / «Запросить ещё»), P2 (`is_dd_questionnaire` written and read), P3 (the questionnaire's answers on its request), P4 (the preview's wording), P6 (the applicant named in История), P7 (answers and documents from the cabinet in Мой день), P8 (Сделки and Портфель read again when the person returns to the tab), P9 (a quarter's files from the company in Квартальная отчётность). P5 was done on 24 October.
- Also built, on 25 October (batch 11): the members (D9: the CEO adds the startup's people with roles; each signs in with a code to their own email), withdrawing the application (D7), the fund's data requests to a portfolio company reaching its cabinet, sessions that end on sign-out (a revoked sign-in), old sign-in codes cleaned up, and the cabinet reading the account again when the founder returns to the tab. A deal the fund rejected makes the cabinet read-only.
- Not done: letters (D8, left out on purpose for now), deploying the cabinet (its address, Vault, SMTP), pointing the website's `FOUNDER_ACCOUNT_URL` at it, and the production rollout of batches 1–11. Part B is unchanged.

---

## 1. Where things stand

```
 Website sqbvc.uz (Next.js server)      Admin panel admin.sqbvc.uz (browser)      Startup cabinet (to build)
   project API key, server-side           the staff member's ucode token
             │                                        │
             ▼                                        ▼
 ───────────────────────────── one ucode project, the same tables ─────────────────────────────
```

| Part | State | Writes | Reads |
| --- | --- | --- | --- |
| Website | Live | Pitch Us form: `applications`, then the deal in the inbox (`deals`), the pitch deck (`deal_documents`), the first journal entry (`deal_events`), and `applications.public_status = submitted`. Become a partner form: `partner_requests` | `portfolio`, `news`, `team` and `pages`; the fund's lists (industries, rounds, sources, countries); `stage_norms` and `holidays` |
| Admin panel | Live on the test project | Everything done to a deal, including `applications.public_status` and `resubmit_after` | All ERP tables |
| Startup cabinet | Built (`venture/startup-cabinet`), not deployed | The answers to requests, the founder's documents, the questionnaire, a company's reports, metrics and requests (its README) | The application's status, its deal's requests and the founder's own documents; after the investment, the company's quarter |

**What the website already promises the founder:**

- After Pitch Us, the website shows «Sign in to your Founder Account with {email}» and a button to `/account/login?email=…`. The live build sets `FOUNDER_ACCOUNT_URL=/account/login` in the Makefile, so the button is shown. **No such route exists, so the button ends on the not-found page.** This was read from the code; I could not open the live site from here.
- The FAQ promises four statuses (Awaiting review, Reviewed, Accepted, Rejected).
- It promises a longer questionnaire after the first review, a data room for DD, and letters by email.

**The panel's side:** the panel already draws the founder's view of a request in «Так видит заявитель» (deal → «Запросы и документы»), with the note «Кабинета заявителя пока нет». The cabinet should look like that card.

**Environments:**

- admin.sqbvc.uz and the test site use the ucode test project, where batches 1–9 exist.
- The live sqbvc.uz uses another project, whose key is in Vault, and batches 1–9 are not there.
- Before the cabinet goes live, the batches (and batch 10 below) must be rolled out to production, and the panel and the site must point at the same project.

---

# Part A — the startup cabinet

## 2. Architecture (recommended)

Build the cabinet **inside the website repo**, at `/[lang]/account/…`, with its own API routes `/api/account/*`.

- **The route is already expected.** The links already point there.
- **The pieces exist in the website.** It has uz/ru/en, the design, the server-side ucode client, file upload, the same-origin check, rate limits and body-size limits (`withApi`).
- **ucode stays on the server.** Every ucode call is made by the server with the project API key. The browser only calls `/api/account/*`.
- **The server decides what a founder sees.** It may read `deals`, but each route returns only the fields listed in this file. That keeps the rule «a founder never reads `deals`» (ERP.md §6) without ucode record rules, which are not set up: the staff roles have broad access today.
- **No ucode user per founder.** The ucode auth service may reserve a paid seat per user (ucode-migration.md, «Staff sign-in»).

**Session:**

1. After sign-in (decision D1), the server sets an httpOnly, Secure, SameSite=Lax cookie.
2. The cookie holds a signed session: the email and an expiry, signed with HMAC under a new secret, `ACCOUNT_SESSION_SECRET`.
3. Every `/api/account/*` route reads the session and finds the founder's rows from the email.
4. The browser never sends a deal id. Any request or document id it sends is checked against the session's deal.

**The alternative from ERP.md §2:** ucode users with `EMAIL_OTP` and their own tokens. That needs a FOUNDER client type, a login table, record rules on six or more tables, and possibly paid seats. It is not recommended now.

## 3. Who the founder is, and which rows are theirs

| What | How to find it |
| --- | --- |
| The founder | `applications.email`, in lower case, as the website stores it |
| Their application | The latest `applications` row with that email, by `submitted_at`. One email can have several: a rejected startup applies again after `resubmit_after`. Older applications are shown read-only as history |
| The deal | The `deals` row whose `applications_id` is the application's `guid` |
| The deal's requests, documents and journal | `deal_requests`, `deal_documents` and `deal_events` where `deals_id` is the deal |
| A request's files for the founder | `attachments` where `deals_id` is the deal, `section` is `request` and `item_id` is the request's guid |
| Who asked | `employees` where `guid` is `deal_requests.sent_by_id`: `full_name` and `position` |
| After the investment | `portfolio_companies` where `deals_id` is the deal |

- A deal entered by hand in the panel («Новая сделка») has no application, so it has no founder and no cabinet.
- ucode list filters on text fields match parts of a value. The website's email check works around this. **Always compare exactly after reading.**

## 4. Overview: the application's status

### 4.1 Where the status comes from

The panel writes `applications.public_status` when the deal changes (`publicStatusOf` in `src/modules/Deals/services/ucode.ts`). The cabinet only reads it.

| The deal | `public_status` | Shown, 7 steps (system map) | Shown, 4 steps (website FAQ) |
| --- | --- | --- | --- |
| Just applied; Входящие (`inbox`) | `submitted` | Заявка отправлена | Awaiting review |
| Скрининг | `screening` | Скрининг | Awaiting review |
| Встреча | `meeting` | Встреча | Reviewed |
| Анализ, ИК-1, Детальный DD | `due_diligence` | Due diligence | Reviewed |
| ИК-2, Набсовет | `committee` | Инвесткомитет | Reviewed |
| Закрытие | `closing` | Оформление | Accepted |
| In the portfolio | `portfolio` | Портфель | Accepted |
| Rejected | `rejected` | Отказ | Rejected |

How it moves:

- It only moves forward through the seven steps. «Вернуть на этот этап» in the panel does not move it back.
- `rejected` can be set at any time. If the fund reopens a rejected deal, the status follows the stage again.
- While a deal is paused or withdrawn, the status keeps its last value.
- A stage the fund added in Настройки shows the status of the system stage before it.
- `public_status_at` holds when the status last changed.
- `withdrawn` is one of the field's options, but nothing writes it (see D7).

### 4.2 What the Overview shows

- **Header:** the company (`applications.startup_name`), the reference (`applications.ref`, e.g. SQBV-2026-7K3QX9) and the date applied (`submitted_at`). The deal number (SQBV-2026-0173) is the fund's register number, not the founder's.
- **Progress bar:** 4 or 7 steps (decision D2), with the date from `public_status_at`.
- **Expected time:** shown only when the current stage's `stage_norms.is_public` is ticked. It is the stage's norm (`norm_days`, or `norm_text`) and the expected date (`deals.stage_due`).
- **What is wanted from the founder:** the number of open requests and the nearest deadline, linking to Requests (§5).
- **When rejected:**
  - the reason: the `reject_reasons` row of `deals.reject_reasons_id`, in `label_ru`, `label_uz` or `label_en` by the founder's language;
  - the fund's letter: `deals.closed_letter`, written in the panel's reject dialog;
  - when they may apply again, from `applications.resubmit_after`. If that date is today or earlier, link to Pitch Us; the website's duplicate check already lets the email apply.

**Never show:** the owner, scores, notes, risks, the memorandum, committee data, terms, the deal's own days or norms (except as above), `deals.facts` or the journal itself.

## 5. Requests (Запросы)

### 5.1 What the fund does in the panel

On the deal, the fund opens «Запросы и документы» → «Новый запрос» and fills in:

- title, text and deadline;
- optionally the box «Это DD-вопросник по шаблону фонда»;
- templates ticked from Настройки → «Шаблоны документов»;
- later, more files and links under «Шаблоны и файлы для заявителя».

The panel then writes these rows:

| Table | Row |
| --- | --- |
| `deal_requests` | `title`, `text`, `sent_by_id` (employee guid), `sent_at` (date), `due_date`, `status` = `waiting`, `answer` = `''`, `closed_at` = null, `warning`, `deals_id`. `is_dd_questionnaire` is **not written yet** (P2) |
| `attachments` | One row per file or link the founder gets: `section` = `request`, `item_id` = the request's guid, `deals_id`, `kind` (`link` or `file`), `title`, `url`, `file_id`, `added_by_id`, `added_at`. A template is a copy: it keeps the template's `url` and has an empty `file_id` |
| `deals` | `waiting` = true, and `paused_since` = today if the deal was not waiting already: the stage clock stops while the fund waits for the founder |
| `deal_events` | `kind` = `request`, `title`, `stage`, `at`, `employee_id` |

### 5.2 What the cabinet shows

**Open requests** (`status` = `waiting`), nearest deadline first. Each shows:

- the title and the text;
- «Запросил: {full_name}, {position} · {sent_at}»;
- «Ответить до {due_date}» and the working days left, counting `holidays`. Highlight it once the date has passed;
- the request's attachments, under «Скачайте, заполните и приложите к ответу». Each opens in a new tab;
- the button «Ответить и приложить файл».

**Answered or closed requests** (`answered`, `accepted`) show the title, the founder's answer, the files they sent (the documents whose `deal_requests_id` is this request) and the date it closed.

### 5.3 The founder answers

The answer is a text and/or files, with at least one of them. Accept PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, ZIP and images, up to 20 MB each (like the pitch deck) and at most 10 files.

`POST /api/account/requests/{id}/answer` does what the panel's own «Ответ получен» does (`answerRequest` in `src/modules/Deals/services/index.ts`), in this order:

1. **Check the request.** It must belong to the session's deal and still be `waiting`. Otherwise answer 409.
2. **Upload the files.** Each file goes to ucode Files (`POST /v1/files/folder_upload`, folder e.g. `Cabinet`). Keep `id` and `link`. Store the link as a full URL: `https://cdn.u-code.io/<link>` when ucode returns a path (see P5).
3. **Add one `deal_documents` row per file:**

   | Field | Value |
   | --- | --- |
   | `title` | the file name without its extension |
   | `version` | the highest `version` of a document of the deal with that title, plus 1 |
   | `status` | `review` |
   | `file`, `file_id` | the full URL and the ucode Files id |
   | `uploaded_by` | `applicant` |
   | `uploaded_by_id` | `''`: empty means it came from the cabinet |
   | `uploaded_at` | now (ISO) |
   | `deal_requests_id` | the request |
   | `deal_folders_id` | null: the top of the data room |
   | `deals_id` | the deal |

4. **Close the request.** Set `status` = `answered` (decision D4), `answer` = the text and `closed_at` = today in Tashkent.
5. **Restart the clock if nothing else waits.** If no other request of the deal is `waiting`:
   - `deals.waiting` = false;
   - `deals.paused_days` += the working days after `paused_since` up to today (as `workingDaysAfter` counts them);
   - `deals.paused_since` = null.
6. **Write the journal.** Add a `deal_events` row: `kind` = `answered`, `title` = the request's title, `stage` = the deal's stage, `at` = now, `employee_id` = `''`.

**If a step fails,** delete what this call already created (files and rows) and answer 502, so that a retry does not leave duplicates.

Once a request is answered, it is read-only in the cabinet. More files go through Documents (§6). If the fund needs more, it sends a new request: «Запросить заново» in the data room does this.

**What the panel shows afterwards:**

- The request is closed. Today `answered` is read as closed (see P1).
- The answer text, and the files at the top of the data room as «На проверке», tied to the request.
- A journal entry without a person (see P6).
- The stage clock runs again.

The panel reads ucode when a page opens, so staff see the answer after reopening the deal.

## 6. Documents (Документы)

**What the founder sees.** Only their own documents: `deal_documents` with `uploaded_by` = `applicant`. That is the pitch deck, the files sent with answers, and the files uploaded here.

- The fund's own files (`uploaded_by` = `fund`, and older rows with it empty) stay hidden (decision D3).
- The data room's folders (`deal_folders`) are how the fund arranges things internally, and are not shown. Group the founder's documents by request (`deal_requests_id`), then «Другие документы».

**Status shown for each document:**

| Status | Label |
| --- | --- |
| `review` | На проверке |
| `accepted` | Принят |
| `rejected` | Отклонён, with the reason from `deal_documents.reason` |
| `required` | Нужно загрузить. The panel does not create such rows today |

**«Загрузить новую версию»** on a rejected document adds a new `deal_documents` row:

- the same `title`;
- `version` + 1;
- `status` = `review`;
- the same `deal_requests_id`;
- the other fields as in §5.3 step 3.

The old row stays, so every version keeps its author and time. Add a `deal_events` row as well: `kind` = `document`, `title`, `result` = `uploaded`, `employee_id` = `''`.

**«Загрузить документы»** without a request (decision D5) adds the same row with `deal_requests_id` = null.

The founder never deletes; the fund deletes in the panel.

## 7. The questionnaire (Анкета) — needs batch 10

The website promises that teams invited further «fill in a longer questionnaire in the Founder Account: team and cap table, metrics, market, finance and risks».

**What exists today:**

- A request can be marked as the DD questionnaire («Это DD-вопросник по шаблону фонда»). That ticks the DD exit conditions it fulfils (`fulfilled_by` = `dd_questionnaire`).
- The flag itself is not stored (P2).
- No table holds the answers.

**Proposal:**

- **Table.** A new table, `deal_questionnaires`, holds the answers (§11).
- **Questions.** The questions live in the cabinet's code at first, in the sections team and cap table, metrics, market, finance and risks. They can become a list in Настройки later.
- **When it opens.** The questionnaire opens when the deal has a `waiting` request with `is_dd_questionnaire` = true.
- **While filling in.** Answers are saved as they are typed (`answers`, `updated_at`), so the founder can come back.
- **Sending.** «Отправить» sets `submitted_at` and answers that request exactly as in §5.3, steps 4–6.
- **In the panel.** The panel shows the answers on the request (P3).

## 8. After the investment: the company's cabinet (phase 2b)

When the deal joins the portfolio (`public_status` = `portfolio`), the cabinet also shows the company: `portfolio_companies` where `deals_id` is the deal. These tables exist (batches 4 and 8).

### Quarterly reports

**What is asked.** The quarter asked for is the latest `reporting_cycles` row (`quarter` such as `2026-Q3`, `due`). The panel creates it with the first «Напомнить компаниям». The documents to send are the active `report_documents` rows. Each has a template to download (`file_url`, `file_name`).

**Sending a document** writes its arrival day to the company's `quarter_reports` row for that quarter. Create the row if it is missing (`portfolio_companies_id`, `quarter`, `metrics_state` = `none`).

- The four system documents have their own columns: `fund_template_at`, `company_template_at`, `form1_at` and `form2_at`.
- A document the fund added goes into `received`, a JSON text of `{slug: "YYYY-MM-DD"}`.
- **The file itself has no agreed place yet.** Proposal: an `attachments` row with `portfolio_companies_id`, `section` = `report` and `item_id` = `<quarter>:<slug>`. The panel then lists it (P9).

### Metrics

- The founder enters a value for each active `portfolio_metrics` row (`format` is `usd`, `percent`, `months` or `number`).
- Each value is a `metric_values` row: `portfolio_companies_id`, `portfolio_metrics_id`, `quarter`, `value`.
- Saving sets `quarter_reports.metrics_state` = `check` and `filled_at` = today.
- The fund confirms in the panel, which sets `confirmed`. After that the quarter is read-only for the company.

### Requests to the fund

- The founder opens one as a `company_requests` row: `title`, `note`, `opened_at` = today, `status` = `waiting_fund`, `portfolio_companies_id`.
- The fund answers in the panel: `status` = `closed`, `answer`, `answered_at`. The cabinet shows the answer.
- **Done (batch 11):** when the fund asks a company for data («Запросить данные»), the request (`company_data_requests`) reaches the company's cabinet, which answers it with a text and files; the answer waits on the company's card for «Принять».

## 9. Rules the cabinet keeps

- **Access.** All ucode calls are on the server. Each route returns only the fields this file lists, and every id is checked against the session's deal or company.
- **Writes.** Write only the rows and fields in §5–§8. Never write:
  - `public_status`, except for a withdrawal (D7);
  - any `deals` field other than `waiting`, `paused_days` and `paused_since`;
  - anything in screening, committee or portfolio figures beyond §8.
- **Values.** ucode does not check pick-list or STATUS values; it stores any text. Write only the values in this file.
- **Dates.** A date is `YYYY-MM-DD` in Asia/Tashkent: use the website's `tashkentDate`. A DATE_TIME is ISO; a DATE comes back as `…T00:00:00Z`, so take its first ten characters.
- **Working days.** They are Monday to Friday, plus the `holidays` rows (`is_workday` marks a working Saturday), as the website's `addWorkingDays` counts them. The panel's own deadlines skip weekends but not holidays yet, so the same date can show a different number of days left.
- **JSON.** JSON fields are text columns: send `JSON.stringify(value)`.
- **Ids.** A `guid` sent with a new row is kept, so the server can create related rows under its own ids.
- **Files.** Files are open to anyone who has the link (decided on 22 October). Store full URLs, and do not promise founders confidentiality until private storage (ERP.md §7) is built.
- **Limits.** Reuse `withApi` for the same-origin check, rate limits and body size. Keep a separate limit for sign-in attempts.
- **Languages.** The cabinet has uz, ru and en, like the site. List names come from `name_ru`, `name_uz` and `name_en` (`label_*` for rejection reasons). Texts the fund typed (requests, letters) are shown as written.

## 10. Changes needed in the panel

| # | Change | Why |
| --- | --- | --- |
| P1 | Show `answered` requests as «Ответ получен — проверьте», with «Принять» (sets `accepted`) and «Запросить ещё» (a new request). Today `toRequest` reads `answered` as closed | So the fund checks what came from the cabinet |
| P2 | Write and read `deal_requests.is_dd_questionnaire` (RequestDialog → `addRequest` → `ucode.ts`) | The cabinet must know which request opens the questionnaire |
| P3 | Show the questionnaire's answers on its request | After batch 10 |
| P4 | Once the cabinet is live, replace «Кабинета заявителя пока нет…» in «Так видит заявитель» | The text becomes wrong |
| P5 | **Fixed on 24 October.** The website stored pitch-deck links as paths without the server (all 5 applications and 4 applicant documents in the test project), so «Открыть» in the data room pointed at admin.sqbvc.uz. The website now stores the full address (`uploadFile`, `UCODE_FILES_URL`), and the panel completes the older paths when it reads a document (`fileUrl` in `src/shared/api/ucode`). The cabinet should use the same rule for old rows | The pitch deck didn't open from the panel |
| P6 | A journal entry with an empty `employee_id` is shown as «Заявитель» (History uses `personName`, which gives an empty name today) | Entries from the cabinet |
| P7 | Мой день → «К выполнению»: list answered requests and documents «На проверке» of my deals | Staff learn that the founder answered |
| P8 | A way to see new answers without reopening the deal (a refresh, or reload on focus) | The panel reads ucode on open only |
| P9 | Портфель: show a quarter's files from the company, and the company's own requests as they arrive | §8 |

## 11. Schema changes — batch 10 (proposal)

Send this to ucode in the format of the earlier batches (ucode-migration.md), after decisions D1, D8 and D9.

| Table / field | Fields | For |
| --- | --- | --- |
| `founder_codes` (Startup cabinet folder) | `email`, `code_hash`, `expires_at` (DATE_TIME), `attempts` (NUMBER), `used_at` (DATE_TIME), `ip` | One-time sign-in codes, if D1 is (a). The code is stored in ucode so that every container of the site sees it |
| `deal_questionnaires` (Startup cabinet folder) | `answers` (JSON), `sections_done` (NUMBER), `submitted_at` (DATE_TIME); relations to `deals` and `deal_requests` | §7 |
| `cabinet_members` (Startup cabinet folder, later) | `email`, `full_name`, `role` (PICK_LIST: `ceo`, `cfo`, `cto`, `other`), `is_active`, `added_at`; relation to `applications` | More people from the startup (D9) |
| `deal_requests.notified_at`, `deal_documents.notified_at` (DATE_TIME) | — | Letters sent once (D8) |
| `applications.founder_user_id` | exists already | Used only if D1 is (c) |

The website content tables of §12 (`faq`, `site_settings`) go into the same batch.

---

# Part B — the website (landing page) connections

## 12. Page by page

| Page | Today | Should come from | Task |
| --- | --- | --- | --- |
| Pitch Us (`/apply`) | Done: the form's lists come from the fund's lists, an application opens its deal, and the deck's link is stored in full (P5) | — | After the cabinet: nothing, since the success screen already links to it |
| Founder Account links (header, Основателям, Pitch Us) | Point to `/account/login`, which does not exist | The cabinet | Part A |
| Основателям (`/startups`) | Timeline, documents list and the four statuses are written in `src/modules/Founders/constants` | Timeline: `stage_norms` (`norm_days`, `is_public`). Statuses: the same set as the cabinet (D2) | Read the norms; keep the status names in one place for the site and the cabinet |
| Инвестфокус (`/focus`) | Stage, amount, instrument, stake, sectors, anti-thesis and geography are written in `src/modules/Focus/constants` | `fund_settings` (`check_min`, `check_max`, `stake_min_pct`, `stake_max_pct`, `instruments`), `round_stages.in_mandate`, `industries.mandate`, `countries.in_mandate` | Only after the fund chooses its mandate (ERP.md §8, question 1). The mandate fields of `fund_settings` are empty now |
| Портфель (`/portfolio`, `/portfolio/[id]`) | The website's `portfolio` table (or sample data) | The panel's `portfolio_companies`, linked to a `portfolio` row (ERP.md planned `site_portfolio_id`). Nothing links them now | On «Перевести в портфель», create a hidden `portfolio` row. On the company's card, add «На сайте»: visible, tagline and quote per language, founder, order |
| О фонде (`/about`) | The website's `team` table | `team`, edited from the panel | «Контент → Команда» edits `team` (name, position, photo, LinkedIn, order, visible), or a «Показывать на сайте» mark on employees that writes it |
| Аналитика / Новости (`/news`, press, reports) | The website's `news` table; no editor | `news` | «Контент → Новости»: title, excerpt and body per language (HTML; the panel already has CKEditor), category, date, image, outlet and link, published |
| Контакты (`/contacts`) | FAQ in `src/modules/Contacts/constants`. Address and email in `src/shared/config/site.ts`, where **the email is a placeholder, `info@sqbventures.example`** | New `site_settings` (one row: email, phone, address per language, map link, social links) and `faq` (page, question and answer per language, order, published) | «Контент → Адрес» and «Контент → FAQ», as the client's list of 22 October asks |
| Legal pages (`/legal/[slug]`) | The website's `pages` table | `pages` | «Контент → Страницы»: title and body per language, published |
| Become a partner | Writes `partner_requests` (`status`, `owner_id`, `note` exist) | — | A list in the panel: status new / in work / closed, owner, note |

## 13. How changes reach the site

- Pages are prerendered and read ucode again at most every `UCODE_REVALIDATE_SECONDS` (300 s).
- `POST /api/revalidate` with the header `x-revalidate-secret` refreshes them at once, by tag: `portfolio`, `news`, `team`, `pages` or `form-options`.
- The panel runs in the browser and must not hold that secret.
- **Recommendation:** accept five minutes at first, and say «На сайте появится в течение 5 минут» on the panel's «Контент» screens. Later, a ucode function on those tables can call the webhook.
- The new content tables need their own tags (`faq`, `site`), added to `CONTENT_TAGS`.

---

## 14. Decisions to take

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| D1 | How a founder signs in | (a) A one-time code to the application's email, sent by the site. (b) A password shown once after Pitch Us, as the feedback document asked; demo mode already shows one. (c) ucode users with `EMAIL_OTP` | **(a)**. It needs an email sender (SMTP or a service), which the letters of D8 need anyway. (b) works without email, but a lost password then needs the fund to reset it. (c) brings seats and permissions |
| D2 | Statuses shown | 4 (the website FAQ) or 7 (the system map). All 7 are stored either way | **4** as the main bar, as the FAQ already promises, with the step's name as a detail line |
| D3 | Does the founder see the fund's own files? | Hidden; or shown when the fund marks them (a new `deal_documents.shared` field) | **Hidden** for now. Add `shared` if the fund wants to give founders, say, a term sheet |
| D4 | What an answer from the cabinet does | (a) `answered`: closed for the clock, the fund accepts it later (P1). (b) Stays open until the fund accepts | **(a)**. Once the founder answers, it is the fund's turn, so the founder's clock should not keep waiting |
| D5 | Uploads without a request | Allowed into «Другие документы», or not | **Allowed.** The fund files them into folders |
| D6 | Can the public status go back? | Never; or follow the deal | **Never**, as now («Публичный этап не идёт назад») |
| D7 | Can the founder withdraw from the cabinet? | «Отозвать заявку» sets `deals.status` and `public_status` to `withdrawn` and writes `withdrawn` to the journal | **Later**, not in the first version |
| D8 | Letters to the founder | When a request is made, before its deadline, when a document is rejected, when the status changes, the rejection letter | Send them from the website's server: every few minutes it finds rows with `notified_at` empty and sends the letter. The panel stays as it is. Needs the sender of D1 (Настройки → Интеграции → Mail) |
| D9 | Several people from one startup | Members with roles (the October prototype had them) | **Later** (`cabinet_members`) |
| D10 | Cabinet languages | uz/ru/en like the site, or Russian only like the panel today | **uz/ru/en.** The founder chose a language on the site (`applications.locale`) |

## 15. Order of work, and how to check each step

| Step | Build | Check |
| --- | --- | --- |
| 1. Sign-in and status | `/[lang]/account/login` (with `?email=` filled in), the session, Overview (§4) | Apply on Pitch Us and sign in: «Awaiting review». In the panel take it into screening: still Awaiting review, step Скрининг. Complete screening: Reviewed. Reject with a reason and a letter: the reason, the letter and the date to apply again |
| 2. Requests | §5, and P1 and P6 in the panel | In the panel, «Новый запрос» with a template: it appears in the cabinet with the template to download. Answer with two files. In the panel: the request answered, two documents «На проверке» tied to it in the data room, a journal entry, the clock running again |
| 3. Documents | §6 | Reject a document in the panel with a reason. The cabinet shows the reason. Upload a new version: the panel shows v2 «На проверке» |
| 4. Questionnaire | Batch 10, §7, P2, P3 | A request marked as the DD questionnaire opens the questionnaire. Leave and come back: the answers are kept. «Отправить» answers the request, and the DD exit condition is ticked |
| 5. Letters | D8 | Each event of D8 sends one letter, once |
| 6. Company cabinet | §8, P9 | After «Перевести в портфель»: send a quarter's documents and metrics; the panel shows them to confirm |
| In parallel | §12 website content, the production rollout of batches 1–10 | Edit in the panel: the site shows it within five minutes |

## 16. Known gaps that affect this work

- **Staff sign-in.** Only `Sqb-admin` can sign in to the panel; there are no STAFF users yet. That is enough for testing.
- **Rules.** The panel checks its rules in the browser. The cabinet's server must check its own; it cannot rely on the panel.
- **Email and Telegram.** Neither is connected (D1, D8).
- **Files.** Files are open by link (§9).
- **Holidays.** The panel's deadlines skip weekends only (§9).
- **Production.** The live site's project has none of the ERP tables yet (§1).

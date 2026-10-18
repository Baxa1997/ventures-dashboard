# SQB Ventures — fund operating platform

React 19, TypeScript, Vite, Tailwind CSS 4, React Router and i18next (Russian, Uzbek, English).

## Commands

```bash
yarn install
yarn dev          # http://localhost:3000
yarn type-check
yarn build
```

Node 22.23.1 and Yarn 1.22.22, as in `.nvmrc` and `package.json`.

## Structure

- `src/main.tsx` — entry point
- `src/app/` — providers (router, translations, global styles)
- `src/modules/` — feature modules; `src/modules/index.tsx` holds the route tree
- `src/shared/` — layout, shared components, hooks, helpers, constants, types, translations
- `src/assets/` — fonts, images, styles (design tokens are in `styles/tailwind.css`)

Each module follows the same layout:

```
modules/Work/
   components/   UI used by more than one page of the module
   constants/
   helpers/
   hooks/
   locales/      ru, uz, en — merged into src/shared/i18n
   pages/        one folder per page, each with its own components, constants, helpers, hooks, validations
   services/     data access
   index.tsx     the module's routes
```

## Design

The screens follow the ERP V2 design (Figma file "SQB VC Website"). Colours, type sizes and the Golos Text font are set as tokens in `src/assets/styles/tailwind.css`. The sidebar is `src/shared/layout/Sidebar`; every page starts with `PageHeader` and puts its content in `PageBody` (both in `src/shared/components`). There is no top bar on wide screens; below the `lg` breakpoint the sidebar becomes a drawer opened from a slim bar.

Every page uses the same two distances, set as tokens in `styles/tailwind.css`: `p-page` (15px) around the page's content and the header, and `gap-section` (12px) between its blocks — filters, cards and columns.

Three rules hold for every page, each with a shared component in `src/shared/components`:

- A page fills the height of the window. `PageBody` takes the rest of the page under the header; a page with little content lets its main card grow to the bottom (see Мой день and Задачи) instead of leaving the page half empty.
- Search and filters above a list go in `FilterBar`, a white bordered panel.
- A `Modal` keeps its title and its buttons in view and scrolls only the content between them: put the content in `ModalBody` and the buttons in `ModalFooter` (a form wraps both with `MODAL_FORM`, as in the task form).
- Cards side by side end level. A grid of columns lets its cells stretch (no `items-start`), and a column of cards uses `STACK` (from `Card.tsx`), whose last card grows to the column's height; an empty card centres its `NoData`.

Motion is set as tokens in `styles/tailwind.css`: cards and filter panels rise into place (`animate-rise`, one after another inside `stagger` groups and `STACK` columns), bars fill from their start (`animate-fill`), chart columns grow from the axis (`animate-grow`), and dialogs and menus pop open (`animate-pop`). People whose system asks for reduced motion get none of it, and printing turns it off.

Other shared pieces: `Tabs` (under a page header), `FilterSelect`, `SearchField`, `BadgeSelect` (a status changed in place), `Table` with the `TH`/`TD` cell classes, `StatTile` (one headline figure), `FactList` (label–value rows), `CheckList` (a checklist the system or a person ticks), `Person` (an employee's initials and short name), `ChoiceCards` (a radio group drawn as cards), `Progress`, `Badge`, `Field`.

## Pages

Вход (`/login`, `src/modules/Auth`) is the sign-in page, ported from the prototype's `admin/login.html`. It keeps the brandbook look of that page (gradient with the "V" pattern, Mulish), set as the `brand` tokens in `styles/tailwind.css`. ucode checks the login (or work email) and password (see «Data»). Every other page needs a sign-in: without one it redirects to `/login`, and after signing in the person lands on the page they asked for. "Выйти" is in the user menu of the sidebar.

The section "Работа" (`/work`) is built:

- Обзор (`/work/overview`) — the fund overview: decisions that wait for the signed-in person, deadlines of the coming work week, the fund's money, the deal funnel and the portfolio. "Выгрузить для НС" opens the browser's print dialog for the page.
- Мой день (`/work/my-day`) — what the person has to do (work that comes from their deals, plus their tasks), what they wait for from others, and their deals.
- Задачи (`/work/tasks`) — tabs, search and filters, the table and the card of the chosen task: checklist, history, the next step, comments. A task can be attached to a deal or a portfolio company, chosen in the form, and its card links to it. The address keeps what is open: `?tab=mine`, `?task=<id>`, and `?new=1` opens the form for a new task.

The section "Сделки" (`/deals`, `src/modules/Deals`) is built:

- The list (`/deals`) has four tabs, kept in the address as `?tab=`:
   - Входящие (`inbox`) — applications waiting for a decision, each checked against the mandate, and the card of the open one: take it into screening, ask for data, or reject it.
   - Воронка (`funnel`, the default) — deals in work grouped by stage, with the fund's own deadline on each. A stage tile filters the table to that stage.
   - Отказы и пауза (`closed`) and Все сделки (`all`) — the register, with its figures on the second.
   - `?new=1` opens the form for a deal entered by hand. "Экспорт в Excel" saves the rows the tab shows, after its filters, as a CSV file.
- A deal's card (`/deals/<id>`, tab in `?tab=`) has seven tabs: Обзор, Скрининг и оценка (`screening`), Запросы и документы (`requests`), Due diligence (`dd`), Меморандум (`memo`), Решения ИК и НС (`decisions`), История (`history`). The two buttons in the header belong to the open tab.
- Three dialogs in `src/modules/Deals/components`: rejection with a reason, moving a deal to the next stage (possible only when the stage's exit conditions are met) and a request to the applicant.

The other sections are built from screens 12–25 of the design. Each keeps its tab in the address (`?tab=`). Финансы, Договоры, Закупки, Корреспонденция and Документы (phase 3, screens 17–23) were built too, on sample data; they are removed from the panel until their tables exist in ucode, and come back from the repository's history (before the commit that removed them).

- Инвесткомитет (`/committee`, `src/modules/Committee`) — Заседания ИК (the next meeting with its agenda and who confirmed, the register of meetings, decisions to carry out), Наблюдательный совет, Реестр решений, Состав и договоры. "Открыть заседание" opens the meeting page (`/committee/<id>`): the secretary records the votes and drafts the protocol; the fund's rules turn the votes into a result (one vote against — the sponsor decides, two — refusal, a dissenting opinion — veto); "Сформировать протокол" sends the decisions to the register, to the deals' cards (Решения ИК и НС) and turns approval conditions into tasks. Materials of a deal on the agenda are counted from its readiness list.
- Портфель (`/portfolio`, `src/modules/Portfolio`) — Компании, Квартальная отчётность (documents by quarter, the figures from the fund's template confirmed in a dialog), Запросы компаний, Пилоты с SQB; a company's card (`/portfolio/<id>`) with seven tabs. "Запросить данные" creates a task for the company's owner; "Открыть follow-on" creates an application in Сделки. The risk flags read their thresholds from Настройки. The tables show the reporting quarter and the two before it.
- Настройки (`/settings`) — Мандат и нормативы (only the director saves; every change goes to the journal), Пользователи и роли (staff with their role in the system and their duties, the rights matrix; «Пригласить пользователя» adds an employee), Справочники (the industries with their place in the mandate, rejection reasons, sources), Интеграции. The mandate's check range and the stage norms given in days are what Сделки use for the mandate check, the rejection letter and the deadlines (`mandateLimits` and `stageNorm` in `src/modules/Deals/helpers`).

## Data

The fund's backend is a ucode project (`docs/ERP.md` is the model, `docs/ucode-migration.md` what exists in ucode). The panel holds no data of its own: every section reads and writes ucode's tables with the signed-in person's token. A fresh project is empty, and so are the pages, apart from the reference rows (industries, rejection reasons, stage norms, settings).

### Signing in

- Copy `.env.example` to `.env.local` and fill in `VITE_UCODE_PROJECT_ID`, `VITE_UCODE_ENVIRONMENT_ID` and `VITE_UCODE_CLIENT_TYPE_IDS`: public ids, not secrets, so they go into builds too. Without them the sign-in page says the panel is not connected.
- The sign-in page sends the login (or work email) and password to ucode (`src/shared/api/ucode`). A user belongs to one client type, so the client types are tried in the order given: STAFF (the fund's staff), then ADMIN (ucode's own admin users). The session keeps the person's tokens (`src/shared/hooks/useSession.ts`) and refreshes them; when they cannot be refreshed, the person is signed out. "Не выходить на этом устройстве" keeps the session in localStorage; without it, it lasts until the tab is closed.
- Who is signed in is their `employees` row: the one whose `user_id` is their ucode user (`src/shared/hooks/useCurrentUser.ts`). The employees rows are the team everywhere (`TEAM`), and the pages wait until they are read. A user without a row is shown by their login, with the least access. The director's checks (saving the rules, inviting, recording a meeting) look at the role.
- Staff users: «Пригласить пользователя» in Настройки adds the employees row; `node scripts/ucode/auth.mjs user <email> <role> "<Full name>"` makes the ucode user (it may take a paid seat of the ucode plan) and links that row by its email. `auth.mjs link <login> <role> "<Full name>"` gives an existing ucode user a row: in the test project, ucode's admin `Sqb-admin` is linked as the director, so the panel can be used before staff users exist.

### What each section reads and writes

- Настройки: `fund_settings` (the mandate and the flags), `stage_norms`, `settings_journal`, `employees`, `industries`.
- Сделки: the deal tables of batch 2 (`src/modules/Deals/services/ucode.ts`), applications from the website among them: the website's Pitch Us form opens a deal in the inbox, with the pitch deck and the «Из заявки» facts. Every change — a deal entered by hand, taken, screened, moved, asked for a document, declined — is worked out by the service and then written; the register's figures are counted from the deals. Taking, moving and declining a website deal set `applications.public_status`, which never goes back, and declining sets `resubmit_after`, after which the website accepts a new application from the same email.
- Работа: `tasks`, `task_checklist`, `task_events`. Closing a recurring task creates its next occurrence, a month or a quarter later; a task without an assignee goes to the director. Мой день, the week's deadlines, Обзор and the sidebar counters have no tables: they are counted from the deals, the portfolio, the meetings and the tasks (ERP.md §5.7). Мой день brings in an application offered to the person, the next step of a deal they own when it is due within 5 working days, a memorandum waiting for them as its sponsor and a screening decision waiting for them as the second reviewer; ticking such an item is kept in this browser. Обзор's money is the one row of `fund_money`, kept by the chief accountant until Финансы are connected; until it exists, Обзор says so.
- Инвесткомитет: `committee_members`, `meetings`, `meeting_attendance`, `agenda_items`, `votes`, `decisions`. Forming a protocol writes the decisions to the register, which the deals' cards read, and turns approval conditions into tasks (`origin: ic_condition`) for the deal's owner, shown in Задачи and Мой день.
- Портфель: `portfolio_companies`, `investments` (what a company has invested is their sum), `quarter_reports`, `pilots`, `company_requests`, `reporting_cycles`. Until the fund first requests a quarter's reports there is no cycle row: the last closed quarter is shown, due on the 25th of the month after it (`REPORTS_DUE_DAY` in `src/modules/Portfolio/constants`), and "Запросить отчёты" creates the row.
- Each service keeps what it read in a store (`createStore` in `src/shared/helpers/store.ts`), loaded by the pages with `useServiceData`; a change is shown at once and written to ucode, and if ucode refuses it, the data is read again and a notice says so (`src/shared/layout/Failure.tsx`). Signing out drops every store.
- "Today" is the real date (`todayISO` in `src/shared/helpers`).
- An application's mandate verdict is computed by rules (`checkMandate` in `src/modules/Deals/helpers`), not stored. The check range and the stage norms come from Настройки; the excluded industries and the stages of ИК and the board keep their rules in `MANDATE` and `STAGE_NORMS` (`src/modules/Deals/constants`).
- There is no file storage yet: uploading "от имени фонда" records only the file's name, and the download links are switched off (ERP.md §7).

### Checking against ucode

`UCODE_LOGIN=<login> UCODE_PASSWORD=<password> node scripts/ucode/panel-test.mjs --write-test-rows` signs in through the panel's own sign-in and runs every section's service against the project of `.env.local`, reading back what each step wrote; it deletes every row it made and puts the settings back. The user needs an employees row with the director's role. Run it against the test project only.

## Translations

Texts use the Russian phrase as the key. Add a string to the `ru`, `uz` and `en` files of the module (or of `src/shared/i18n`); a key missing from `uz` or `en`, or a key that does not exist, fails `yarn type-check`.

- A phrase may contain dots and colons: key and namespace separators are switched off in `src/shared/i18n/index.ts`.
- A phrase with a number has the forms `_one`, `_few`, `_many` and `_other` (Russian needs all four; Uzbek and English repeat theirs) and is called by its base key: `t('{{count}} сделка', { count })`.
- Sample content (task titles, company names, notes) is data and is not translated.

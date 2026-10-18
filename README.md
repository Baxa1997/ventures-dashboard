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

Вход (`/login`, `src/modules/Auth`) is the sign-in page, ported from the prototype's `admin/login.html`. It keeps the brandbook look of that page (gradient with the "V" pattern, Mulish), set as the `brand` tokens in `styles/tailwind.css`. Every other page needs a sign-in: without one it redirects to `/login`, and after signing in the person lands on the page they asked for. "Выйти" is in the user menu of the sidebar.

The section "Работа" (`/work`) is built:

- Обзор (`/work/overview`) — the fund overview: decisions that wait for the signed-in person, deadlines of the coming work week, the fund's money, the deal funnel and the portfolio. "Выгрузить для НС" opens the browser's print dialog for the page.
- Мой день (`/work/my-day`) — what the person has to do (work from deals, the portfolio and letters, plus their tasks), what they wait for from others, and their deals.
- Задачи (`/work/tasks`) — tabs, search and filters, the table and the card of the chosen task: checklist, history, the next step, comments. The address keeps what is open: `?tab=mine`, `?task=<id>`, and `?new=1` opens the form for a new task.

The section "Сделки" (`/deals`, `src/modules/Deals`) is built:

- The list (`/deals`) has four tabs, kept in the address as `?tab=`:
   - Входящие (`inbox`) — applications waiting for a decision, each checked against the mandate, and the card of the open one: take it into screening, ask for data, or reject it.
   - Воронка (`funnel`, the default) — deals in work grouped by stage, with the fund's own deadline on each. A stage tile filters the table to that stage.
   - Отказы и пауза (`closed`) and Все сделки (`all`) — the register, with its figures on the second.
   - `?new=1` opens the form for a deal entered by hand. "Экспорт в Excel" saves the rows the tab shows, after its filters, as a CSV file.
- A deal's card (`/deals/<id>`, tab in `?tab=`) has seven tabs: Обзор, Скрининг и оценка (`screening`), Запросы и документы (`requests`), Due diligence (`dd`), Меморандум (`memo`), Решения ИК и НС (`decisions`), История (`history`). The two buttons in the header belong to the open tab.
- Three dialogs in `src/modules/Deals/components`: rejection with a reason, moving a deal to the next stage (possible only when the stage's exit conditions are met) and a request to the applicant.

The other sections are built from screens 12–25 of the design. Each keeps its tab in the address (`?tab=`):

- Инвесткомитет (`/committee`, `src/modules/Committee`) — Заседания ИК (the next meeting with its agenda and who confirmed, the register of meetings, decisions to carry out), Наблюдательный совет, Реестр решений, Состав и договоры. "Открыть заседание" opens the meeting page (`/committee/<id>`): the secretary records the votes and drafts the protocol; the fund's rules turn the votes into a result (one vote against — the sponsor decides, two — refusal, a dissenting opinion — veto); "Сформировать протокол" sends the decisions to the register, to the deals' cards (Решения ИК и НС) and turns approval conditions into tasks. Materials of a deal on the agenda are counted from its readiness list.
- Портфель (`/portfolio`, `src/modules/Portfolio`) — Компании, Квартальная отчётность (documents by quarter, the figures from the fund's template confirmed in a dialog), Запросы компаний, Пилоты с SQB; a company's card (`/portfolio/<id>`) with seven tabs. "Запросить данные" creates a task for the company's owner; "Открыть follow-on" creates an application in Сделки. The risk flags read their thresholds from Настройки.
- Финансы (`/finance`, `src/modules/Finance`) — Капитал и размещение, Бюджет и отчётность, Фактические данные, Платежи. Everything is counted from the statements' data in `services/sample.ts`: the budget's fact is the sum of the operation categories tied to its lines, the operating budget left for the year comes from it, and the money free for deals is the accounts less approved payments, the follow-on reserve and that operating budget. Assigning a category to an operation moves the P&L, the budget and the free money at once. A payment can be passed to the bank only when all its bases are ticked.
- Договоры (`/contracts`, `src/modules/Contracts`) — one register with five tabs and filters; a contract's card (`/contracts/<id>`). For № 22/26-ABACUS the limit's use is counted from its acts and orders, and the director agrees or returns the month's act; a new order is refused when the limit cannot cover it.
- Закупки (`/procurement`) — the tenders with their six steps (the stage follows the steps; the commission's step needs at least five members), the commission and protocols, suppliers.
- Корреспонденция (`/correspondence`) — letters with filters; a letter opens with its next step (sign out a draft with its number, take into work, close — closing needs a number, an answer date and an owner); the monthly reports under ПП-59 and the control plan. The sidebar counter is the number of letters where the next move is the fund's.
- Документы (`/documents`) — Корпоративные, Приказы, HR, Шаблоны; other sections link to a document with `?doc=<id>`, which marks it. "Новый приказ" numbers the order.
- Настройки (`/settings`) — Мандат и нормативы (only the director saves; every change goes to the journal), Пользователи и роли (staff, roles, the rights matrix), Справочники, Интеграции. The mandate's check range and the stage norms given in days are what Сделки use for the mandate check, the rejection letter and the deadlines (`mandateLimits` and `stageNorm` in `src/modules/Deals/helpers`).

## Data

Each module's `services` folder starts from the sample data in its `sample.ts` (the content of the design) and keeps what a person changes in the browser's localStorage. The methods return promises, so they can be replaced with API calls without changing the pages.

### Сделки on ucode

The fund's backend is a ucode project (`docs/ERP.md`, `docs/ucode-migration.md`). Сделки can run on its test environment:

```bash
echo "UCODE_API_KEY=<the test project's API key>" >> .env.local   # git-ignored
yarn dev
```

- The dev server forwards `/ucode` to the ucode admin API and adds the key (`vite.config.ts`), so the browser never holds it. Without the key, and in every `yarn build`, the panel runs on the sample data as before.
- The deals then come from ucode's tables (`src/modules/Deals/services/ucode.ts`), applications from the website among them: the website's Pitch Us form opens a deal in the inbox, with the pitch deck and the «Из заявки» facts. Every change in Сделки — a deal entered by hand, taken, screened, moved, asked for a document, declined — is worked out by the same service as before and then written to ucode; if ucode refuses it, it is undone. The register's figures are counted from the deals.
- A deal from the website carries the applicant's status: taking, moving and declining it set `applications.public_status`, which never goes back, and declining sets `resubmit_after` (at once for a mandate reason, otherwise in 6 or 12 months), after which the website accepts a new application from the same email.
- "Today" is the real date with ucode, not `SAMPLE_TODAY`.
- Still on sample data: the other sections, the employees (the ids written as owners are the sample's `e1`…), and signing in. ERP.md §9 has the order; staff signing in to ucode then replaces the dev server's key.

- The sample data is a snapshot of the fund on 2 October 2026, and its texts name dates around that day. The pages therefore treat that day as "today": see `SAMPLE_TODAY` in `src/shared/constants/system/sample.ts` and `todayISO` in `src/shared/helpers`, the one place to change when the data becomes live.
- Deals: the register holds 486 deals, of which the sample has 32: the ones the design shows, plus three assigned applications that its counters imply (the design names 9 of the 12 incoming ones). The register's figures (tab counters, the bar, conversion, rejection reasons) are stored and adjusted with every change, so they stay right for deals that are not loaded. Content of a deal's card exists where the design has it: EasyTap (overview, memorandum), Apicore (screening), NeuroFin (requests and documents), MoonAI (due diligence), Toklaps (exit conditions). Other deals show what follows from their basic data.
- An application's mandate verdict is computed by rules (`checkMandate` in `src/modules/Deals/helpers`), not stored. The check range and the stage norms come from Настройки; the excluded industries and the stages of ИК and the board keep their rules in `MANDATE` and `STAGE_NORMS` (`src/modules/Deals/constants`).
- "Мой день" and "Обзор" read the deals from the Deals service, and Обзор reads the money from Финансы and the portfolio from Портфель, so they follow what happens in those sections.
- Where a tab's count in the design is larger than what the screens show or imply (ИК meetings 7 and decisions 16, protocols 4, suppliers 6, orders 12, HR documents 9), the tab keeps the design's number and the list says how many of them the sample has. Records that are not on any screen were not made up, with two exceptions: ИК № 6.2 (Tezbor's approved follow-on, which Финансы rely on) and the two board meetings, which follow from the decisions other screens show. Clockster's quarterly figures are made up for the sample, so that its report has figures to confirm.
- The design's P&L has one slip: its expense lines for the third quarter add up to 780, not the 760 it prints; the page adds the lines up itself.
- There is no file storage: uploading "от имени фонда" records only the file's name, and the download links are switched off.
- Closing a recurring task creates its next occurrence, a month or a quarter later.
- A task without an assignee goes to the director.
- Signing in is a stand-in as well: any email and password are accepted, and the form opens filled in (`src/shared/hooks/useSession.ts`). "Не выходить на этом устройстве" keeps the sign-in in localStorage; without it, it lasts until the tab is closed.
- Who the signed-in person is does not depend on the email yet: the user block at the bottom of the sidebar opens a menu to switch between the director, an analyst, the project manager and the committee's secretary (`src/shared/hooks/useCurrentUser.ts`, `SIGN_IN_IDS` in `src/shared/constants/system/user.ts`). The same menu holds the interface language.
- To start again from the sample data, clear the site's localStorage (keys starting with `sqbv_dashboard_`). The stores of the new sections are made with `createStore` in `src/shared/helpers/store.ts` and loaded with `useServiceData` in `src/shared/hooks`.

## Translations

Texts use the Russian phrase as the key. Add a string to the `ru`, `uz` and `en` files of the module (or of `src/shared/i18n`); a key missing from `uz` or `en`, or a key that does not exist, fails `yarn type-check`.

- A phrase may contain dots and colons: key and namespace separators are switched off in `src/shared/i18n/index.ts`.
- A phrase with a number has the forms `_one`, `_few`, `_many` and `_other` (Russian needs all four; Uzbek and English repeat theirs) and is called by its base key: `t('{{count}} сделка', { count })`.
- Sample content (task titles, company names, notes) is data and is not translated.

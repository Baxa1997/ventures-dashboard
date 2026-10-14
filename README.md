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

Other shared pieces: `Tabs` (under a page header), `FilterSelect`, `FactList` (label–value rows), `ChoiceCards` (a radio group drawn as cards), `Progress`, `Badge`, `Field`.

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

The other sidebar sections (Инвесткомитет, Портфель, Финансы, Договоры, Закупки, Корреспонденция, Документы, Настройки) open a placeholder (`src/modules/ComingSoon`) with the section's purpose until their screens are built.

## Data

There is no backend yet. Each module's `services` folder starts from the sample data in its `sample.ts` (the content of the design) and keeps what a person changes in the browser's localStorage. The methods return promises, so they can be replaced with API calls without changing the pages.

- The sample data is a snapshot of the fund on 2 October 2026, and its texts name dates around that day. The pages therefore treat that day as "today": see `SAMPLE_TODAY` in `src/shared/constants/system/sample.ts` and `todayISO` in `src/shared/helpers`, the one place to change when the data becomes live.
- Deals: the register holds 486 deals, of which the sample has 32: the ones the design shows, plus three assigned applications that its counters imply (the design names 9 of the 12 incoming ones). The register's figures (tab counters, the bar, conversion, rejection reasons) are stored and adjusted with every change, so they stay right for deals that are not loaded. Content of a deal's card exists where the design has it: EasyTap (overview, memorandum), Apicore (screening), NeuroFin (requests and documents), MoonAI (due diligence), Toklaps (exit conditions). Other deals show what follows from their basic data.
- An application's mandate verdict is computed by rules (`MANDATE` in `src/modules/Deals/constants`, `checkMandate` in its helpers), not stored. Stage norms in working days are `STAGE_NORMS` in the same constants.
- "Мой день" and "Обзор" read the deals from the Deals service, so "Мои сделки" and the funnel on the overview follow what happens in the section.
- There is no file storage: uploading "от имени фонда" records only the file's name, and the download links are switched off.
- Closing a recurring task creates its next occurrence, a month or a quarter later.
- A task without an assignee goes to the director.
- Signing in is a stand-in as well: any email and password are accepted, and the form opens filled in (`src/shared/hooks/useSession.ts`). "Не выходить на этом устройстве" keeps the sign-in in localStorage; without it, it lasts until the tab is closed.
- Who the signed-in person is does not depend on the email yet: the user block at the bottom of the sidebar opens a menu to switch between the director and an analyst (`src/shared/hooks/useCurrentUser.ts`, `SIGN_IN_IDS` in `src/shared/constants/system/user.ts`). The same menu holds the interface language.
- To start again from the sample data, clear the site's localStorage (keys `sqbv_dashboard_work_v2`, `sqbv_dashboard_deals_v1`, `sqbv_dashboard_user` and `sqbv_dashboard_session`).

## Translations

Texts use the Russian phrase as the key. Add a string to the `ru`, `uz` and `en` files of the module (or of `src/shared/i18n`); a key missing from `uz` or `en`, or a key that does not exist, fails `yarn type-check`.

- A phrase may contain dots and colons: key and namespace separators are switched off in `src/shared/i18n/index.ts`.
- A phrase with a number has the forms `_one`, `_few`, `_many` and `_other` (Russian needs all four; Uzbek and English repeat theirs) and is called by its base key: `t('{{count}} сделка', { count })`.
- Sample content (task titles, company names, notes) is data and is not translated.

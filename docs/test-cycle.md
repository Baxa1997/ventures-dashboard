# Full test cycle

One pass through everything the website and the panel can do today: a startup applies, the fund takes the deal through screening, due diligence and the investment committee into the portfolio, and the work around it (tasks, Мой день, Обзор, Портфель, Настройки) follows. Run it against the **ucode test project** only. A full pass takes about an hour.

Each step says what to do and, after →, what you should see. Write down every step where you see something else (see «Reporting» at the end).

Button names are given as the panel shows them in Russian. The panel can be switched to Uzbek or English in the user menu (bottom left); step 16 checks that.

## 0. Before you start

**Where**

- Panel: `yarn dev` in this repo, then http://localhost:3000. `.env.local` must hold the test project's ids (see `.env.example`).
- Website: the `sqb-ventures-website` repo, run locally against the same test project: in its `.env.local` set `UCODE_API_KEY` to the test project's API key (ucode → Settings → API keys), then `yarn dev -p 3100`. The application form is at http://localhost:3100/ru/apply. Do **not** use the live site (sqbvc.uz): it runs the old code and another ucode project.
- ucode admin: https://app.u-code.io, project SQB Ventures, to look at the rows the panel writes and to add what has no screen yet. The panel's tables are in Admin (Админ-панель), split into Сделки, Инвесткомитет, Портфель, Задачи and Настройки и справочники; the website's are in Сайт (Landing page). Names show in the language chosen in the ucode admin.

**Who**

- Sign in to the panel as `Sqb-admin` (the password comes from the project owner). In the panel this user is «Администратор», the director.

**Data that has no screen yet**: add it in the ucode admin before the steps that need it. Name every test record with `ZZ` so it is easy to find and delete afterwards.

| Needed for | Table (folder in Admin) | What to add |
| --- | --- | --- |
| step 4, the second reviewer | — | done in the panel: Настройки → Пользователи и роли → «Пригласить пользователя», name `ZZ Аналитик`, any email, role «Аналитик» |
| step 12, the fund's money | Настройки и справочники → `fund_money` (Деньги фонда) | one row: `as_of` today, `capital` 10000000, `on_accounts` 3000000, `approved_unpaid` 300000, `follow_on_reserve` 500000, `operating_left` 400000, `plan_year` 2026, `plan_direct_deals` 1500000 |
| step 13, a portfolio company | Портфель → `portfolio_companies` (Компании портфеля) and its tables | a company `ZZ Portfolio Co` (`owner_id` = the guid of «Администратор» in `employees`, `instrument` safe, `since` 2025, `current_note` any text); in `investments` two rows for it (`amount` 100000 and 50000); in `quarter_reports` one row (`quarter` 2026-Q3, `fund_template_at` and `form1_at` some October dates, `metrics_state` check, `mrr` 12000, `runway` 9); in `company_requests` one row (`title`, `opened_at`, `status` waiting_fund); in `pilots` one row (`title`, `customer` SQB, `status` in_progress) |

## 1. Sign-in

1. Open http://localhost:3000/deals while signed out → the sign-in page opens.
2. Enter `Sqb-admin` and a wrong password, «Войти» → «Неверный логин или пароль».
3. Enter the right password, keep «Не выходить на этом устройстве» ticked → you land on Сделки (the page you asked for); the sidebar shows «Администратор · Директор».
4. Reload the page → still signed in.
5. The sidebar shows Обзор, Мой день, Задачи, Сделки, Инвесткомитет, Портфель, Документы (under «Фонд») and Настройки. Open http://localhost:3000/finance → «Страница не найдена».

## 2. A startup applies (website)

1. On http://localhost:3100/ru/apply fill in the form: company `ZZ Startup A`, a real email you can reuse (e.g. `zz.a@example.com`), industry FinTech, stage Seed, amount 150000, attach a small PDF as the pitch deck, send → the done screen shows a reference like `SQBV-2026-XXXXXX` and promises an answer by email (no login: the founder's cabinet comes later).
2. In ucode, `applications` → the new row with that reference, `public_status` = `submitted`.
3. Fill in the form again with the same email → it is refused with a message that this email has already applied.
4. «Стать партнёром» form (if you test it): the request appears in `partner_requests` in ucode. The panel does not show partner requests yet.

## 3. Входящие

1. Panel → Сделки → «Входящие» → `ZZ Startup A` is there with the next deal number (`SQBV-2026-000N`), the amount, the source «Сайт» and a mandate verdict.
2. Open its card → Обзор shows «Из заявки» with what the form sent; «Запросы и документы» shows the pitch deck «на проверке».
3. Back in Входящие, choose the owner `ZZ Аналитик` in the card's owner select (so that step 4 can use «Администратор» as the second reviewer).
4. «Взять в скрининг» → the deal leaves Входящие and appears in «Воронка» on Скрининг, with «Осталось 5 р.д.» (or the norm set in Настройки). In ucode `applications`, `public_status` = `screening`.
5. Also enter one deal by hand: Сделки → «Новая сделка», company `ZZ Manual B`, fill the fields, «Добавить» → it appears in Входящие, offered to you; it will be used in step 10.

## 4. Скрининг

1. Open `ZZ Startup A` → tab «Скрининг и оценка». For each of the 7 criteria choose a score 1–5 and write a reason → the counter goes up to «заполнено 7 из 7». A score without a reason does not count.
2. «Второй оценщик» → choose «Администратор» (the owner is `ZZ Аналитик`, so you can).
3. Open Мой день → «Подтвердить решение по скринингу» for `ZZ Startup A` is in your list (you are its second reviewer).
4. Back on the deal, the decision is «Встреча»; «Завершить скрининг» → the deal moves to Встреча; the history tab has the screening and the stage move. In ucode, `public_status` = `meeting`.
5. (The same move is possible from Обзор → «Перевести в «Встреча»»: the window lists the exit conditions, and «Перевести» stays off until both are met. An unmet score links to the scoring tab; the second reviewer is chosen in the window itself, and with nobody else in the team the window links to Настройки to invite someone.)

## 5. Through the stages

1. On the deal's Обзор: «Перевести в «Анализ»» → the window shows no conditions for this stage → «Перевести» → Анализ. `public_status` = `due_diligence`.
2. «Перевести в «ИК-1»» → ИК-1. `public_status` stays `due_diligence`.

## 6. Запросы и документы

1. Tab «Запросы и документы»: the pitch deck → «Принять» → it is accepted, the history has an entry. Try «Отклонить» on another document if there is one: a reason is required.
2. «Новый запрос»: title `ZZ Финмодель`, text, due date → the request is «ждём ответа»; on Воронка the deal shows «Ждём заявителя» (the stage clock stands).
3. «Загрузить от имени фонда», pick any file → a document with that name appears as accepted (only the name is kept: there is no file storage yet).
4. The founder cannot answer a request yet (that is the cabinet, phase 2), so the request stays open.

## 7. Due diligence

1. Tab «Due diligence» → «Добавить направление»: name `ZZ Юридический DD`, executor, due date → the line appears «не начато».
2. «Передать исполнителю» → it is handed over with today's date.

## 8. Инвесткомитет: ИК-1

1. Инвесткомитет → «Состав и договоры» → «Состав пока пуст». «Добавить члена ИК» three times: `ZZ Член 1` with Роль «председатель ИК», `ZZ Член 2` and `ZZ Член 3` «независимый член» → the three are listed, the chair first. Clicking a name opens it again; «Вывести из состава» takes a member off the list.
2. On `ZZ Startup A` (at ИК-1): «Следующий шаг» explains the stage and has «Вынести на заседание» (Инвесткомитет → «Заседания ИК» also lists it under «Ждут заседания» when no meeting is planned) → it opens «Назначить заседание» with Тип **ИК-1** and `ZZ Startup A` ticked → pick a date from today on → «Назначить» → the meeting page.
3. → «Подготовка к заседанию» lists four steps: the agenda (done), at least 3 members (done), who will come (not done), the materials (until the date shown). «Открыть заседание» is off.
4. Under «Отметить, кто из них будет» set each member to «Будет» → 3 of 4 done, «Открыть заседание» is on. «Добавить сделку» adds another deal waiting for ИК-1 to the agenda.
5. Back on the deal → the next step now says «Открыть ИК № N · date» and leads to the meeting. Обзор → «Сроки на неделю» shows the meeting if it is this week.
6. «Разослать материалы» → «материалы разосланы» with today's date.
7. «Открыть заседание» → «Кворум есть: 3 из 3 членов»; the votes appear.
8. For `ZZ Startup A` record three «За», fill «Условия одобрения» (`ZZ Предоставить отчётность`) → the result box says the question is approved → «Зафиксировать одобрение» → «Решение зафиксировано: одобрено с условиями».
9. Try the rules on a copy if you have a second item: one «Против» → the decision goes to the sponsor (a window asks the sponsor's decision); two «Против» → refusal; one «Особое мнение» → veto. «Изменить решение» takes a decision back while the meeting is open.
10. «Сформировать протокол» → the meeting is held, protocol «на подписи».
11. → «Реестр решений» has the decision (ИК № N, the subject with the amount, «Одобрено с условиями»).
12. → the deal's tab «Решения ИК и НС» shows it.
13. → Задачи has a task `ZZ Startup A: ZZ Предоставить отчётность` for the deal's owner, due «до ИК-2», linked to the deal; Инвесткомитет → «Исполнение решений» lists it. «Отметить выполненным» closes it in both places.

## 9. ИК-2, board, closing, portfolio

A committee stage is left only after its committee's approval: before step 8, «Перевести в «Детальный DD»» on `ZZ Startup A` shows «Получить одобрение: ИК-1 — Решения пока нет» with a link to the deal's meeting (or «Вынести на заседание»), and «Перевести» is off.

1. On the deal: «Перевести в «Детальный DD»» (the ИК-1 approval of step 8 meets its condition), then «Перевести в «ИК-2»» → `public_status` = `committee`.
2. Repeat step 8 from 2 with Тип **ИК-2** (no conditions this time) → «Одобрено». Only then «Перевести в «Наблюдательный совет»» is on.
3. «Перевести в «Наблюдательный совет»», then hold a board meeting the same way with Орган «Наблюдательный совет» → «Одобрено».
4. «Перевести в «Закрытие»» → `public_status` = `closing`.
5. «Перевести в портфель» → the deal's status is «В портфеле», `public_status` = `portfolio`. (The portfolio company is not created yet: see «Known gaps».)

## 10. Rejection and applying again

1. Open `ZZ Manual B` (step 3.5) → «Отказать с причиной»: reason «Нет подтверждённого спроса», a letter, resubmit «через 6 месяцев» → the deal is in «Отказы и пауза» with the reason.
2. On the website, apply as `ZZ Startup C` with a new email → it appears in Входящие.
3. Reject it from Входящие with a mandate reason («Вне мандата: …») → resubmit is «сразу» by default. In ucode its application has `public_status` = `rejected` and `resubmit_after` = today.
4. Apply again with `ZZ Startup C`'s email → accepted at once, a new deal in Входящие.
5. Reject that new deal with «Нет подтверждённого спроса» and «через 6 месяцев» → apply again with the same email → refused, and the message names the date six months on.
6. In ucode, set that application's `resubmit_after` to yesterday → apply again → accepted.

## 11. Задачи

1. Задачи → «Новая задача»: title `ZZ задача`, «Связано с» = «Сделка» → a second select lists the deals; save without choosing → it is refused; choose `ZZ Startup A`; assignee «Администратор»; due date in 3 days; priority high; «Повтор» monthly; checklist two lines → «Сохранить».
2. The task is in «Мои» and «Все открытые»; its card shows «Сделка: ZZ Startup A» as a link to the deal.
3. «Взять в работу» → «В работе»; tick one checklist item; «Комментарий» → it shows in the history.
4. «Изменить» → set «Проверяет» = `ZZ Аналитик` → save. Close it → it goes to «На проверке» instead (somebody else checks it).
5. Set it to «Завершена» → a new occurrence appears, due a month later, checklist unticked, history «Создана автоматически после закрытия предыдущей».
6. «Удалить» twice on the copy → it is gone.
7. Sidebar counters: «Задачи» counts your open tasks, «Мой день» what waits for you.

## 12. Мой день and Обзор

1. Мой день → «Нужно сделать вам»: your tasks, deal steps due within 5 working days, decisions waiting for you. Tick an item that comes from a deal → it moves to the end until tomorrow (kept in this browser only).
2. «Ждёте от других»: open requests to applicants on your deals (step 6.2 if the deal is yours), tasks you check that are «Ждёт ответа».
3. «Мои сделки»: the active deals you own, the furthest stage first.
4. Обзор → «Требуют вашего решения», «Сроки на неделю», «Воронка по стадиям» (counts match Сделки), «Портфель».
5. «Деньги фонда»: before the `fund_money` row → «Остатки фонда ещё не внесены…»; after it → free money 1.8M of 3M on the accounts (3 000 000 − 300 000 − 500 000 − 400 000).

## 13. Портфель

Needs the company of step 0.

1. Портфель → «Компании»: `ZZ Portfolio Co`, «Вложено» $150 000 (the sum of its investments); the tiles count companies and reports.
2. Before any request the reporting period is the last closed quarter, due on the 25th of the next month. «Запросить отчёты» → «Отправить напоминание» → in ucode a `reporting_cycles` row; the tile shows «срок … · напоминание <today>».
3. «Квартальная отчётность»: the company's documents for the quarter, and its figures «Заполнено из шаблона …» → «Проверить» → «Подтвердить показатели» → «Подтверждены».
4. «Запросы компаний»: the request waits for the fund (the sidebar «Портфель» counter is 1) → answer it → closed, the counter goes to 0.
5. «Пилоты с SQB»: the pilot with its status.
6. Open the company's card → its seven tabs; «Запросить данные» with a text → a task for the company's owner, linked to the company, in Задачи. «Открыть follow-on» → a new deal for the company in Сделки → Входящие.

## 14. Настройки

1. «Мандат и нормативы»: set Чек `$50 000 – $300 000`, Стадии `Pre-seed, Seed`; change the screening norm to `6 · публично`; change «Churn за квартал выше» → «Сохранить» → «Журнал изменений» lists each change with old and new value.
2. Сделки → Входящие: a deal asking more than $300 000 now gets «Чек выше $300K»; a new screening deadline counts 6 working days.
3. Put the values back and save.
4. «Пользователи и роли»: «Администратор» (Директор, Полный); `ZZ Аналитик` «добавлен <date>, ещё не входил».
5. «Справочники»: the 11 industries with their place in the mandate, the rejection reasons, the sources.

## 15. Документы

1. Фонд → Документы → four tabs: Корпоративные, Приказы, HR, Шаблоны, each with its count.
2. «Добавить документ»: save with no name → refused; name `ZZ Устав`, a note, «Кем утверждается» Участник, a link that is not a link (`abc`) → refused; a real link (`https://…`) → saved → it is on Корпоративные as «Черновик», with «Открыть файл».
3. Click its name → change Статус to «Действует» → «Сохранить» → the badge changes.
4. «Новый приказ»: the window shows the next number of the year («№ 1Р от <today>») → write `ZZ О составе комиссии` → «Создать приказ» → the Приказы tab opens with it, and «Последние приказы» lists it. The next new order gets the following number.
5. «Открытые вопросы управления» → «Добавить»: `ZZ Конфликт интересов`, what is being done, the person responsible → it is listed «В работе»; set it to «Решён» → it leaves the list.
6. In ucode, Admin → Фонд: `fund_documents` and `governance_issues` hold what you entered.

## 16. Languages and signing out

1. User menu → Язык → O‘zbek, then English → every page you visited reads in that language; only what people typed (names, notes) stays as written.
2. User menu → «Выйти» → the sign-in page; opening a page again asks to sign in.
3. Sign in without «Не выходить на этом устройстве», close the tab, open the panel again → you are asked to sign in.

## Known gaps (not bugs)

- The founder has no cabinet yet: no status page, cannot answer requests or upload documents; no emails are sent (rejection letters, reminders).
- A deal moved to the portfolio does not create its portfolio company; companies and the fund's money are added in ucode.
- A deal cannot be taken off a meeting's agenda before the meeting; at the meeting the question can be postponed («Отложить вопрос»).
- Staff are invited in Настройки, but a ucode user for them is made with `scripts/ucode/auth.mjs`; only `Sqb-admin` can sign in today, so roles other than the director cannot be tested.
- No file storage: documents uploaded by the fund on a deal keep their name only, and Документы keeps a link to where the fund stores the file. Files in ucode Files would be open to anyone with the link.
- Deadlines skip weekends, not holidays; the working-day clock is recounted when a deal changes, not every night.
- The memorandum tab is empty for a new deal (memorandums are not written in the panel yet).
- The fund's rules (stage conditions, who may save the settings) are checked in the panel, not yet on the server.
- Partner requests are not shown in the panel.

## Reporting

For each problem write: the step number, what you did, what you expected, what you saw, a screenshot, and the deal number or record name. Problems with the data itself can be checked in the ucode admin (folder Admin), where every table the panel writes is visible.

## Cleaning up

Delete the `ZZ` records in the ucode admin when you are done: the `fund_documents` and `governance_issues` rows, the deals with their rows (`deal_events`, `deal_stage_history`, `screening_scores`, `deal_documents`, `deal_requests`, `workstreams`), the meetings with `meeting_attendance`, `agenda_items` and `votes`, the `decisions`, the tasks with `task_checklist` and `task_events`, the website applications, the committee members, the portfolio company with its rows, the `fund_money` and `reporting_cycles` rows, and the `ZZ Аналитик` employee. Keep «Администратор» in `employees`.

The automated version of this cycle, `UCODE_LOGIN=… UCODE_PASSWORD=… node scripts/ucode/panel-test.mjs --write-test-rows`, runs the panel's services through the same flows and deletes what it made; `node scripts/ucode/verify.mjs --rows` then checks the schema and the row counts.

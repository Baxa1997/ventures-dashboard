# Full test cycle

One pass through everything the website and the panel can do today: a startup applies, the fund takes the deal through screening, due diligence and the investment committee into the portfolio, and the work around it (tasks, Мой день, Обзор, Портфель, Настройки) follows. Run it against the **ucode test project** only. A full pass takes about an hour.

Each step says what to do and, after →, what you should see. Write down every step where you see something else (see «Reporting» at the end).

Button names are given as the panel shows them. The panel is in Russian only for now (`INTERFACE_LANGUAGES`); the Uzbek and English texts are kept for later.

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
| step 4, the second reviewer | — | done in the panel: Настройки → Пользователи → «Добавить», name `ZZ Аналитик`, any email, role «Аналитик» |
| step 13, a portfolio company | Портфель → `portfolio_companies` (Компании портфеля) and its tables | a company `ZZ Portfolio Co` (`owner_id` = the guid of «Администратор» in `employees`, `instrument` safe, `since` 2025, `current_note` any text); in `investments` two rows for it (`amount` 100000 and 50000); in `quarter_reports` one row (`quarter` 2026-Q3, `fund_template_at` and `form1_at` some October dates, `metrics_state` check, `mrr` 12000, `runway` 9); in `company_requests` one row (`title`, `opened_at`, `status` waiting_fund); in `pilots` one row (`title`, `customer` SQB, `status` in_progress) |

## 1. Sign-in

1. Open http://localhost:3000/deals while signed out → the sign-in page opens.
2. Enter `Sqb-admin` and a wrong password, «Войти» → «Неверный логин или пароль».
3. Enter the right password, keep «Не выходить на этом устройстве» ticked → you land on Сделки (the page you asked for); the sidebar shows «Администратор · Директор».
4. Reload the page → still signed in.
5. The sidebar shows Дашборд, Мой день, Задачи, Сделки, Инвесткомитет, Портфель, Документы (under «Фонд») and Настройки. Open http://localhost:3000/finance → «Страница не найдена».

## 2. A startup applies (website)

1. On http://localhost:3100/ru/apply fill in the form: company `ZZ Startup A`, a real email you can reuse (e.g. `zz.a@example.com`), industry FinTech, stage Seed, amount 150000, country Узбекистан, attach a small PDF as the pitch deck, «Откуда вы о нас узнали?» Telegram, send → the done screen shows a reference like `SQBV-2026-XXXXXX` and promises an answer by email (no login: the founder's cabinet comes later). The industry, stage, country and source lists are the panel's (Настройки), in the page's language; the sources are those marked «На сайте».
2. In ucode, `applications` → the new row with that reference, `public_status` = `submitted` (a coloured status), and Отрасль, Раунд, Источник and Страна filled as links to the lists.
3. Fill in the form again with the same email → it is refused with a message that this email has already applied.
4. «Стать партнёром» form (if you test it): the request appears in `partner_requests` in ucode. The panel does not show partner requests yet.

## 3. A new application

1. Panel → Сделки (stage filter «В работе») → `ZZ Startup A` is there with the stage «Входящие», the amount and the source «Сайт»; set the stage filter to «Входящие» → only new applications.
2. Open its card → the header has the company's mark, its name and status, «number · industry · round · country» and three icon buttons; under it the stepper with every stage, «Входящие» tinted; the tabs have icons. Обзор shows «О компании» with what the form sent; «Запросы и документы» shows the pitch deck «Принят», «загружен заявителем · date» (the website files it as accepted).
3. On Обзор, «Проверка мандата» shows the verdict and the rules; in «Параметры сделки» choose the owner `ZZ Аналитик` (so that step 4 can use «Администратор» as the second reviewer) → «Владелец назначен». Change «Стадия раунда» there → saved, and the header's line shows it. «Открытые задачи» → «Добавить» (or the header's task icon) → the task form opens with the deal set; create it → it is listed in the card, and its row opens it. Hover a stage on the stepper → its dates and days.
4. «Взять в скрининг» → the deal's stage is Скрининг (in «Воронка» it is in that column), with «Осталось 5 р.д.» (or the norm set in Настройки). In ucode `applications`, `public_status` = `screening`.
5. Also enter one deal by hand: Сделки → «Новая сделка», company `ZZ Manual B`; Отрасль, Источник, Стадия раунда and Страна are chosen from Настройки's lists, Ниша is free text and may stay empty → «Добавить» → it appears with the stage «Входящие», offered to you; it will be used in step 10.
6. «Воронка» → drag a deal in work to another stage: it follows the pointer and a gap opens where it would drop; drop it → «Этап и статус сделки» opens set to that stage. Drop one on «Отказ» (stage filter «Все этапы») → the refusal opens. «Таймлайн» → each deal's stages as bars, the current one to its deadline.

## 4. Скрининг

1. Open `ZZ Startup A` → tab «Скрининг и оценка». For each of the 7 criteria choose a score 1–5 and write a reason → the counter goes up to «заполнено 7 из 7». A score without a reason does not count.
2. «Второй оценщик» → choose «Администратор» (the owner is `ZZ Аналитик`, so you can).
3. Open Мой день → «Ждут моего согласования» → «Подтвердить решение по скринингу» for `ZZ Startup A` is there (you are its second reviewer); «Открыть» leads to its screening.
4. Back on the deal, the decision is «Встреча»; «Завершить скрининг» → the deal moves to Встреча; the history tab has the screening and the stage move. In ucode, `public_status` = `meeting`.
5. (The same move is possible from Обзор → «Перевести в «Встреча»»: the window lists the exit conditions, and «Перевести» stays off until both are met. An unmet score links to the scoring tab; the second reviewer is chosen in the window itself, and with nobody else in the team the window links to Настройки to invite someone.)

## 5. Through the stages

- On the stepper, a stage ahead moves the deal there (the next one through «Перевести в …» with its conditions, a further one through «Этап и статус сделки»); a passed stage asks «Вернуть сделку на этап …?» and, confirmed, makes it current again. «Путь сделки» on Обзор shows the current stage's dates, norm and when its clock stands.

1. On the deal's Обзор: «Перевести в «Анализ»» → the window shows no conditions for this stage → «Перевести» → Анализ. `public_status` = `due_diligence`.
2. «Перевести в «ИК-1»» → ИК-1. `public_status` stays `due_diligence`.

## 6. Запросы и документы

1. Tab «Запросы и документы»: the pitch deck is already «Принят». A document «На проверке» (an answer's filled-in file, step 6.3) → «Проверить» → «Принять» or «Отклонить» (a reason is required); the history has an entry.
2. «Новый запрос»: title `ZZ Финмодель`, text, due date → the request is «ждём ответа»; on Воронка the deal shows «Ждём заявителя» (the stage clock stands).
3. In the «Data room» card, «Загрузить файлы» (or drop files on the card) → they go into the open folder; each appears as accepted with «Открыть» (the file opens from ucode Files); the same name again makes version 2; «Изменить» renames one; «Удалить» asks, then removes a document with its file. Each link or file has a pencil (rename, change the address) and a bin (asks first). Under a request: «Добавить ссылку», «Загрузить файлы»; «Ответ получен» with the answer closes it and restarts the clock; «Изменить» and «Удалить» change or withdraw it.
4. The founder cannot answer a request yet (that is the cabinet, phase 2), so the request stays open.

## 7. Due diligence

1. Tab «Due diligence» → «Добавить направление»: name `ZZ Юридический DD`, executor, due date → the line appears «не начато».
2. «Передать исполнителю» → it is handed over with today's date.

## 8. Инвесткомитет: ИК-1

0. Инвесткомитет: on top the coming meeting as a card that opens it (when, what it decides, how many confirmed, the materials), or «Ближайших заседаний нет» with the deals waiting and «Назначить заседание». Under it three views, kept in the address (`?view=calendar`): «Таблица» — a meeting's row opens in place to its questions (the deal and its stage, the sum, the score, who presents it, the votes, the decision, the materials) with «Открыть заседание»; «Экспорт» downloads the meetings. «Календарь» — the month of the next meeting, planned ones blue and held ones green with their companies under them; a meeting opens its page. «Решения» — the register of decisions with its search and «Орган» filter, and «Исполнение решений».
1. Инвесткомитет → «Назначить заседание» → under «Участники», «Добавить человека» three times: `ZZ Член 1` with Роль «председатель ИК», `ZZ Член 2` and `ZZ Член 3` «независимый член» (or a member of the team, picked in «Кто») → each is ticked. Untick one to leave them out; under 3 the dialog warns about the quorum. On the meeting's page, the tab «Участники ИК» lists them as a table — role, basis, «Председатель» (a radio while the meeting is planned; the choice is saved to the meeting), attendance — with the pencil, «Убрать» (the window asks: from this meeting only, or from the committee), and adding someone again before the meeting opens.
2. On `ZZ Startup A` (at ИК-1): «Следующий шаг» explains the stage and has «Вынести на заседание» (Инвесткомитет → «Заседания ИК» also lists it under «Ждут заседания» when no meeting is planned) → it opens «Назначить заседание» with Тип **ИК-1** and `ZZ Startup A` ticked → pick a date from today on → «Назначить» → the meeting page.
3. → the meeting's head: «Заседание ИК № N», «Запланировано», the date · time · format · ИК-1; the pencil changes the day, time and format, the bin deletes the meeting after asking. Tabs: «Обзор», «Участники (стартапы)», «Участники ИК», «Голосование», «Протокол» (`?tab=voting`; old links with `?tab=participants` and `?tab=decisions` open «Участники ИК» and «Протокол»). «Обзор» → «Подготовка к заседанию» lists four steps: the agenda (done), at least 3 members (done), who will come (not done), the materials (until the date shown). «Открыть заседание» is off. On the right, «Заседание» lists the date, format, quorum, who confirmed, the chair, the secretary, the materials and the protocol.
4. In «Состав заседания» set each member to «Будет» → 3 of 4 done, «Открыть заседание» is on. «Участники (стартапы)» → «Добавить стартап в повестку» lists the deals waiting for ИК-1 and adds the one picked. Each question is a card: Запрос, Скоринг, Докладчик, Этап сделки, Материалы, the sponsor's word, links to the deal, its memorandum and its data room; the cross takes it off the agenda after asking.
5. Back on the deal → the next step now says «Открыть ИК № N · date» and leads to the meeting. Мой день → «Ближайшие сроки» shows the meeting if it is within two weeks, and the dashboard's «Ближайшее заседание» shows it with its deals.
6. «Разослать материалы» (in «Подготовка к заседанию») → «материалы разосланы» with today's date.
7. «Открыть заседание» → «Идёт заседание · с HH:mm». «Голосование» has a row per question and a column per member, each cell with «За», «Против», «Особое» and a crossed-out person (absent); a member who did not confirm is already absent. The first column and «Итог» stay in place while the table scrolls sideways.
8. On «Протокол», fill «Условия одобрения» for `ZZ Startup A` (`ZZ Предоставить отчётность`, saved when the field is left). On «Голосование» press «За» for the three → under the table, the question's card says «Итог по правилам фонда: 3 «за» — вопрос одобрен» with the conditions → «Зафиксировать одобрение» → «Решение зафиксировано: одобрено с условиями». While the vote is open each member's comment is typed in «Комментарии к голосам»; «Файлы» and «Записи заседания» take files and links, also after the meeting (ucode `attachments`, `section` = `committee` / `committee_record`, `item_id` = the question).
9. Try the rules on a copy if you have a second item: one «Против» → the decision goes to the sponsor (a window asks the sponsor's decision); two «Против» → refusal; one «Особое мнение» → veto. «Изменить решение» takes a decision back while the meeting is open.
10. «Сформировать протокол» → the meeting is held, protocol «на подписи». «Протокол» is the sheet: who was present and absent, the quorum, the chair and the secretary, the agenda, for each question «Слушали», the secretary's notes, «Голосовали», «Решили» and the attached files, the dissenting opinions and lines for the signatures. «Скопировать текст» copies it as text; «Скачать протокол» (here or in the head) prints the sheet alone. Once the members have signed, «Отметить протокол подписанным» asks for the link to the signed scan (a link not starting with https:// is refused) → «Проведено · протокол подписан», «Открыть подписанный протокол» opens the link, and «Подписан» in the table's «Протокол» column.
11. → Инвесткомитет → «Решения» has the decision (ИК № N, the subject with the amount, «Одобрено с условиями»).
12. → the deal's tab «Решения ИК и НС» shows it.
13. → Задачи has a task `ZZ Startup A: ZZ Предоставить отчётность` for the deal's owner, due «до ИК-2», linked to the deal; Инвесткомитет → «Решения» → «Исполнение решений» lists it. «Отметить выполненным» closes it in both places.

## 9. ИК-2, board, closing, portfolio

A committee stage is left only after its committee's approval: before step 8, «Перевести в «Детальный DD»» on `ZZ Startup A` shows «Получить одобрение: ИК-1 — Решения пока нет» with a link to the deal's meeting (or «Вынести на заседание»), and «Перевести» is off.

1. On the deal: «Перевести в «Детальный DD»» (the ИК-1 approval of step 8 meets its condition), then «Перевести в «ИК-2»»: the window lists «Выполнить условия ИК-1», met once the task of step 8.13 is done (while it is open, «Открыть задачу» leads to it and «Перевести» is off) → `public_status` = `committee`.
   - Try to put the deal on a second ИК-1 meeting after step 8: «Назначить заседание» and «Добавить стартап в повестку» no longer offer it, since ИК-1 has approved it. A question left on a meeting for a deal decided elsewhere shows «ИК-1 уже одобрил эту сделку на другом заседании» with «Убрать из повестки».
   - On DD, fill the card's «Обзор»: «Внести условия» (SAFE, round `1000000`, pre-money `4000000`, an exception to the mandate), «Внести метрики» (two rows, one marked «Выделить»), «Добавить риск» twice («Изменить» under one, «Удалить» under the other, confirmed in the window), «Добавить» in «Команда сделки» (an outside party), «Внести синергию». Each card shows what was saved after a reload; in ucode the `deals` row has `instrument`, `round_size`, `pre_money`, `terms_warning`, and `deal_risks`/`deal_team` lose the rows taken off. On «Due diligence», «Добавить направление» → «Передать исполнителю» → «Принять вывод» closes it.
   - At ИК-2 (before the meeting) the card shows «Готовность к ИК-2» or «к ИК № N»: ИК-1's decision, the terms and each DD conclusion ticked by the panel, a request still waiting unticked; add an item of your own and tick it. Инвесткомитет shows the same count under «Материалы» (N из M), and the meeting's question card shows «Запрос» ($ · SAFE · раунд $), «Исключение из мандата» and «Докладчик» with the owner's role.
2. Repeat step 8 from 2 with Тип **ИК-2** (no conditions this time) → «Одобрено». «Перевести в «Набсовет»» now lists a second condition, «Получить одобрение директора»: the director presses «Одобряю» in that window (other roles see «Попросите директора…») → both done, «Перевести» is on, and «История» has «Директор одобрил переход».
3. «Перевести в «Наблюдательный совет»», then hold a board meeting the same way with Орган «Наблюдательный совет» → «Одобрено».
4. «Перевести в «Закрытие»» → `public_status` = `closing`.
5. «Перевести в портфель»: the window asks for the fund's investment (instrument, amount, payment date; stake and valuation optional; a payment after today is refused) → the deal's status is «Портфель», `public_status` = `portfolio`. Портфель lists `ZZ Startup A`; in ucode a `portfolio_companies` row with `deals_id` = the deal and an `investments` row (`kind` = `initial`, `decisions_id` = the board's approval). The deal's «Следующий шаг» links to the company. If ИК-2 had set conditions, «Перевести в портфель» would wait for their tasks («до подписания»).

## 10. Rejection and applying again

1. Open `ZZ Manual B` (step 3.5) → «Отказать с причиной»: reason «Нет подтверждённого спроса», a letter, resubmit «через 6 месяцев» → the deal is in «Отказы и пауза» with the reason.
2. On the website, apply as `ZZ Startup C` with a new email → it appears in Сделки with the stage «Входящие».
3. Open it → reject it with a mandate reason («Вне мандата: …») → resubmit is «сразу» by default. In ucode its application has `public_status` = `rejected` and `resubmit_after` = today.
4. Apply again with `ZZ Startup C`'s email → accepted at once, a new deal at «Входящие».
5. Reject that new deal with «Нет подтверждённого спроса» and «через 6 месяцев» → apply again with the same email → refused, and the message names the date six months on.
6. In ucode, set that application's `resubmit_after` to yesterday → apply again → accepted.

## 11. Задачи

1. Задачи → «Новая задача»: title `ZZ задача`; «Сделка» = `ZZ Startup A`; «Исполнитель» «Администратор»; «Дедлайн» in 3 days; «Приоритет» high; «Повтор» monthly; two checklist items → «Создать». The card closes and the task is in «Список» under «Мои».
2. Click the row → its card opens over the page: the top line names the deal and the type; the arrow next to «Сделка» opens the deal. Change «Приоритет» → close the card → the table shows the new priority (saved without a button). «Скопировать ссылку» → open the link in a new tab → Задачи opens with the card.
3. In the card: set the status «В работе»; tick one checklist item (the bar shows 50 %); add a third item and remove it; «Вложения» → upload a file and add a link; write a comment and press Enter → it shows under «Комментарии», the status change under «История».
4. «Согласует» = `ZZ Аналитик` → the button beside the status says «На согласование» → press it → «На согласовании»; as `ZZ Аналитик` the task waits in Мой день → «Ждут моего согласования».
5. As the director, set the status «Завершена» → a new occurrence appears, due a month later, checklist unticked, history «Создана автоматически после закрытия предыдущей».
6. «Доска» → drag the copy: it follows the pointer, its place closes and a dashed gap opens where it would drop; drop it in another column → «Статус: …». Drag a card above another in its column → it stays there after a reload (this browser). Esc while dragging puts it back. «Календарь» → the task is on its deadline; double-click another day → the form opens with that deadline. «Таймлайн» → its bar runs from today to the deadline; «Неделя» and «Месяц» change the scale.
7. On the copy, the bin in the card's top line → the window asks → «Удалить» → it is gone, with its files.
8. Sidebar counters: «Задачи» counts your open tasks, «Мой день» what waits for you.

## 12. Мой день and the dashboard

1. Мой день → the line under the title counts today's meetings, the tasks due today or overdue, and what waits for your approval; the tab «Мои задачи» shows your tasks and your deals' work in «Просрочено», «Сегодня», «На этой неделе», «Выполнено сегодня». Type a title in «Быстро добавить…» and Enter → a task due today appears under «Сегодня». Tick an item that comes from a deal → it moves to «Выполнено сегодня» until tomorrow (kept in this browser only).
2. «Задача на сегодня» opens the task card with today's deadline. A task with «Согласует» = somebody else: tick it → «Отправлено на согласование», and it stays under «Выполнено сегодня», ticked, with «На согласовании»; untick it → back in work. Click a task's row → its card opens over Мой день.
3. As that approver, the tab «Ждут моего согласования» lists it with «Открыть», «Вернуть», «Согласовать». «Вернуть» asks what to fix → the comment is in the task's history and the task is «В работе» again; «Согласовать» closes it. A memorandum waiting for you as sponsor has «Согласовать» too; a screening you score second has «Открыть».
4. «Расписание»: today's committee meetings (the one going on is marked «идёт сейчас») and your deals' steps set for an hour today. «Ближайшие сроки»: meetings of two weeks, your deals' stage deadlines (the director's: every deal's) of the coming week or past, the quarterly reports' date.
5. Дашборд → the five figures (deals in work match Сделки' «В работе»; «Мои открытые задачи» match Задачи → Мои; «Ближайший ИК» the next planned ИК with its deals), «Воронка сделок» (the deals by group, on an axis), «Вложено по отраслям» (a ring of the portfolio's sectors; hover a piece for its sum and share). «Новая задача» (or «+» in the top bar) opens the task card over the page; «Создать» saves it and you stay on the dashboard.
6. «Мои задачи»: tick one → it leaves the list and «Отмечено выполненным»; a task somebody else checks goes to «На проверке» instead. «Требует внимания»: a deal past its stage's norm, a request past its date, a committee stage with no meeting — each opens its card. «Последние действия»: the latest journal lines, each opening the deal's «История».
7. The top bar: ⌘K (or the search field) → type part of a deal's or a task's name → Enter opens the first result; the bell counts what you have not seen, opening it clears the count.

## 13. Портфель

Needs the company of step 0.

1. Портфель: four figures — «Компаний» (active + exits), «Вложено», «Стоимость портфеля» (the stakes at their valuation, exits at what they brought; a company without a stake or a valuation counts at what was invested) and «MOIC портфеля». There is no «Новая компания»: a company joins from its deal at «Закрытие».
2. «Таблица» (the views are kept in the address, `?view=board`; old `?tab=reports|requests|pilots` still open their views): `ZZ Portfolio Co` with «Активная», the instrument and the first payment's date, «Вложено» $150 000 (the sum of its investments), «Доля фонда» and «Оценка компании» from the investment, «Стоимость доли», MOIC (green from 1×, red below), the latest MRR with its quarter and the pilots under way. «Найти компанию» filters by name, line and sector. Press the valuation (or «Внести») → «Оценка компании (post-money), $» `2000000` → «Сохранить оценку»: with a 10% stake the stake is worth $200 000 and MOIC 1,33×; in ucode `portfolio_companies.valuation` = `2000000`. Under the table «Совокупный MRR активного портфеля» adds up the active companies' MRR by quarter; hovering a quarter shows its sum.
3. «Канбан»: «Активные» and «Выходы». Drag the company to «Выходы» → «Выход»: «Продажа доли» (sum, date, type, buyer) or «Списание» → «Зафиксировать выход» → the card moves, its MOIC is the sum received against what was invested. Drag it back → «Вернуть … в активные?» → the exit is cleared. Without batch 13 in ucode the window warns that only the status is kept.
4. Before any request the reporting period is the last closed quarter, due on the 25th of the next month. «Запросить отчёты» → «Отправить напоминание» → in ucode a `reporting_cycles` row.
5. «Отчётность»: the company's documents for the quarter, and its figures «Заполнено из шаблона …» → «Проверить» → «Подтвердить показатели» → «Подтверждены».
6. «Запросы»: the request waits for the fund (the sidebar «Портфель» counter is 1) → answer it → closed, the counter goes to 0.
7. «Пилоты»: every company's pilots, each leading to its company.
8. Open the company's card → its head (mark, name, «Активная», sector · round · countries · owner) with the pencil («Данные компании»: name, sector, line, about, countries, owner, «Что происходит» → saved to `portfolio_companies`), «Новая задача по компании» and «Открыть сделку»; then «Запросить данные», «Оформить выход» and «Открыть follow-on». Tabs: «Обзор», «Показатели», «Отчётность», «Запросы данных», «Пилоты SQB», «Задачи» (old `?tab=requests|position` open «Обзор», `?tab=documents` «Отчётность»).
9. «Обзор»: the four figures of the position; «О компании» (with the application's facts for a company from the website); «Запросы к фонду» with «Ответить»; «Команда в кабинете основателя» — the applicant and the people they added in the cabinet (`cabinet_members` of the deal's application), or a note for a company that came another way; on the right «Инвестиция» (each payment with its stake and valuation, the committee's and the board's approvals linking to their meetings, the deal, the valuation to press), «Выход» once exited, the quarter's report, «Пилоты SQB» and «Открытые задачи».
10. «Показатели»: «Внести показатели», each quarter's pencil and bin as before; pressing a metric's row draws it by quarter under the table.
11. «Пилоты SQB» → «Новый пилот» (name, SQB unit or client, status, start, end, aim or result) → a `pilots` row with `started_at`/`ended_at`; the pencil changes it, the bin deletes it after asking.
12. «Задачи»: the fund's tasks about the company («Открытые · N» / «Все · N»); «Новая задача» opens the task card with the company filled in; a task ticked here is done in Задачи too.
13. «Запросить данные» with what is needed and a date → the tab «Запросы данных» lists it «Ждём ответа». A company with a startup cabinet answers it there, and the owner's Мой день lists «Проверить ответ компании»; then it is «Ответ получен — проверьте» with the files, and «Принять» closes it. For a company without a cabinet, «Ответ получен» records the answer.
14. «Открыть follow-on» → a new deal «ZZ Portfolio Co · follow-on» in Сделки → Входящие. Taken through to «Перевести в портфель», its investment is added to `ZZ Portfolio Co` as a follow-on (`investments.kind` = `follow_on`) instead of making a second company.

## 14. Настройки

Настройки open on «Типы задач» (`/settings/task-types`); the menu on the left groups the sections as the prototype does — Задачи, Сделки, Портфель, Фонд, Команда, Система — each with its icon, and the section has its title and what it is for above it. On a wide window the page stands still, 20px in from every side: the menu and the section scroll each by itself. On a narrow window the menu is a select above the section and the page scrolls.

1. «Мандат» (Фонд): set Чек `$50 000 – $300 000`. Beside it, «Из справочников» lists the stages (Pre-seed, Seed), the geography (the five Central Asian countries) and the industries in focus, licensed and excluded, each with a link to its list. → «Флаги портфеля» (Портфель): change «Churn за квартал выше». Both sections are marked with a dot in the menu → «Сохранить» → «Журнал изменений» lists each change with «Было» and «Стало».
2. «Этапы сделки»: in the row of Скрининг type `6 · публично` in «Норма» and leave the field → «Сохранено», and the journal has it. A new application asking more than $300 000 now gets «Чек выше $300K» in its card's «Проверка мандата»; a new screening deadline counts 6 working days.
3. Put the values back.
4. «Раунды» → «Добавить» under the list: `ZZ Series B` in the three name fields; the code fills itself (`zz_series_b`); tick «В мандате» → «Добавить» → the row is last, switched on. Drag it up by its handle (⋮⋮ on the left: the row follows the pointer and the others make room; Esc puts it back), then back; with the handle focused, ↑ and ↓ move it too. Change its English name in the row and leave the field (or press Enter) → «Сохранено»; Esc instead puts the old name back. The code is grey and cannot be changed. Switch the row off → Сделки → «Новая сделка» no longer offers it. The journal has the changes. At the end, the bin → the window says whether anything uses it → «Удалить» → the row is gone and the journal has the deletion.
5. «Регионы»: a country not «в мандате» (e.g. Россия) → a deal from it gets «География: Россия» in its «Проверка мандата». «Источники»: the website's options are the rows switched on in «На сайте»; the fund's channels (Нетворк, Конференция…) are not offered on the site. «Отрасли»: an industry set to «Исключена» makes its applications «Исключённая отрасль».
6. «Типы задач»: the types of the task form. «Статусы задач»: each status with its colour, names and group; the swatch opens the browser's colour picker, and the colour is saved when the picker closes (it needs batch 12's `task_statuses.color`) — the status's badge, board column, calendar and timeline take it; the system statuses have a lock instead of the bin, and their group cannot be changed. «Шаблоны документов» and «Отчётность»: the file of a row is replaced with the arrow-up button and removed with ×.
7. «Пользователи»: «Администратор (вы)» with Директор and «Активен» (its own role cannot be changed here); `ZZ Аналитик` with only the date they were added under the name. Scrolled sideways on a narrow window, the pencil column stays in view. Set ZZ Аналитик's «Доступ» to «Ограниченный» → «Сохранено». Switch off «Активен» → the row dims, «не активен: входит с наименьшими правами», and ZZ Аналитик is no longer offered as a task's assignee, while the tasks they had keep their name; switch it back on. The pencil opens the person: add a phone → «Сохранить». The journal has each change. «Роли»: the sections down, the roles across with how many active people hold each.
8. «Интеграции»: Почта, Telegram-бот, ИИ and Контент «Не подключено», with what each needs; the fund's systems below.
9. An old link `/settings?tab=users` opens «Пользователи».
10. «Журнал изменений»: pick a person, or type a word in «Что изменено» → the table narrows.

## 15. Документы

1. Фонд → Документы → «Файлы и документы»: the path «Все модули», three folders — «Фонд», «Сделки», «Инвесткомитет» — each with what it holds, and «Открытые вопросы управления» under them. The columns are Название, Владелец, Изменён and Статус (a folder's count, a file's status); pressing a column's name sorts by it, again the other way, folders first. The two buttons beside the search switch between the list and tiles (`?view=grid`); the address keeps the open folder (`?in=fund/orders`), so «Назад» goes up. Old links `?tab=orders` open Фонд › Приказы.
2. Фонд → four sections: Корпоративные, Приказы, HR, Шаблоны. In Корпоративные, «Добавить документ»: save with no name → refused; name `ZZ Устав`, a note, «Кем утверждается» Участник, a link that is not a link (`abc`) → refused; a real link (`https://…`) → saved → the row is marked in Корпоративные as «Черновик», under its name the note and «Участник». «Загрузить» is not there: the fund's own files stay where it keeps them (ucode Files would open them to anyone with the link), and the footer says so.
3. Click the row → change Статус to «Действует» → «Сохранить» → the badge changes. «⋯» → «Открыть» opens the link in a new tab, «Скопировать ссылку» copies it, «Изменить» opens the same window, «Удалить» asks first → the row goes (`fund_documents`), the file stays.
4. In Приказы the button is «Новый приказ»: the window shows the next number of the year («№ 1Р от <today>») → write `ZZ О составе комиссии` → «Создать приказ» → it is marked in Приказы. The next new order gets the following number.
5. Сделки → the deals in work and those with files, each with its stage and owner → a deal in work: its data room's folders and documents, each with its status (На проверке, Принят…). «Папка» → a folder inside the open one; «Загрузить» (or files dragged onto the list) → uploaded into the open folder, «Загружено файлов: N»; the deal's card, «Запросы и документы», shows them in the same folder. «⋯» on a document: «Открыть в сделке» opens the card at that folder (`?tab=requests&folder=…`); «Изменить» renames or moves it; «Удалить» asks, and for the applicant's file says it leaves the founder's cabinet too. «⋯» on a folder: «Изменить», «Удалить» (what it holds moves one level up). For a closed deal «Папка» and «Загрузить» are off and «⋯» has no changes.
6. Инвесткомитет → the meetings, newest first, with their status → a meeting: «Протокол заседания» once the protocol is signed (it opens the signed file), and a folder per question with its outcome → a question: its files and recordings («Запись»), the same as on the meeting's «Голосование». «Загрузить» puts files on the question; audio and video go to its recordings. «⋯» → «Открыть заседание» opens the meeting at «Голосование».
7. Type `ZZ` in «Поиск в файлах» at the top → files from all three modules, each with its path under the name, and the matching folders; «Найдено: N». In a folder the search looks only below it.
8. «Открытые вопросы управления» → «Добавить»: `ZZ Конфликт интересов`, what is being done, the person responsible → it is listed «В работе»; set it to «Решён» → it leaves the list. The card shows at the top and in Фонд.
9. In ucode, Admin → Фонд: `fund_documents` and `governance_issues` hold what you entered; `deal_documents`, `deal_folders` and `attachments` (section `committee`, `committee_record`) what was uploaded.

## 16. Signing out

1. The user menu has no language choice: the panel is in Russian only for now.
2. User menu → «Выйти» → the sign-in page; opening a page again asks to sign in.
3. Sign in without «Не выходить на этом устройстве», close the tab, open the panel again → you are asked to sign in.

## Known gaps (not bugs)

- The founder has no cabinet yet: no status page, cannot answer requests or upload documents; no emails are sent (rejection letters, reminders).
- The fund's money (`fund_money`) is not shown in the panel for now. A portfolio company is created when its deal closes; companies from before the panel come from the import.
- A deal cannot be taken off a meeting's agenda before the meeting; at the meeting the question can be postponed («Отложить вопрос»).
- Staff are invited in Настройки, but a ucode user for them is made with `scripts/ucode/auth.mjs`; only `Sqb-admin` can sign in today, so roles other than the director cannot be tested.
- Files the fund uploads (data room, attachments, report templates) are in ucode Files and open for anyone who has their link; Документы still keeps links to where the fund stores its own files.
- Deadlines skip weekends, not holidays; the working-day clock is recounted when a deal changes, not every night.
- The memorandum tab is empty for a new deal (memorandums are not written in the panel yet).
- The fund's rules (stage conditions, who may save the settings) are checked in the panel, not yet on the server.
- Partner requests are not shown in the panel.
- A change to a list reaches the website's form within five minutes (its cache), or at once after `POST /api/revalidate` with the tag `form-options`.
- Mail, the Telegram bot, AI and the content sources are not connected (Настройки → Интеграции).

## Reporting

For each problem write: the step number, what you did, what you expected, what you saw, a screenshot, and the deal number or record name. Problems with the data itself can be checked in the ucode admin (folder Admin), where every table the panel writes is visible.

## Cleaning up

Delete the `ZZ` records in the ucode admin when you are done: the `fund_documents` and `governance_issues` rows, the deals with their rows (`deal_events`, `deal_stage_history`, `screening_scores`, `deal_documents`, `deal_requests`, `workstreams`), the meetings with `meeting_attendance`, `agenda_items` and `votes`, the `decisions`, the tasks with `task_checklist` and `task_events`, the website applications, the committee members, the portfolio company with its rows, the `fund_money` and `reporting_cycles` rows, and the `ZZ Аналитик` employee. Keep «Администратор» in `employees`.

The automated version of this cycle, `UCODE_LOGIN=… UCODE_PASSWORD=… node scripts/ucode/panel-test.mjs --write-test-rows`, runs the panel's services through the same flows and deletes what it made; `node scripts/ucode/verify.mjs --rows` then checks the schema and the row counts.

# How it works

The fund works in the **panel**. **ucode** holds the data: its admin is for
looking things up and fixing a row, not for daily work. The panel does the
logic; in ucode a table is just a table.

## A deal, from the website to the portfolio

| Stage | What happens | What has to be true to move on |
| --- | --- | --- |
| **Входящие** (2 working days) | A founder applies on the website, and the deal appears here. Someone presses «Взять в скрининг» and becomes its owner, or rejects it with a reason. | — |
| **Скрининг** (5 working days) | The owner scores 7 criteria, each with a reason, and names a second reviewer (anyone in the team but the owner). | All 7 scored, a second reviewer named |
| **Встреча**, **Анализ** | The owner meets the team and asks for documents («Запросить данные» stops the clock until the answer). | — |
| **ИК-1** | «Вынести на заседание» on the deal puts it on an Инвесткомитет meeting. Before the meeting opens, «Подготовка к заседанию» needs the deal on the agenda and at least 3 of the meeting's participants who confirmed (picked in «Назначить заседание», changed on the meeting's «Участники»). The secretary records the votes, the fund's rules give the result, the protocol passes the decision to the deal. | ИК-1 approved the deal |
| **Детальный DD** | Workstreams: commercial, legal, financial. The conditions ИК-1 set are done. | ИК-1's conditions (tasks «до ИК-2») done |
| **ИК-2**, **Набсовет** | The same as ИК-1, with ИК-2 and then the supervisory board. After ИК-2 the director also confirms («Одобряю» in the move window). | Each approved the deal; after ИК-2, the director too |
| **Закрытие** | Signing and payment. «Перевести в портфель» asks what the fund paid: the instrument, the amount and the payment date (the stake and the valuation may come later). | ИК-2's and the board's conditions (tasks «до подписания») done |
| **Портфель** | The company appears in «Портфель» with that first investment and is followed there quarter by quarter. | |

- The deal's card says what to do now: «Следующий шаг» names the step from where the deal stands (on a committee stage: put it on a meeting, wait for the meeting, then move it once approved; after ИК-2, the director's approval), its deadline, what still holds the move, a link to where it is done, and the owner (a deal without one gets one there). Once nothing holds it, the move's button is in the card. A deal in the portfolio links to its company.
- The rest of the card's «Обзор»:
  - **Путь сделки**: each stage with its dates and working days against the norm (from the stage history), and the meeting that approved a committee stage.
  - **From ИК-1 on, the owner writes on the card**: «Условия сделки» (instrument, round, valuation, the founder, an exception to the mandate), «Метрики, проверенные DD» (from DD on), «Риски из DD» and «Синергия с SQB». A closed deal shows only what was written.
  - **Готовность к ИК** (on ИК-1, ИК-2 and Набсовет, until the committee decides): the materials for the meeting. The panel ticks what it sees done: the decision before, the memorandum approved, the terms, each DD workstream's conclusion («Принять вывод» on «Due diligence»), the company's answers and documents. The owner adds and ticks the rest. Инвесткомитет counts the same list as «Материалы N из M», and «Разослать материалы» waits for all of it.
  - **Команда сделки**: the owner, the memorandum's sponsor, the second reviewer and DD's executors come from the deal; the owner adds others.
  - **Связанные объекты**: the deal's tasks, requests, DD, memorandum, meeting, decisions and company, each with a link.
- On a meeting, a question shows what the members vote on: «Предложение» from the terms, the sponsor's recommendation, an exception to the mandate and who presents it (the deal's owner).
- A deal is on one meeting's agenda at a time, and a deal its committee has approved is not offered for another meeting. A question whose deal was decided elsewhere, or has left the stage, says so on the meeting, with «Убрать из повестки».
- The owner moves a deal with «Перевести в …» on its card. The window lists what is still missing and where to do it.
- A committee's refusal does not close the deal by itself: the owner presses «Отказать с причиной».
- A rejection, at any stage, needs a reason. The website then takes a new application from that email only after the resubmission date (at once for a mandate reason, otherwise 6 or 12 months).
- Each stage has a norm in working days (Настройки → «Этапы сделки»). Past it, the deal shows as late in Сделки, Мой день and the dashboard.
- An approval with conditions gives the owner a task, «до ИК-2» or «до подписания».
- The members sign the printed protocol; the secretary then marks it signed with a link to the signed scan, kept where the fund keeps its files.

## What the fund changes itself

- **Настройки** keep every list the forms offer, and each can be added to, renamed, ordered, turned off or deleted. A row in use is deleted only together with moving its records to another row; the platform's own rows (a system stage, task status, metric or report document) are renamed, never deleted.
- **Этапы сделки**: the stages of a deal, edited in their rows. Every stage is renamed, dragged to its place by its handle and deleted (the deals on a deleted stage move to the stage chosen); the fund adds its own anywhere. The system ones (Входящие, Скрининг, ИК-1, Детальный DD, ИК-2, Набсовет, Закрытие) carry the platform's rules; a deleted one is listed under the table and brought back with «Вернуть».
- **Статусы задач**: each status is in a group — «К выполнению», «В работе», «Завершено» — and acts as its group: a status in «Завершено» closes the task. The task list is grouped by status.
- **Портфель → Показатели and Отчётность**: the metrics a company reports and the documents of its quarterly report, each document with the template (Excel, Word, PowerPoint) the company fills in.
- **A deal's card**: «Изменить» on «Заявка» changes the company, the request, its lists and the application's other rows (contact, website, documents); a click on a stage of «Путь сделки» opens it under the path (its dates, days, norm); a stage the deal has passed has «Вернуть на этот этап», which, after a confirmation, makes it the current stage again and the stages after it not passed, keeping the deal's status; ahead the deal goes by its next step, or by «Сменить этап», which also pauses or withdraws it past the conditions (shown as a warning). Every move goes to its history, with a reason if one is written. Links and files go on Скрининг (each criterion and the whole, at any stage while the deal is open), on a request and on a DD workstream. A request carries templates for the applicant to fill in: ticked in «Новый запрос» from Настройки → Шаблоны документов, or added to the request later with «Добавить шаблон…», next to the fund's own links and files. The applicant's preview shows them to download. A request gets the applicant's answer («Ответ получен», which restarts the stage clock) with the filled-in files, which land in the data room as the answer to that request, waiting to be checked; it is changed or withdrawn, an answered one too (with its answer). The data room has folders inside folders («Новая папка», breadcrumbs above the list); «Загрузить файлы» in the data room, or files dropped on it, upload into the open folder; every document is renamed, moved to another folder, checked (accepted, or rejected with a reason) or deleted; deleting a folder moves what it held one level up; DD's workstreams are changed (name, executor, deadline, status, conclusion) or deleted, and DD's frame (deadline, outside cost, factors, warning) is set. Risks, the owner's team members, the owner's readiness items and every link or file are changed and deleted the same way.
- **Инвесткомитет**: one list of the committee's and the board's meetings. A meeting's page has «Повестка», «Участники» (who is asked; a new person is added there) and «Решения». Until it opens, a meeting's day, time and format are changed («Изменить») and the meeting is deleted («Удалить»; its deals wait for a meeting again).
- **Задачи**: a task opens as a card over the page and saves each change as it is made; the description is rich text (bold, lists, links), and files and links can be attached.
- **Портфель**: a company's «Показатели» are entered, corrected and cleared by quarter («Внести показатели»); each quarter's column has its pencil and bin.
- **Deleting**: wherever something can be deleted or taken off, «Удалить» (or the bin) stands next to «Изменить» (or the pencil), never inside the edit window, and a window asks first, saying what goes with it (a request's or a workstream's files, a list row's records moved to another). A person who leaves the committee stays in the meetings they sat at and in their protocols; only the planned meetings lose them.

Uploaded files are kept in ucode Files and open for anyone who has their link (decided on 22 October); private storage comes later.

## What the founder sees

The startup cabinet (`venture/startup-cabinet`, built, not deployed yet): the
founder signs in with a one-time code sent to the application's email and sees
the application's status (four steps, with the stage under them), the fund's
requests with their templates and deadlines, their own documents, and the DD
questionnaire when a request asks for it; after the investment, the quarter's
reports, metrics and requests to the fund.

- An answer from the cabinet closes the request for the stage clock and shows
  in the panel as «Ответ получен — проверьте», with its files in the data room
  «На проверке»; the owner accepts it («Принять») or asks for more. Мой день
  lists it for the deal's owner, and the deal's История names the applicant.
- A rejected document gets a new version from the cabinet; the old one stays.
- The founder who applied adds the startup's people in «Участники», each with a
  role (CEO, CFO, CTO, participant), and can withdraw the application; a
  withdrawn or rejected application makes the cabinet read-only.
- After the investment, «Запросить данные» on the company's card reaches the
  company's cabinet; its answer and files come back to the card's «Запросы
  данных» for «Принять».
- The founder never sees the owner, scores, notes, committee data, terms, the
  fund's own files or the journal.
- The panel sends no emails yet; the cabinet sends only the sign-in code.
  Letters about requests and decisions are kept in the panel, and the team
  sends them itself.

## The rest of the panel

- **Дашборд**: the fund at a glance — deals, portfolio, money invested, your open tasks, the next committee meeting, the funnel and the money by sector; your tasks, what needs attention (late stages and requests, untaken applications, missing reports, deals with no meeting) and the latest actions.
- **Мой день**: what is yours today — your tasks and the deals' work by deadline, what waits for your approval, today's meetings and the deadlines ahead.
- **Задачи**: tasks, linked to a deal or a company if needed; committee conditions land here.
- **Инвесткомитет**: meetings, agenda, votes, protocol, the register of decisions.
- **Портфель**: companies, quarterly reports (the analyst enters and confirms the figures), requests from companies.
- **Документы** (under «Фонд»): the fund's own documents and orders, each with its status and a link to its file, and open governance questions.
- **Настройки**: the mandate, stage norms, risk flags, committee rules, staff, and the lists the forms offer — industries, rounds, sources, countries, rejection reasons, document templates, task types. The website's form reads the same lists, so a change there reaches it within five minutes. The director changes them; every change goes to the journal.

Every button that saves something shows a spinner and is switched off until ucode answers, so it cannot be pressed twice. A note at the bottom right then says it went through («Изменения сохранены», «Сделка взята в скрининг»…) or that it did not and why (no connection, no rights, the session ended). A form stays open after a failure, so nothing typed is lost.

## Where the data is in ucode

Admin → **Сделки**, **Инвесткомитет**, **Портфель**, **Задачи**, **Фонд**,
**Настройки и справочники**; the website's tables are in **Сайт**. Names are in
Russian, Uzbek and English. Most tables are details of a deal (its requests,
documents, scores, journal…): the panel shows them together on the deal's card.

An application and a deal point to the lists' rows (industry, round, source,
country). A status — of a deal, a request, a document, a meeting, a task — is a
fixed option shown in its colour, grouped as To-do, In progress and Complete.

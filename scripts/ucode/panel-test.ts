/* The panel's own services against the ucode test project, run by
   panel-test.mjs: signs in through the panel's sign-in (the login and password
   of UCODE_LOGIN and UCODE_PASSWORD; the user needs an employees row with the
   director's role, auth.mjs link) and works through Настройки, Сделки, Работа,
   Портфель, Инвесткомитет and Документы, reading back from ucode what each step wrote.
   Every row the run creates is recorded from its request and deleted at the
   end, so rows others write meanwhile are left alone; the settings it changes
   are put back. */

const memory = (): Storage => {
   const items = new Map<string, string>();
   return {
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => void items.set(key, String(value)),
      removeItem: (key) => void items.delete(key),
      clear: () => items.clear(),
      key: () => null,
      get length() {
         return items.size;
      },
   };
};
Object.assign(globalThis, { localStorage: memory(), sessionStorage: memory() });

// the rows this run creates: the guid of every row a POST /v2/items/<table>
// made, from ucode's reply (some rows are created without one of their own)
const created: [table: string, guid: string][] = [];
// every field the run writes, by table: with PANEL_TEST_WRITES set, written to
// that file at the end, for `verify.mjs --writes` to check against ucode
const writes = new Map<string, Set<string>>();
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
   const table = String(input).match(/\/v2\/items\/(\w+)$/)?.[1];
   if (table && (init?.method === 'POST' || init?.method === 'PUT') && typeof init.body === 'string') {
      const data = (JSON.parse(init.body) as { data?: Record<string, unknown> }).data ?? {};
      const fields = writes.get(table) ?? new Set<string>();
      Object.keys(data).forEach((field) => fields.add(field));
      writes.set(table, fields);
   }
   const response = await realFetch(input, init);
   if (table && init?.method === 'POST' && response.ok) {
      const reply = (await response.clone().json()) as { data?: { data?: { guid?: string } } };
      const guid = reply.data?.data?.guid;
      if (guid) created.push([table, guid]);
   }
   return response;
}) as typeof fetch;

const api = await import('@shared/api/ucode');
const { signIn } = await import('@shared/hooks/useSession');
const { TEAM } = await import('@shared/constants');
const settings = (await import('@modules/Settings/services')).default;
const deals = (await import('@modules/Deals/services')).default;
const work = (await import('@modules/Work/services')).default;
const portfolio = (await import('@modules/Portfolio/services')).default;
const committee = (await import('@modules/Committee/services')).default;
const documents = (await import('@modules/Documents/services')).default;
const { addWorkingDays, clearStores, newId, todayISO } = await import('@shared/helpers');

let failures = 0;
const check = (label: string, ok: unknown, detail: unknown = '') => {
   if (!ok) failures++;
   console.log(`${ok ? '✓' : '✗'} ${label}${detail === '' ? '' : ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// a row the run deleted itself: the cleanup does not look for it
const forget = (table: string, guid: string) => {
   const index = created.findIndex(([t, g]) => t === table && g === guid);
   if (index >= 0) created.splice(index, 1);
};

// ---- sign in
await signIn(process.env.UCODE_LOGIN ?? '', process.env.UCODE_PASSWORD ?? '', true);
for (let i = 0; i < 50 && !TEAM.length; i++) await sleep(200);
const me = TEAM.find(({ role }) => role === 'director');
check('signed in; the team read from employees, the user a director', me, TEAM);
if (!me) process.exit(1);
const today = todayISO();

const settingsRow = (await api.listRows('fund_settings'))[0];
const normRows = await api.listRows('stage_norms');
const roundRows = await api.listRows('round_stages');

try {
   // ---- Настройки
   const initial = await settings.getSettings();
   const counts = Object.fromEntries(Object.entries(initial.lists).map(([kind, items]) => [kind, items.length]));
   const SYSTEM_STAGES = ['inbox', 'screening', 'ic1', 'dd', 'ic2', 'board', 'closing'];
   check('settings: mandate, the stages with the system ones in order, flags, staff, the lists', SYSTEM_STAGES.every((key) => initial.stages.some((stage) => stage.key === key && stage.isSystem)) && SYSTEM_STAGES.join() === initial.stages.filter(({ isSystem }) => isSystem).map(({ key }) => key).join() && initial.staff.length >= 1 && counts.industries >= 11 && counts.rounds >= 4 && counts.sources >= 13 && counts.countries >= 12 && counts.reasons >= 6 && counts.taskTypes >= 8 && counts.taskStatuses >= 6 && counts.metrics >= 8 && counts.reportDocs >= 4, {
      stages: initial.stages.map((n) => `${n.key}:${n.norm}`),
      flags: initial.flags,
      staff: initial.staff.map((m) => `${m.name}/${m.role}`),
      counts,
   });
   await settings.save(
      {
         mandate: { ...initial.mandate, check: '$50 000 – $300 000' },
         flags: { ...initial.flags, churn: 6 },
      },
      me.id,
      { 'mandate.check': 'Мандат · Чек', 'flag.churn': 'Флаг · Churn' },
   );
   // a stage's norm is changed on its own, and goes to the journal
   const screeningStage = initial.stages.find((stage) => stage.key === 'screening')!;
   const describeStage = (stage: { norm: string } | null) => stage?.norm ?? '';
   await settings.saveStage(screeningStage.id, 'screening', { ...screeningStage, norm: '6 · публично' }, null, me.id, 'Этап «Скрининг»', describeStage);
   const saved = await settings.getSettings();
   check('settings saved and read back', saved.mandate.check === '$50 000 – $300 000' && saved.flags.churn === 6 && saved.stages.find((n) => n.key === 'screening')?.norm === '6 · публично', saved.mandate);
   // only the values that differ from what the fund has saved go to the journal, and the stage
   const changed = [initial.mandate.check !== '$50 000 – $300 000', initial.flags.churn !== 6].filter(Boolean).length + 1;
   check(`settings journal has the ${changed} changes`, saved.journal.length - initial.journal.length === changed, saved.journal.slice(0, changed).map((j) => `${j.field}: ${j.from} → ${j.to}`));
   const { stageNorm, mandateLimits, nextStageOf, stageKeys } = await import('@modules/Deals/helpers');
   check('Сделки follow the saved rules', stageNorm('screening') === 6 && mandateLimits().maxCheck === 300000, { screening: stageNorm('screening'), limits: mandateLimits() });

   await settings.invite({ name: 'Тест Сотрудник', email: 'test.employee@example.com', position: 'Аналитик', role: 'analyst', roles: ['analyst'], access: 'work' });
   const invited = (await settings.getSettings()).staff.find((m) => m.email === 'test.employee@example.com');
   check('invite adds an employees row, not signed in yet', invited && invited.invitedAt === today && invited.role === 'analyst', invited);
   check('the team includes the invited employee', TEAM.some(({ id }) => id === invited?.id));

   // ---- Настройки: a list (batch 7)
   const { listOf, listIdOf, itemOf } = await import('@modules/Settings/services');
   const describe = (row: { names: { ru: string }; active: boolean } | null) => (row ? `${row.names.ru} · ${row.active ? 'используется' : 'отключён'}` : '');
   const journalBefore = (await settings.getSettings()).journal.length;
   const round = { key: 'zz_series_b', names: { ru: 'ZZ Series B', uz: 'ZZ Series B', en: 'ZZ Series B' }, active: true, inMandate: false };
   await settings.saveListItem('rounds', null, round, me.id, 'Справочник «Раунды» · ZZ Series B', describe);
   const added = itemOf('rounds', 'zz_series_b');
   check('a round added to the list, last, and offered by the forms', added && added.names.en === 'ZZ Series B' && !added.inMandate && listOf('rounds').at(-1)?.key === 'zz_series_b', added);
   await settings.saveListItem('rounds', added!.id, { ...round, inMandate: true, active: false }, me.id, 'Справочник «Раунды» · ZZ Series B', describe);
   const changedRound = itemOf('rounds', 'zz_series_b');
   check('turned off: kept in the list, no longer offered', changedRound?.inMandate && !changedRound.active && !listOf('rounds').some((item) => item.key === 'zz_series_b') && listOf('rounds', true).some((item) => item.key === 'zz_series_b'), changedRound);
   const journalAfter = (await settings.getSettings()).journal;
   check('both list changes are in the journal', journalAfter.length - journalBefore === 2 && journalAfter[0].from === 'ZZ Series B · используется' && journalAfter[0].to === 'ZZ Series B · отключён', journalAfter.slice(0, 2));
   let refusedKey = false;
   try {
      await settings.saveListItem('rounds', null, { ...round, key: 'seed' }, me.id, 'x', describe);
   } catch {
      refusedKey = true;
   }
   check('a key that is taken is refused', refusedKey);
   const orderOf = () => listOf('rounds', true).map((item) => item.key).join(',');
   const orderBefore = orderOf();
   await settings.moveListItem('rounds', added!.id, -1);
   const moved = orderOf();
   await settings.moveListItem('rounds', added!.id, 1);
   check('a row moves up the list and back', moved !== orderBefore && moved.indexOf('zz_series_b') < orderBefore.indexOf('zz_series_b') && orderOf() === orderBefore, { orderBefore, moved, after: orderOf() });

   // ---- Настройки: a document template with its file (batch 9)
   await settings.saveListItem('docTemplates', null, { key: 'zz_questionnaire', names: { ru: 'ZZ Анкета', uz: 'ZZ Anketa', en: 'ZZ Questionnaire' }, active: true, file: { id: '', url: 'https://example.com/zz-questionnaire.xlsx', name: 'zz-questionnaire.xlsx' } }, me.id, 'Справочник «Шаблоны документов» · ZZ', describe);
   clearStores();
   await settings.getSettings();
   const template = itemOf('docTemplates', 'zz_questionnaire');
   check('a document template saved with its file and read back from ucode', template?.file?.url === 'https://example.com/zz-questionnaire.xlsx' && template.file.name === 'zz-questionnaire.xlsx' && template.names.uz === 'ZZ Anketa', template);

   // ---- Настройки: a task status and a metric of the fund's own, deleted with what used them moved on
   await settings.saveListItem('taskStatuses', null, { key: 'zz_hold', names: { ru: 'ZZ На удержании', uz: '', en: 'ZZ On hold' }, active: true, group: 'progress', tone: 'warning' }, me.id, 'Справочник «Статусы задач» · ZZ', describe);
   await settings.saveListItem('taskStatuses', null, { key: 'zz_signed', names: { ru: 'ZZ Подписана', uz: '', en: 'ZZ Signed' }, active: true, group: 'complete', tone: 'success' }, me.id, 'Справочник «Статусы задач» · ZZ', describe);
   const { isDone, statusGroup } = await import('@modules/Work/helpers');
   const holdTask = await work.createTask({ title: 'ZZ задача на удержании', type: 'other', context: '', details: '<p>ZZ <strong>уточнение</strong></p>', relation: 'none', relationId: '', assigneeId: me.id, reviewerId: '', dueDate: '', priority: 'low', status: 'zz_hold', recurrence: 'none', checklist: [] }, me.id);
   const signedTask = await work.createTask({ title: 'ZZ подписанная задача', type: 'other', context: '', details: '', relation: 'none', relationId: '', assigneeId: me.id, reviewerId: '', dueDate: '', priority: 'low', status: 'zz_signed', recurrence: 'none', checklist: [] }, me.id);
   check("a status of the fund's own acts as its group: «complete» closes the task", statusGroup('zz_hold') === 'progress' && !isDone(holdTask) && isDone(signedTask) && signedTask.completedAt === today, { hold: statusGroup('zz_hold'), signed: signedTask.completedAt });
   const holdId = itemOf('taskStatuses', 'zz_hold')!.id;
   const holdUsage = await settings.usageOf('taskStatuses', holdId);
   let refusedInUse = false;
   try {
      await settings.deleteListItem('taskStatuses', holdId, null, me.id, 'x', 'ZZ');
   } catch {
      refusedInUse = true;
   }
   await settings.deleteListItem('taskStatuses', holdId, 'in_progress', me.id, 'Справочник «Статусы задач» · удалено: ZZ', 'ZZ На удержании');
   await settings.deleteListItem('taskStatuses', itemOf('taskStatuses', 'zz_signed')!.id, 'done', me.id, 'Справочник «Статусы задач» · удалено: ZZ', 'ZZ Подписана');
   forget('task_statuses', holdId);
   created.splice(0, created.length, ...created.filter(([table]) => table !== 'task_statuses'));
   await work.reloadTasks();
   const movedTasks = await work.getTasks();
   check('a status in use is deleted only with a replacement; its tasks move to it', holdUsage === 1 && refusedInUse && !itemOf('taskStatuses', 'zz_hold') && movedTasks.find((task) => task.id === holdTask.id)?.status === 'in_progress' && movedTasks.find((task) => task.id === signedTask.id)?.status === 'done' && movedTasks.find((task) => task.id === holdTask.id)?.details === '<p>ZZ <strong>уточнение</strong></p>', { holdUsage, refusedInUse });
   let systemKept = false;
   try {
      await settings.deleteListItem('taskStatuses', itemOf('taskStatuses', 'review')!.id, 'done', me.id, 'x', 'x');
   } catch {
      systemKept = true;
   }
   check('a system status is never deleted', systemKept && !!itemOf('taskStatuses', 'review'));

   // ---- Сделки
   const deal = await deals.createDeal({ company: 'ZZ Test Co', about: 'Тестовая сделка', industryKey: 'fintech', industry: 'ZZ цифровые чеки', source: 'network', amount: 150000, country: 'UZ', roundStage: 'seed' }, me.id);
   check('deal created in the inbox', deal.status === 'review' && /^SQBV-\d{4}-\d{4}$/.test(deal.number), deal.number);
   const dealRow = (await api.listRows('deals')).find((row) => row.guid === deal.id);
   check("the deal points to the lists' rows: industry, source, round, country", dealRow && dealRow.industries_id === listIdOf('industries', 'fintech') && dealRow.lead_sources_id === listIdOf('sources', 'network') && dealRow.round_stages_id === listIdOf('rounds', 'seed') && dealRow.countries_id === listIdOf('countries', 'UZ') && dealRow.niche === 'ZZ цифровые чеки' && dealRow.channel === 'network', dealRow && { industries_id: dealRow.industries_id, lead_sources_id: dealRow.lead_sources_id, round_stages_id: dealRow.round_stages_id, countries_id: dealRow.countries_id, channel: dealRow.channel });
   const { checkMandate } = await import('@modules/Deals/helpers');
   const t = ((key: string) => key) as unknown as Parameters<typeof checkMandate>[0];
   const verdict = (patch: Partial<typeof deal>) => checkMandate(t, { ...deal, ...patch }, 'ru').verdict.state;
   check('the mandate check reads the lists: fits; a round or a country outside the mandate, a deal with no sector', verdict({}) === 'ok' && verdict({ roundStage: 'series_a' }) === 'attention' && verdict({ country: 'RU' }) === 'attention' && verdict({ industryKey: '' }) === 'attention', { fits: verdict({}), seriesA: verdict({ roundStage: 'series_a' }), russia: verdict({ country: 'RU' }), noSector: verdict({ industryKey: '' }) });
   const queueInbox = await work.getQueue(me.id);
   check('Мой день: the application offered to me', queueInbox.some((item) => item.kind === 'inbox' && item.dealId === deal.id));
   await deals.takeToScreening(deal.id, me.id);
   await deals.setScreening(deal.id, { secondId: me.id });
   const queue = await work.getQueue(me.id);
   const nextDue = (await deals.getDeals()).find((d) => d.id === deal.id)?.next?.dueDate ?? '';
   const soon = nextDue <= addWorkingDays(today, 5);
   check('Мой день: the screening decision, and the next step only when due within 5 working days', queue.some((i) => i.kind === 'screening' && i.decision?.action === 'decide') && queue.some((i) => i.kind === 'next' && i.dealId === deal.id) === soon, { nextDue, soon, queue: queue.map((i) => `${i.kind}:${i.dueDate}`) });
   const myDeals = await work.getMyDeals(me.id);
   check('Мой день: my deals', myDeals.some((d) => d.id === deal.id && d.stage === 'screening'));

   // ---- Работа
   const task = await work.createTask(
      { title: 'ZZ тестовая задача', type: 'other', context: 'тест', relation: 'deal', relationId: deal.id, assigneeId: me.id, reviewerId: '', dueDate: addWorkingDays(today, 2), priority: 'high', status: 'assigned', recurrence: 'monthly', checklist: [{ id: crypto.randomUUID(), text: 'Пункт 1', done: false }, { id: crypto.randomUUID(), text: 'Пункт 2', done: false }] },
      me.id,
   );
   await work.toggleChecklistItem(task.id, task.checklist[0].id);
   await work.addComment(task.id, 'Тестовый комментарий', me.id);
   await work.updateTask(task.id, { status: 'done' }, me.id);
   await work.reloadTasks();
   const tasks = await work.getTasks();
   const closed = tasks.find((t) => t.id === task.id);
   const next = tasks.find((t) => t.id !== task.id && t.title === task.title);
   const taskRow = (await api.listRows('tasks')).find((row) => row.guid === task.id);
   check('the task points to its type in the list', taskRow?.task_types_id === listIdOf('taskTypes', 'other'), taskRow?.task_types_id);
   check('task read back from ucode: deal link, checklist, history', closed && closed.relation === 'deal' && closed.relationId === deal.id && closed.checklist[0].done && !closed.checklist[1].done && closed.completedAt === today && closed.history.map((e) => e.kind).join(',') === 'status,comment', closed && { checklist: closed.checklist, history: closed.history.map((e) => e.kind) });
   check('closing a monthly task made the next one', next && next.status === 'assigned' && next.checklist.every((i) => !i.done) && next.history[0]?.kind === 'recurred' && next.dueDate > task.dueDate, next && { due: next.dueDate, history: next.history.map((e) => e.kind) });
   await work.updateTask(next!.id, { checklist: [next!.checklist[1]], reviewerId: me.id, status: 'review' }, me.id);
   await work.reloadTasks();
   const edited = (await work.getTasks()).find((t) => t.id === next!.id);
   check('editing a task: a checklist item removed, status event written', edited && edited.checklist.length === 1 && edited.history[0]?.kind === 'status', edited && { checklist: edited.checklist.map((i) => i.text), history: edited.history.map((e) => e.kind) });
   const deadlines = await work.getDeadlines();
   check('week deadlines: the deal and the open task', deadlines.some((d) => d.kind === 'deal' && d.title === 'ZZ Test Co') && deadlines.some((d) => d.kind === 'task' && d.title === task.title), deadlines.map((d) => `${d.kind}:${d.date}:${d.title}`));
   const counters = await work.getCounters(me.id);
   check('sidebar counters counted', counters.myDay! >= 2 && counters.tasks! >= 1, counters);

   // ---- Портфель
   const empty = await portfolio.getState();
   check('portfolio without a cycle row: the last closed quarter by the rule', empty.cycle.quarter === '2026-Q3' && empty.cycle.due === '2026-10-25' && empty.cycle.autoReminderAt === '2026-10-20' && !empty.cycle.requestedAt, empty.cycle);
   const companyId = crypto.randomUUID();
   await api.createRow('portfolio_companies', { guid: companyId, name: 'ZZ Portfolio Co', tagline: 'тест', instrument: 'safe', since: 2025, owner_id: me.id, current_note: 'Пилот с банком', status: 'active', facts: JSON.stringify([{ label: 'Город', value: 'Ташкент' }]) });
   await api.createRow('investments', { guid: crypto.randomUUID(), date: '2025-05-01', kind: 'initial', instrument: 'safe', amount: 100000, portfolio_companies_id: companyId });
   await api.createRow('investments', { guid: crypto.randomUUID(), date: '2026-03-01', kind: 'follow_on', instrument: 'safe', amount: 50000, portfolio_companies_id: companyId });
   await api.createRow('quarter_reports', { guid: crypto.randomUUID(), quarter: '2026-Q3', fund_template_at: '2026-10-10', form1_at: '2026-10-11', metrics_state: 'check', filled_at: '2026-10-10', mrr: 12000, runway: 9, portfolio_companies_id: companyId });
   const requestId = crypto.randomUUID();
   await api.createRow('company_requests', { guid: requestId, title: 'Интро в банк', opened_at: '2026-10-01', status: 'waiting_fund', owner_id: me.id, portfolio_companies_id: companyId });
   await api.createRow('pilots', { guid: crypto.randomUUID(), title: 'Пилот', customer: 'SQB', status: 'planned', portfolio_companies_id: companyId });
   await portfolio.remind(); // also re-reads
   const holdings = await portfolio.getState();
   const company = holdings.companies.find((c) => c.id === companyId);
   check('company read: invested = sum of investments, report, metrics, pilot', company && company.invested === 150000 && company.reports['2026-Q3']?.metrics === 'check' && company.reports['2026-Q3']?.received.form1 === '2026-10-11' && company.metrics.find((m) => m.key === 'mrr')?.values['2026-Q3'] === 12000 && company.pilots[0]?.status === 'planned' && company.facts[0]?.value === 'Ташкент', company && { invested: company.invested, report: company.reports['2026-Q3'] });
   check('requesting the reports made the cycle row', holdings.cycle.requestedAt === today && holdings.cycle.remindedAt === today && holdings.cycle.due === '2026-10-25', holdings.cycle);
   check('sidebar counts the request waiting for the fund', (await work.getCounters(me.id)).portfolio === 1);
   check('Мой день: waiting for the company report after the deadline is not shown before it', !(await work.getWaiting(me.id)).some((w) => w.source === 'company'));
   await portfolio.confirmMetrics(companyId, '2026-Q3', me.id);
   await portfolio.answerRequest(requestId, 'Познакомили');
   const after = await portfolio.getState();
   check('metrics confirmed and the request answered', after.companies.find((c) => c.id === companyId)?.reports['2026-Q3']?.metrics === 'confirmed' && after.requests.find((r) => r.id === requestId)?.status === 'closed');
   const overview = await work.getFundOverview();
   check('overview: no money row yet, the portfolio and the funnel', overview.money === null && overview.portfolio.companies.some((c) => c.id === companyId && c.invested === 150000) && overview.funnel.find((f) => f.stage === 'screening')!.count >= 1, { quarter: overview.portfolio.quarter, funnel: overview.funnel.map((f) => `${f.stage}:${f.count}`) });

   // ---- Инвесткомитет
   const { preparationOf, waitingDeals } = await import('@modules/Committee/helpers');
   // the deal walks to ИК-1: screening done, the meeting with the team, the analysis
   await deals.completeScreening(deal.id, me.id);
   await deals.transferDeal(deal.id);
   await deals.transferDeal(deal.id);
   check('the deal reached ИК-1', (await deals.getDeals()).find((d) => d.id === deal.id)?.stage === 'ic1');
   await committee.addMember({ name: 'ZZ Член ИК', role: 'chair', remote: false, contract: 'ZZ договор' });
   const memberId = (await committee.getState()).members.find((m) => m.name === 'ZZ Член ИК')?.id ?? '';
   // a meeting scheduled with no questions is not ready to open; a deal is added to it after
   const meeting = await committee.scheduleMeeting({ body: 'ic', stage: 'ic1', date: addWorkingDays(today, 3), time: '10:00', format: 'Очно', dealIds: [], participantIds: [] });
   check('a meeting with no questions is not ready to open', !preparationOf(meeting, (await committee.getState()).members).ready);
   await committee.addToAgenda(meeting.id, [deal.id]);
   // a second ИК-1 meeting does not take a deal already on an agenda
   const second = await committee.scheduleMeeting({ body: 'ic', stage: 'ic1', date: addWorkingDays(today, 8), time: '10:00', format: 'Очно', dealIds: [deal.id], participantIds: [memberId] });
   check('a meeting asks only the participants picked for it', Object.keys(second.attendance).join() === memberId && Object.keys(meeting.attendance).length >= 1, { second: Object.keys(second.attendance) });
   check('a deal on one agenda is not put on a second meeting', second.agenda.length === 0, second.agenda.map((i) => i.title));
   // a member who joins after the meeting was scheduled, and does not confirm
   const lateId = await committee.addMember({ name: 'ZZ Второй член', role: 'independent', remote: true, contract: '' });
   await committee.addParticipant(meeting.id, lateId);
   await committee.addParticipant(second.id, lateId);
   await committee.removeParticipant(second.id, lateId);
   clearStores();
   const committeeState0 = await committee.getState();
   const secondNow = committeeState0.meetings.find((m) => m.id === second.id);
   check('a participant added to a meeting and taken off again, read back', !!committeeState0.meetings.find((m) => m.id === meeting.id)?.attendance[lateId] && secondNow && !(lateId in secondNow.attendance), secondNow && Object.keys(secondNow.attendance));
   const scheduled = committeeState0.meetings.find((m) => m.id === meeting.id);
   check('committee members added and read back', committeeState0.members.some((m) => m.id === memberId && m.role === 'chair' && m.contract === 'ZZ договор') && committeeState0.members.some((m) => m.id === lateId && m.remote));
   check('the deal added to the agenda of the meeting', scheduled?.agenda.length === 1 && scheduled.agenda[0].dealId === deal.id && scheduled.agenda[0].stage === 'ic1' && scheduled.summary === 'ZZ Test Co', scheduled && { agenda: scheduled.agenda.map((i) => i.title), summary: scheduled.summary });
   const onAgenda = (await deals.getDeals()).find((d) => d.id === deal.id);
   check("the deal's card points at its meeting", onAgenda?.committee?.id === meeting.id && onAgenda.committee.date === meeting.date, onAgenda?.committee);
   meeting.agenda = scheduled!.agenda;
   const weekAhead = await work.getDeadlines();
   check('the meeting is a key event of the week', weekAhead.some((d) => d.kind === 'meeting' && d.keyEvent && d.date === meeting.date), weekAhead.filter((d) => d.kind === 'meeting'));
   await committee.setAttendance(meeting.id, memberId, 'confirmed');
   await committee.sendMaterials(meeting.id);
   await committee.startMeeting(meeting.id);
   const item = meeting.agenda[0];
   await committee.setVote(meeting.id, item.id, memberId, 'for');
   await committee.setVoteNote(meeting.id, item.id, memberId, 'Поддерживаю');
   await committee.setProtocol(meeting.id, item.id, 'conditions', 'Предоставить управленческую отчётность');
   await committee.decide(meeting.id, item.id, 'approved_conditions');
   await committee.formProtocol(meeting.id, me.id);
   // read everything again from ucode
   clearStores();
   const state = await committee.getState();
   const held = state.meetings.find((m) => m.id === meeting.id);
   const heldItem = held?.agenda[0];
   check('the member who did not confirm is absent from the vote', heldItem?.votes[lateId]?.choice === 'absent', heldItem?.votes[lateId]);
   check('meeting held, attendance, vote and protocol stored', held && held.status === 'held' && held.protocol === 'signing' && held.result === 'approved_conditions' && held.attendance[memberId] === 'confirmed' && !!held.materialsSentAt && heldItem?.votes[memberId]?.choice === 'for' && heldItem?.votes[memberId]?.note === 'Поддерживаю' && heldItem?.protocol.conditions.startsWith('Предоставить'), held && { status: held.status, result: held.result, votes: heldItem?.votes, chair: held.chairId });
   await committee.signProtocol(meeting.id, 'https://example.com/zz-protocol');
   clearStores();
   const signed = (await committee.getState()).meetings.find((m) => m.id === meeting.id);
   check('the secretary marks the protocol signed, with the link to the signed copy', signed?.protocol === 'signed' && signed.protocolFile === 'https://example.com/zz-protocol', signed && { protocol: signed.protocol, file: signed.protocolFile });
   const decision = state.decisions.find((d) => d.meetingId === meeting.id);
   check('the decision is in the register', decision && decision.outcome === 'approved_conditions' && decision.dealId === deal.id && decision.meetingLabel === `ИК № ${meeting.number}`, decision);
   const condition = state.tasks.find((t) => t.basis === `Условие ИК № ${meeting.number}`);
   check('the condition is a task for the deal owner', condition && condition.ownerId === me.id && 'label' in condition.due && condition.due.label === 'до ИК-2', condition);
   const conditionTask = (await work.getTasks()).find((t) => t.id === condition?.id);
   check('…and shows in Задачи linked to the deal and the decision', conditionTask && conditionTask.origin === 'ic_condition' && conditionTask.relationId === deal.id && conditionTask.decisionId === decision?.id, conditionTask && { origin: conditionTask.origin, relation: conditionTask.relation });
   const reread = (await deals.getDeals()).find((d) => d.id === deal.id);
   check("the deal's card shows the decision", reread?.decisions?.some((d) => d.outcome.startsWith('Одобрено с условиями')), reread?.decisions);
   // a committee stage is left only after its committee's approval
   const { exitConditions, nextStepOf } = await import('@modules/Deals/helpers');
   const keys = ((key: string) => key) as never;
   const atStage = (stage: 'ic1' | 'ic2') => exitConditions(keys, { ...reread!, stage, exit: undefined }).find((c) => c.id === 'committee')?.state;
   check('the ИК-1 approval opens the way out of ИК-1, not out of ИК-2', atStage('ic1') === 'done' && atStage('ic2') === 'blocking', { ic1: atStage('ic1'), ic2: atStage('ic2') });
   const approvedStep = nextStepOf(keys, reread!, await work.getTasks());
   check('the next step of an approved deal is its move, with the button', approvedStep.title === 'Перевести в «{{stage}}»' && !!approvedStep.ready, approvedStep);
   const waitingNow = waitingDeals((await committee.getState()).meetings, await deals.getDeals(), 'ic', 'ic1');
   await committee.addToAgenda(second.id, [deal.id]);
   const secondAfter = (await committee.getState()).meetings.find((m) => m.id === second.id);
   check('a deal approved at ИК-1 waits for no other ИК-1 meeting', !waitingNow.some((d) => d.id === deal.id) && secondAfter?.agenda.length === 0, { waiting: waitingNow.map((d) => d.company), agenda: secondAfter?.agenda.length });
   // ИК-1's condition is due before ИК-2: it holds the deal on DD until it is met
   const conditionAt = async (stage: 'dd' | 'closing') => exitConditions(keys, { ...(await deals.getDeals()).find((d) => d.id === deal.id)!, stage, exit: undefined }, await work.getTasks()).find((c) => c.id === 'conditions')?.state;
   const openOnDd = await conditionAt('dd');
   await committee.setTaskDone(condition!.id, true, me.id);
   check('marking the condition done', (await committee.getState()).tasks.find((t) => t.id === condition?.id)?.done === true);
   check("ИК-1's condition holds DD until it is met, and not Закрытие", openOnDd === 'blocking' && (await conditionAt('dd')) === 'done' && (await conditionAt('closing')) === undefined, { before: openOnDd, after: await conditionAt('dd') });
   // after ИК-2 the director approves too, for the stage the approval was given on
   const directorAt = async () => exitConditions(keys, { ...(await deals.getDeals()).find((d) => d.id === deal.id)!, stage: 'ic2', exit: undefined }).find((c) => c.id === 'director')?.state;
   const beforeApproval = await directorAt();
   await deals.approveTransfer(deal.id, me.id);
   clearStores();
   const approvedDeal = (await deals.getDeals()).find((d) => d.id === deal.id);
   check('ИК-2 also needs the director: blocking, then approved and read back from the journal', beforeApproval === 'blocking' && (await directorAt()) === 'done' && approvedDeal?.journal[0]?.kind === 'approved', { beforeApproval, journal: approvedDeal?.journal.slice(0, 2).map((e) => e.kind) });
   await committee.addParticipant(second.id, lateId);
   await committee.retireMember(lateId);
   await deals.transferDeal(deal.id);
   clearStores();
   check("the director's approval belongs to the stage it was given on", (await directorAt()) === 'blocking');
   const { activeMembers } = await import('@modules/Committee/helpers');
   const afterLeaving = await committee.getState();
   check('a member who left: no longer offered, off the planned meeting, still on the one held', afterLeaving.members.find((m) => m.id === lateId)?.retired === true && !activeMembers(afterLeaving.members).some((m) => m.id === lateId) && !(lateId in (afterLeaving.meetings.find((m) => m.id === second.id)?.attendance ?? {})) && lateId in (afterLeaving.meetings.find((m) => m.id === meeting.id)?.attendance ?? {}));
   check('a new stage takes the deal off its meeting', !(await deals.getDeals()).find((d) => d.id === deal.id)?.committee);

   // a question taken off an agenda: a second deal put on the second meeting, then removed
   const other = await deals.createDeal({ company: 'ZZ Second Co', about: 'Тест повестки', industryKey: 'fintech', industry: '', source: 'network', amount: 100000, country: 'UZ', roundStage: 'seed' }, me.id);
   await deals.takeToScreening(other.id, me.id);
   await deals.completeScreening(other.id, me.id);
   await deals.transferDeal(other.id);
   await deals.transferDeal(other.id);
   await committee.addToAgenda(second.id, [other.id]);
   const question = (await committee.getState()).meetings.find((m) => m.id === second.id)?.agenda[0];
   await committee.removeFromAgenda(second.id, question?.id ?? '');
   // the row is gone already: the cleanup does not look for it
   const removedRow = created.findIndex(([table, guid]) => table === 'agenda_items' && guid === question?.id);
   if (removedRow >= 0) created.splice(removedRow, 1);
   clearStores();
   const emptied = (await committee.getState()).meetings.find((m) => m.id === second.id);
   const otherAfter = (await deals.getDeals()).find((d) => d.id === other.id);
   check('a question taken off the agenda: the item gone, the deal off the meeting', question?.dealId === other.id && emptied?.agenda.length === 0 && !otherAfter?.committee && !(await api.listRows('agenda_items')).some((row) => row.guid === question?.id), { question: question?.title, left: emptied?.agenda.length, committee: otherAfter?.committee });

   // ---- the card's sections the owner writes, read back from ucode (the deal is on DD)
   const { ddStreams, defaultPath, readinessOf, teamOf } = await import('@modules/Deals/helpers');
   await deals.setTerms(deal.id, { instrument: 'safe', roundSize: 1000000, preMoney: 4000000, conditions: 'ZZ Cap $15M', valuation: 'ZZ $5–9M', structure: '', founder: 'ZZ Основатель', warning: 'ZZ вне мандата' });
   await deals.setMetrics(deal.id, { hint: 'факт 2025', items: [{ label: 'GMV', value: '$4,68M', note: '×2,6', warn: true }], note: 'ZZ DD' });
   await deals.setSynergy(deal.id, [['Расчёты', 'ZZ расчётный банк']]);
   const [riskA, riskB] = [newId(), newId()];
   await deals.saveRisk(deal.id, { id: riskA, level: 'high', title: 'ZZ Оценка', note: 'расходятся', ownerId: me.id, severity: 4 });
   await deals.saveRisk(deal.id, { id: riskB, level: 'medium', title: 'ZZ Конкурент', note: '', ownerId: '' });
   await deals.saveRisk(deal.id, { id: riskA, level: 'high', title: 'ZZ Оценка cap', note: 'расходятся', ownerId: me.id, severity: 5 });
   await deals.removeRisk(deal.id, riskB);
   forget('deal_risks', riskB);
   await deals.addTeamMember(deal.id, { name: 'ZZ Lex Partners', role: 'Юр. оформление' });
   await deals.addTeamMember(deal.id, { employeeId: me.id, role: 'ZZ Спонсор' });
   const sponsorRow = (await deals.getDeals()).find((d) => d.id === deal.id)?.team?.find((m) => m.employeeId === me.id)?.id ?? '';
   await deals.removeTeamMember(deal.id, sponsorRow);
   forget('deal_team', sponsorRow);
   const lexRow = (await deals.getDeals()).find((d) => d.id === deal.id)?.team?.find((m) => m.name === 'ZZ Lex Partners')?.id ?? '';
   await deals.updateTeamMember(deal.id, lexRow, { name: 'ZZ Lex Partners', role: 'ZZ Юр. оформление' });
   await deals.addReadinessItem(deal.id, 'ZZ Обоснование исключения');
   await deals.addReadinessItem(deal.id, 'ZZ Лишний пункт');
   const ownItems = (await deals.getDeals()).find((d) => d.id === deal.id)?.readiness?.items ?? [];
   await deals.toggleReadinessItem(deal.id, ownItems[0]?.id ?? '');
   await deals.updateReadinessItem(deal.id, ownItems[0]?.id ?? '', 'ZZ Обоснование исключения v2');
   await deals.removeReadinessItem(deal.id, ownItems[1]?.id ?? '');
   forget('deal_checklists', ownItems[1]?.id ?? '');
   // the first audit of Настройки: its row comes with its first change
   const streamId = await deals.openAudit(deal.id, ddStreams((await deals.getDeals()).find((d) => d.id === deal.id)!)[0]);
   await deals.handOverWorkstream(deal.id, streamId, 'ООО «ZZ» · договор № 1');
   const handedReady = readinessOf(keys, { ...(await deals.getDeals()).find((d) => d.id === deal.id)!, stage: 'ic2' }).find((i) => i.id === `stream-${streamId}`)?.state;
   await deals.updateWorkstream(deal.id, streamId, { conclusion: 'ZZ вывод', status: 'done' });
   clearStores();
   const card = (await deals.getDeals()).find((d) => d.id === deal.id)!;
   const cardRow = (await api.listRows('deals')).find((row) => row.guid === deal.id);
   check('the terms read back: the numbers in their own fields, the wording in terms', card.terms?.instrument === 'safe' && card.terms.roundSize === 1000000 && card.terms.preMoney === 4000000 && card.terms.conditions === 'ZZ Cap $15M' && card.terms.founder === 'ZZ Основатель' && card.terms.warning === 'ZZ вне мандата' && cardRow?.instrument === 'safe' && cardRow?.round_size === 1000000 && cardRow?.terms_warning === 'ZZ вне мандата', card.terms);
   check('the metrics and the synergy read back', card.metrics?.hint === 'факт 2025' && card.metrics.items[0]?.warn === true && card.metrics.note === 'ZZ DD' && card.synergy?.[0]?.[1] === 'ZZ расчётный банк', { metrics: card.metrics, synergy: card.synergy });
   check('risks: one added and changed, one taken off — its row deleted', card.risks?.length === 1 && card.risks[0].title === 'ZZ Оценка cap' && card.risks[0].severity === 5 && !(await api.listRows('deal_risks')).some((row) => row.guid === riskB), card.risks);
   check("team: the owner's outside party kept with its role changed, a removed member gone; DD's executor from its workstream", card.team?.length === 1 && card.team[0].name === 'ZZ Lex Partners' && card.team[0].role === 'ZZ Юр. оформление' && teamOf(keys, card).some((m) => m.name === 'ООО «ZZ»' && m.role === 'ZZ Legal DD · договор № 1'), teamOf(keys, card));
   check("readiness: the owner's item ticked and reworded, the removed one gone", card.readiness?.items.length === 1 && card.readiness.items[0].text === 'ZZ Обоснование исключения v2' && card.readiness.items[0].state === 'done', card.readiness);
   const ic2Ready = readinessOf(keys, { ...card, stage: 'ic2' });
   check("readiness for ИК-2: ИК-1's decision, the terms, DD's conclusion once given, the owner's item", handedReady === 'waiting' && ['decision', 'terms', `stream-${streamId}`].every((id) => ic2Ready.find((i) => i.id === id)?.state === 'done') && ic2Ready.some((i) => i.text === 'ZZ Обоснование исключения v2' && i.state === 'done') && readinessOf(keys, card).length === 0, ic2Ready.map((i) => `${i.id}:${i.state}`));
   const path = defaultPath(keys, card);
   check('the path reads the stage history: ИК-1 passed today with its meeting, DD since today', card.stages?.some((r) => r.stage === 'ic1' && r.leftAt === today) && path.find((p) => p.stage === 'ic1')?.line2 === `ИК № ${meeting.number} · одобрено` && path.find((p) => p.stage === 'dd')?.line1 === 'с {{date}}', path.map((p) => `${p.stage}: ${p.line1} / ${p.line2}`));

   // ---- Сделки: what the card's tabs change (the deal is on DD)
   const dealNow = () => deals.getDeals().then((all) => all.find((d) => d.id === deal.id)!);
   const original = await dealNow();
   await deals.updateDetails(deal.id, { company: 'ZZ Test Co 2', about: 'ZZ изменено', industryKey: original.industryKey, industry: original.industry, source: original.source, amount: 175000, country: original.country, roundStage: original.roundStage }, me.id);
   clearStores();
   const editedDeal = await dealNow();
   await deals.updateDetails(deal.id, { company: original.company, about: original.about, industryKey: original.industryKey, industry: original.industry, source: original.source, amount: original.amount, country: original.country, roundStage: original.roundStage }, me.id);
   check("the deal's details changed, read back and in its journal", editedDeal.company === 'ZZ Test Co 2' && editedDeal.amount === 175000 && editedDeal.journal.some((e) => e.kind === 'edited'), { company: editedDeal.company, amount: editedDeal.amount, journal: editedDeal.journal.slice(0, 4).map((e) => e.kind) });
   const attachments = (await import('@shared/services/attachments')).default;
   // a request ticked as received: it closes, and the clock runs again
   await deals.addRequest(deal.id, { title: 'ZZ Отчётность за Q3', text: 'ZZ', dueDate: addWorkingDays(today, 5), folder: 'financial', ddQuestionnaire: false }, me.id);
   const waitingDeal = await dealNow();
   const dealRequestId = waitingDeal.requests!.find((r) => r.title === 'ZZ Отчётность за Q3')!.id;
   await deals.receiveRequest(deal.id, dealRequestId, me.id);
   await deals.addRequest(deal.id, { title: 'ZZ Лишний запрос', text: '', dueDate: addWorkingDays(today, 5), folder: '', ddQuestionnaire: false }, me.id);
   const extraId = (await dealNow()).requests!.find((r) => r.title === 'ZZ Лишний запрос')!.id;
   await attachments.addLink({ dealId: deal.id, section: 'request', itemId: extraId }, { title: 'ZZ к запросу', url: 'https://example.com/zz-extra' }, me.id);
   await deals.removeRequest(deal.id, extraId);
   clearStores();
   const answered = await dealNow();
   const answeredRequest = answered.requests?.find((r) => r.id === dealRequestId);
   check('a request ticked: closed, the clock runs again; a withdrawn one is gone with its link', waitingDeal.waiting && !answered.waiting && answeredRequest?.status === 'accepted' && !answered.requests?.some((r) => r.id === extraId) && !(await attachments.getAll()).some((a) => a.itemId === extraId) && answered.journal.some((e) => e.kind === 'answered'), { waiting: answered.waiting, request: answeredRequest });
   // a file the fund uploads to the data room, twice: two versions; then deleted with its file
   await deals.uploadDocument(deal.id, new File(['ZZ term sheet'], 'zz-term-sheet.txt', { type: 'text/plain' }), me.id);
   await deals.uploadDocument(deal.id, new File(['ZZ term sheet v2'], 'zz-term-sheet.txt', { type: 'text/plain' }), me.id);
   clearStores();
   const uploaded = (await dealNow()).documents?.filter((d) => d.title === 'zz-term-sheet') ?? [];
   const opened = uploaded[0]?.url ? (await fetch(uploaded[0].url)).status : 0;
   if (uploaded[0]) await deals.updateDocument(deal.id, uploaded[0].id, { title: 'zz-term-sheet-renamed', folderId: '' });
   clearStores();
   const renamedDoc = (await dealNow()).documents?.find((d) => d.id === uploaded[0]?.id)?.title;
   // a document moved into a folder of Настройки, kept by its key
   if (uploaded[1]) await deals.updateDocument(deal.id, uploaded[1].id, { title: uploaded[1].title, folderId: 'financial' });
   clearStores();
   const filed = await dealNow();
   check('a document moved into a folder of Настройки reads back there', filed.documents?.find((d) => d.id === uploaded[1]?.id)?.folderId === 'financial', filed.documents);
   for (const document of uploaded) await deals.removeDocument(deal.id, document.id);
   clearStores();
   // a request that carries a template
   await deals.addRequest(deal.id, { title: 'ZZ Анкета DD', text: 'ZZ заполните', dueDate: addWorkingDays(today, 5), folder: '', ddQuestionnaire: false }, me.id, [{ title: 'ZZ Анкета', url: template!.file!.url }]);
   const templateRequest = (await dealNow()).requests!.find((r) => r.title === 'ZZ Анкета DD')!;
   const copies = (await attachments.getAll()).filter((a) => a.section === 'request' && a.itemId === templateRequest.id);
   check('a request carries its template as a copy (no file id of its own)', copies.length === 1 && copies[0].url === template!.file!.url && copies[0].fileId === '' && copies[0].kind === 'file', { copies });
   await deals.removeRequest(deal.id, templateRequest.id);
   clearStores();
   check('a deleted request takes its copies and leaves the template', !(await attachments.getAll()).some((a) => a.itemId === templateRequest.id) && !!itemOf('docTemplates', 'zz_questionnaire')?.file);
   await settings.deleteListItem('docTemplates', template!.id, null, me.id, 'Справочник «Шаблоны документов» · удалено: ZZ', 'ZZ Анкета');
   check('the template deleted from the list', !itemOf('docTemplates', 'zz_questionnaire'));
   check('documents the fund uploads: versions 1 and 2 with their files, read back as uploaded by the fund, one renamed, then deleted', uploaded.length === 2 && uploaded.map((d) => d.version).sort().join() === '1,2' && uploaded.every((d) => d.url && d.fileId && d.handled?.kind === 'uploaded' && d.uploadedBy === 'fund' && d.uploadedById === me.id) && opened === 200 && renamedDoc === 'zz-term-sheet-renamed' && !(await dealNow()).documents?.some((d) => uploaded.some((u) => u.id === d.id)), { versions: uploaded.map((d) => d.version), kinds: uploaded.map((d) => d.handled?.kind), opened, renamedDoc });
   // a workstream changed and deleted; DD's frame
   const streamToEdit = (await dealNow()).workstreams!.find((w) => w.id === streamId)!;
   await deals.updateWorkstream(deal.id, streamToEdit.id, { name: 'ZZ Legal DD (группа)', executor: streamToEdit.executor, dueDate: addWorkingDays(today, 7), status: streamToEdit.status, conclusion: streamToEdit.conclusion });
   const renamed = (await dealNow()).workstreams?.find((w) => w.id === streamToEdit.id)?.name;
   await attachments.addLink({ dealId: deal.id, section: 'workstream', itemId: streamToEdit.id }, { title: 'ZZ отчёт', url: 'https://example.com/zz-report' }, me.id);
   await deals.removeWorkstream(deal.id, streamToEdit.id);
   await deals.setDd(deal.id, { due: addWorkingDays(today, 20), closedNote: 'ZZ 1 из 2', external: { value: '$12 000', note: 'ZZ 2 договора' }, strengths: ['ZZ рост', 'ZZ команда'], alert: { title: 'ZZ Внимание', text: 'ZZ оценка' } });
   clearStores();
   const framed = await dealNow();
   check('a workstream renamed then deleted with its report; the DD frame read back', renamed === 'ZZ Legal DD (группа)' && !framed.workstreams?.some((w) => w.id === streamToEdit.id) && !(await attachments.getAll()).some((a) => a.itemId === streamToEdit.id) && framed.dd?.external.note === 'ZZ 2 договора' && framed.dd.strengths.length === 2 && framed.dd.alert?.title === 'ZZ Внимание' && !!framed.dd.due, framed.dd);
   // links and files on the card: a link on Скрининг, a file on a request, both removed
   await attachments.addLink({ dealId: deal.id, section: 'screening' }, { title: 'ZZ Deck', url: 'https://example.com/zz-deck' }, me.id);
   const deck = (await attachments.getAll()).find((a) => a.dealId === deal.id && a.section === 'screening')!;
   await attachments.update(deck.id, { title: 'ZZ Deck v2', url: 'https://example.com/zz-deck-2' });
   await attachments.uploadFiles({ dealId: deal.id, section: 'request', itemId: dealRequestId }, [new File(['ZZ answer'], 'zz-answer.txt', { type: 'text/plain' })], me.id);
   clearStores();
   const kept = (await attachments.getAll()).filter((a) => a.dealId === deal.id);
   const fileOpens = kept.find((a) => a.kind === 'file')?.url ? (await fetch(kept.find((a) => a.kind === 'file')!.url)).status : 0;
   for (const item of kept) await attachments.remove(item.id);
   clearStores();
   check('a link (renamed, its address changed) and a file kept on the deal, then removed with the file', kept.length === 2 && kept.some((a) => a.kind === 'link' && a.section === 'screening' && a.title === 'ZZ Deck v2' && a.url === 'https://example.com/zz-deck-2') && kept.some((a) => a.kind === 'file' && a.itemId === dealRequestId && !!a.fileId) && fileOpens === 200 && !(await attachments.getAll()).some((a) => a.dealId === deal.id), kept.map((a) => `${a.kind}:${a.section}`));
   // any stage or status by hand: paused, then back in work on DD
   await deals.moveDeal(deal.id, { stage: 'dd', status: 'paused' }, 'ZZ ждём решения банка', me.id);
   clearStores();
   const paused = await dealNow();
   await deals.moveDeal(deal.id, { stage: 'dd', status: 'active' }, 'ZZ решение пришло', me.id);
   clearStores();
   const resumed = await dealNow();
   check('a deal paused by hand with a reason, then back in work, both in its journal', paused.status === 'paused' && paused.closed?.note === 'ZZ ждём решения банка' && resumed.status === 'active' && resumed.stage === 'dd' && !resumed.closed && resumed.journal.filter((e) => e.kind === 'moved').length >= 2, { paused: paused.status, resumed: resumed.status });
   // the fund's own stage: added after Анализ, moved, and a system stage that does not move
   const ownStage = { key: 'zz_check', names: { ru: 'ZZ Проверка', uz: '', en: 'ZZ Check' }, norm: '3', paused: '', escalation: 'deputy' as const, isPublic: false };
   await settings.saveStage(null, 'zz_check', ownStage, 'analysis', me.id, 'Этап «ZZ Проверка»', describeStage);
   const afterAnalysis = stageKeys();
   check("the fund's own stage stands after Анализ, before ИК-1, with its norm", afterAnalysis.indexOf('zz_check') === afterAnalysis.indexOf('analysis') + 1 && nextStageOf('analysis') === 'zz_check' && nextStageOf('zz_check') === 'ic1' && stageNorm('zz_check') === 3, afterAnalysis);
   await settings.moveStage('zz_check', -1);
   const movedUp = stageKeys();
   await settings.moveStage('ic1', 1);
   const systemMoved = stageKeys();
   await settings.moveStage('ic1', -1);
   check('any stage moves, an own one and a system one', movedUp.indexOf('zz_check') === movedUp.indexOf('analysis') - 1 && systemMoved.indexOf('ic1') === movedUp.indexOf('ic1') + 1 && stageKeys().join() === movedUp.join(), { movedUp, systemMoved });
   // a system stage deleted is turned off and listed to bring back; brought back, it stands again
   const boardUsage = await settings.stageUsage('board');
   if (boardUsage === 0) {
      await settings.deleteStage('board', null, me.id, 'Этап «Набсовет» удалён', 'Набсовет');
      clearStores();
      const withoutBoard = await settings.getSettings();
      await settings.restoreStage('board', me.id, 'Этап «Набсовет» возвращён');
      clearStores();
      const withBoard = await settings.getSettings();
      check('a system stage deleted, listed as removed, then brought back', !withoutBoard.stages.some((st) => st.key === 'board') && withoutBoard.removedStages.includes('board') && withBoard.stages.some((st) => st.key === 'board') && !withBoard.removedStages.includes('board'), { removed: withoutBoard.removedStages });
   }

   // the fund's own stage deleted with a deal on it: the deal moves to the stage chosen
   await deals.moveDeal(other.id, { stage: 'zz_check', status: 'active' }, 'ZZ проверка', me.id);
   const onOwnStage = (await deals.getDeals()).find((d) => d.id === other.id)?.stage;
   const ownUsage = await settings.stageUsage('zz_check');
   await settings.deleteStage('zz_check', 'analysis', me.id, 'Этап «ZZ Проверка» удалён', 'ZZ Проверка');
   clearStores();
   const otherAfterDelete = (await deals.getDeals()).find((d) => d.id === other.id);
   check("the fund's own stage deleted: its deal moved to the stage chosen, the stage gone", onOwnStage === 'zz_check' && ownUsage === 1 && otherAfterDelete?.stage === 'analysis' && !stageKeys().includes('zz_check'), { onOwnStage, ownUsage, after: otherAfterDelete?.stage });

   // ---- the deal closes and joins Портфель
   await deals.transferDeal(deal.id); // DD → ИК-2 (the panel's window checks the conditions; the service moves)
   await deals.transferDeal(deal.id); // → Набсовет
   await deals.transferDeal(deal.id); // → Закрытие
   const investment = { instrument: 'safe' as const, amount: 150000, date: today, stakePct: 5, valuation: 3000000 };
   const companyOf = await deals.joinPortfolio(deal.id, investment);
   const again = await deals.joinPortfolio(deal.id, investment);
   clearStores();
   const closedDeal = (await deals.getDeals()).find((d) => d.id === deal.id);
   const joined = (await portfolio.getState()).companies.filter((c) => c.dealId === deal.id);
   const investmentRows = (await api.listRows('investments')).filter((row) => row.deals_id === deal.id);
   check('a closed deal is in the portfolio with its company and first investment, once', closedDeal?.status === 'portfolio' && again === companyOf && joined.length === 1 && joined[0].id === companyOf && joined[0].invested === 150000 && joined[0].instrument === 'safe' && joined[0].since === Number(today.slice(0, 4)) && joined[0].ownerId === me.id && joined[0].industryKey === 'fintech' && investmentRows.length === 1 && investmentRows[0].kind === 'initial' && investmentRows[0].stake_pct === 5, { status: closedDeal?.status, companies: joined.map((c) => ({ id: c.id, invested: c.invested, since: c.since })), investments: investmentRows.length });
   check('the next step of a deal in the portfolio says so', nextStepOf(keys, closedDeal!).title === 'Сделка закрыта — компания в портфеле');

   // ---- Портфель: a metric of the fund's own, a quarter's figures entered, corrected and cleared
   await settings.saveListItem('metrics', null, { key: 'zz_arpu', names: { ru: 'ZZ ARPU', uz: '', en: 'ZZ ARPU' }, active: true, format: 'usd' }, me.id, 'Справочник «Показатели» · ZZ', describe);
   const quarter = (await portfolio.getState()).cycle.quarter;
   await portfolio.saveQuarterMetrics(companyOf, quarter, { zz_arpu: 12.5, mrr: 1000 });
   await portfolio.saveQuarterMetrics(companyOf, quarter, { zz_arpu: 14 });
   clearStores();
   const withMetrics = (await portfolio.getState()).companies.find((c) => c.id === companyOf);
   const valueOf = (key: string) => withMetrics?.metrics.find((m) => m.key === key)?.values[quarter];
   await portfolio.saveQuarterMetrics(companyOf, quarter, { zz_arpu: null, mrr: null });
   clearStores();
   const cleared = (await portfolio.getState()).companies.find((c) => c.id === companyOf);
   // a figure a report row holds in its own column is cleared there; a whole quarter deleted
   const { recentQuarters } = await import('@modules/Portfolio/helpers');
   const [earlier] = recentQuarters(quarter, 2);
   await api.createRow('quarter_reports', { guid: newId(), quarter: earlier, portfolio_companies_id: companyOf, mrr: 500, revenue: 900 });
   await portfolio.saveQuarterMetrics(companyOf, earlier, { zz_arpu: 11 });
   clearStores();
   const fromReport = (await portfolio.getState()).companies.find((c) => c.id === companyOf)?.metrics.find((m) => m.key === 'mrr')?.values[earlier];
   await portfolio.saveQuarterMetrics(companyOf, earlier, { mrr: null });
   clearStores();
   const afterClear = (await portfolio.getState()).companies.find((c) => c.id === companyOf);
   await portfolio.deleteQuarterMetrics(companyOf, earlier);
   clearStores();
   const afterDelete = (await portfolio.getState()).companies.find((c) => c.id === companyOf);
   const at = (company: typeof afterClear, key: string) => company?.metrics.find((m) => m.key === key)?.values[earlier];
   check("a report column's figure cleared there; a quarter's figures all deleted", fromReport === 500 && at(afterClear, 'mrr') == null && at(afterClear, 'revenue') === 900 && at(afterClear, 'zz_arpu') === 11 && afterDelete?.metrics.every((m) => m.values[earlier] == null), { fromReport, mrr: at(afterClear, 'mrr'), revenue: at(afterClear, 'revenue'), left: afterDelete?.metrics.filter((m) => m.values[earlier] != null).map((m) => m.key) });
   const metricId = itemOf('metrics', 'zz_arpu')!.id;
   const metricUsage = await settings.usageOf('metrics', metricId);
   await settings.deleteListItem('metrics', metricId, null, me.id, 'Справочник «Показатели» · удалено: ZZ', 'ZZ ARPU');
   check("a quarter's figures entered, corrected and cleared; the unused metric deleted", valueOf('zz_arpu') === 14 && valueOf('mrr') === 1000 && withMetrics?.metrics.find((m) => m.key === 'zz_arpu')?.format === 'usd' && cleared?.metrics.find((m) => m.key === 'zz_arpu')?.values[quarter] == null && metricUsage === 0 && !itemOf('metrics', 'zz_arpu'), { arpu: valueOf('zz_arpu'), mrr: valueOf('mrr'), metricUsage });

   // ---- Документы
   const docId = await documents.addDocument({ category: 'corporate', title: 'ZZ Положение', note: 'ZZ проект', approvedBy: 'board', status: 'draft', date: today, link: 'https://example.com/zz' }, me.id);
   const firstOrder = await documents.nextOrderNumber();
   const firstNumber = Number(firstOrder.match(/\d+/)?.[0]);
   await documents.addDocument({ category: 'orders', title: `${firstOrder} от ZZ`, note: 'ZZ О комиссии', approvedBy: 'director', status: 'active', date: today, link: '' }, me.id);
   const secondOrder = await documents.nextOrderNumber();
   check('orders are numbered in the year: the next one after a new order', secondOrder === `№ ${firstNumber + 1}Р`, { firstOrder, secondOrder });
   await documents.updateDocument(docId, { category: 'corporate', title: 'ZZ Положение', note: 'ZZ утверждено', approvedBy: 'board', status: 'active', date: today, link: 'https://example.com/zz2' });
   const issueId = await documents.addIssue({ title: 'ZZ Вопрос управления', note: 'ZZ ждём ответа банка', ownerId: me.id });
   await documents.setIssueStatus(issueId, 'resolved');
   clearStores();
   const docsState = await documents.getState();
   const doc = docsState.documents.find((d) => d.id === docId);
   const issue = docsState.issues.find((i) => i.id === issueId);
   check('a document read back from ucode, changed', doc && doc.status === 'active' && doc.note === 'ZZ утверждено' && doc.link === 'https://example.com/zz2' && doc.approvedBy === 'board' && doc.date === today && doc.createdById === me.id, doc);
   check('a governance question added and resolved', issue && issue.status === 'resolved' && issue.resolvedAt === today && issue.ownerId === me.id, issue);

   // ---- sign-in refusal
   const { login } = api;
   let refused = false;
   try {
      await login(process.env.UCODE_LOGIN ?? '', 'wrong-password');
   } catch (error) {
      refused = error instanceof api.UcodeError && error.status >= 400 && error.status < 500;
   }
   check('a wrong password is refused with a 4xx', refused);
} catch (error) {
   failures++;
   console.log('✗ the run stopped:', error);
} finally {
   // ---- put everything back
   if (settingsRow)
      await api.updateRow('fund_settings', {
         guid: settingsRow.guid,
         check_min: settingsRow.check_min ?? null,
         check_max: settingsRow.check_max ?? null,
         focus_text: settingsRow.focus_text ?? null,
         excluded_text: settingsRow.excluded_text ?? null,
         flag_churn_pct: settingsRow.flag_churn_pct ?? null,
      });
   // the stages as they were: their norms, names and places
   for (const row of normRows)
      await api.updateRow('stage_norms', { guid: row.guid, norm_text: row.norm_text ?? null, norm_days: row.norm_days ?? null, sort_order: row.sort_order ?? null, name_ru: row.name_ru ?? null, name_uz: row.name_uz ?? null, name_en: row.name_en ?? null, escalate_to: row.escalate_to ?? null, paused_when: row.paused_when ?? null, is_public: row.is_public ?? false, is_active: row.is_active ?? null });
   for (const row of roundRows) await api.updateRow('round_stages', { guid: row.guid, sort_order: row.sort_order ?? null });
   // children before their parents: the reverse of the order they were made in
   let left = 0;
   for (const [table, guid] of [...created].reverse())
      try {
         await api.deleteRow(table, guid);
      } catch {
         // a row the run deleted itself is gone already
         const still = (await api.listRows(table, { guid }).catch(() => [])).some((row) => row.guid === guid);
         if (still) left++;
      }
   const restored = (await api.listRows('fund_settings'))[0];
   check(`cleanup: the ${created.length} rows this run made deleted`, !left, left ? `${left} could not be deleted` : '');
   check('cleanup: fund settings and norms put back', restored?.flag_churn_pct === settingsRow?.flag_churn_pct && (restored?.check_max ?? null) === (settingsRow?.check_max ?? null));
   if (process.env.PANEL_TEST_WRITES) {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(process.env.PANEL_TEST_WRITES, JSON.stringify(Object.fromEntries([...writes].map(([table, fields]) => [table, [...fields].sort()])), null, 1));
   }
   console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
   process.exit(failures ? 1 : 0);
}

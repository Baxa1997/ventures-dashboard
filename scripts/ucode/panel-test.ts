/* The panel's own services against the ucode test project, run by
   panel-test.mjs: signs in through the panel's sign-in (the login and password
   of UCODE_LOGIN and UCODE_PASSWORD; the user needs an employees row with the
   director's role, auth.mjs link) and works through Настройки, Сделки, Работа,
   Портфель, Инвесткомитет, Документы, Договоры and Закупки, reading back from ucode what each step wrote.
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
// --dry-run: nothing is written to ucode (panel-test-memory.ts)
const dry = process.env.PANEL_TEST_DRY
   ? (await import('./panel-test-memory')).memoryFetch(globalThis.fetch, process.env.PANEL_TEST_API_KEY ?? '', import.meta.env.VITE_UCODE_ENVIRONMENT_ID ?? '', 'https://api.admin.u-code.io', JSON.parse(process.env.PANEL_TEST_PENDING ?? '{}'), true)
   : null;
const realFetch = dry?.fetchInMemory ?? globalThis.fetch;
// with --dry-run, the fields the services read that their tables do not have
const missingReads = dry ? (await import('./panel-test-memory')).trackMissingReads() : new Set<string>();
// run with the project's API key instead of a user (panel-test.mjs): the
// sign-in is answered here with the director's user, and calls carry the key
const API_KEY = process.env.PANEL_TEST_API_KEY;
const withKey = (init?: RequestInit): RequestInit => {
   const headers = new Headers(init?.headers);
   headers.set('Authorization', 'API-KEY');
   headers.set('X-API-KEY', API_KEY ?? '');
   return { ...init, headers };
};
const keyLogin = async (url: string) => {
   const environment = new URL(url).origin.replace('api.auth.', 'api.admin.');
   const reply = await realFetch(`${environment}/v2/items/employees?data=${encodeURIComponent(JSON.stringify({ limit: 200, offset: 0 }))}`, withKey({ headers: { 'Environment-Id': import.meta.env.VITE_UCODE_ENVIRONMENT_ID ?? '' } }));
   const rows = ((await reply.json()) as { data?: { data?: { response?: { user_id?: string; role?: string; is_active?: boolean }[] } } }).data?.data?.response ?? [];
   const director = rows.find(({ user_id, role }) => user_id && role === 'director');
   return new Response(JSON.stringify({ data: { token: { access_token: 'api-key', refresh_token: 'api-key' }, user_id_auth: director?.user_id ?? '' } }), { status: 200 });
};
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
   if (API_KEY && String(input).includes('/v2/login')) return keyLogin(String(input));
   if (API_KEY) init = withKey(init);
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
await signIn(process.env.UCODE_LOGIN ?? 'api-key', process.env.UCODE_PASSWORD ?? 'api-key', true);
for (let i = 0; i < 50 && !TEAM.length; i++) await sleep(200);
const me = TEAM.find(({ role }) => role === 'director');
check('signed in; the team read from employees, the user a director', me, TEAM);
if (!me) process.exit(1);
const today = todayISO();

// the ucode user the run makes through Настройки, taken back at the end
let invitedUserId = '';
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

   const invitedLogin = await settings.invite({ name: 'Тест Сотрудник', email: 'test.employee@example.com', position: 'Аналитик', role: 'analyst', roles: ['analyst'], access: 'work' }, me.id, 'ZZ');
   const invited = (await settings.getSettings()).staff.find((m) => m.email === 'test.employee@example.com');
   check('a new user gets an employees row and a sign-in', invited && invited.addedAt === today && invited.role === 'analyst' && invited.userId && invitedLogin.login === 'test.employee@example.com' && invitedLogin.password.length === 12, invited);
   check('the team includes the invited employee', TEAM.some(({ id }) => id === invited?.id));
   invitedUserId = invited?.userId ?? '';

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
   const lastPlace = listOf('rounds', true).findIndex((item) => item.id === added!.id);
   await settings.moveListItem('rounds', added!.id, lastPlace - 1);
   const moved = orderOf();
   await settings.moveListItem('rounds', added!.id, lastPlace);
   check('a row moves up the list and back', moved !== orderBefore && moved.indexOf('zz_series_b') < orderBefore.indexOf('zz_series_b') && orderOf() === orderBefore, { orderBefore, moved, after: orderOf() });

   // ---- Настройки: a document template with its file (batch 9)
   await settings.saveListItem('docTemplates', null, { key: 'zz_questionnaire', names: { ru: 'ZZ Анкета', uz: 'ZZ Anketa', en: 'ZZ Questionnaire' }, active: true, file: { id: '', url: 'https://example.com/zz-questionnaire.xlsx', name: 'zz-questionnaire.xlsx' } }, me.id, 'Справочник «Шаблоны документов» · ZZ', describe);
   clearStores();
   await settings.getSettings();
   const template = itemOf('docTemplates', 'zz_questionnaire');
   check('a document template saved with its file and read back from ucode', template?.file?.url === 'https://example.com/zz-questionnaire.xlsx' && template.file.name === 'zz-questionnaire.xlsx' && template.names.uz === 'ZZ Anketa', template);

   // ---- Настройки: a task status and a metric of the fund's own, deleted with what used them moved on
   await settings.saveListItem('taskStatuses', null, { key: 'zz_hold', names: { ru: 'ZZ На удержании', uz: '', en: 'ZZ On hold' }, active: true, group: 'progress', tone: 'warning', color: '#5764ca' }, me.id, 'Справочник «Статусы задач» · ZZ', describe);
   await settings.saveListItem('taskStatuses', null, { key: 'zz_signed', names: { ru: 'ZZ Подписана', uz: '', en: 'ZZ Signed' }, active: true, group: 'complete', tone: 'success' }, me.id, 'Справочник «Статусы задач» · ZZ', describe);
   const { isDone, statusColor, statusGroup } = await import('@modules/Work/helpers');
   clearStores();
   await settings.getSettings();
   check("a status's own colour read back from ucode", statusColor('zz_hold') === '#5764ca', itemOf('taskStatuses', 'zz_hold'));
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
   const upcoming = await work.getUpcoming(me.id);
   // a stage's deadline shows within a week of it
   const dueThisWeek = (await deals.getDeals()).find((d) => d.id === deal.id)!.next!.dueDate <= addWorkingDays(today, 5);
   check("Мой день's coming dates: the deal's stage deadline, when due within the week", upcoming.some((item) => item.kind === 'stage' && item.dealId === deal.id) === dueThisWeek, upcoming.map((item) => `${item.kind}:${item.date}`));
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
   await portfolio.confirmMetrics(companyId, '2026-Q3', me.id);
   await portfolio.answerRequest(requestId, 'Познакомили');
   const after = await portfolio.getState();
   check('metrics confirmed and the request answered', after.companies.find((c) => c.id === companyId)?.reports['2026-Q3']?.metrics === 'confirmed' && after.requests.find((r) => r.id === requestId)?.status === 'closed');
   const overview = await work.getDashboard();
   check('the dashboard: the deals, the portfolio with what is invested, the funnel', overview.deals.inWork >= 1 && overview.portfolio.companies >= 1 && overview.portfolio.invested >= 150000 && overview.funnel.length > 0, { deals: overview.deals, portfolio: overview.portfolio, funnel: overview.funnel });

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
   const weekAhead = await work.getUpcoming(me.id);
   check("the meeting is among Мой день's coming dates", weekAhead.some((item) => item.kind === 'meeting' && item.meetingId === meeting.id), weekAhead.filter((item) => item.kind === 'meeting'));
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
   check("a meeting planned for later carries the day it met, for its decisions", meeting.date > today && held?.date === today && state.decisions.find((d) => d.meetingId === meeting.id)?.date === today, { planned: meeting.date, held: held?.date });
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
   check("team: the owner's outside party kept with its role changed, a removed member gone; DD's executor from its workstream", card.team?.length === 1 && card.team[0].name === 'ZZ Lex Partners' && card.team[0].role === 'ZZ Юр. оформление' && teamOf(keys, card).some((m) => m.name === 'ООО «ZZ»' && m.role === `${card.workstreams?.find((w) => w.id === streamId)?.name} · договор № 1`), teamOf(keys, card));
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
   await settings.getSettings();
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
   await settings.moveStage('zz_check', stageKeys().indexOf('zz_check') - 1);
   const movedUp = stageKeys();
   await settings.moveStage('ic1', movedUp.indexOf('ic1') + 1);
   const systemMoved = stageKeys();
   await settings.moveStage('ic1', movedUp.indexOf('ic1'));
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

   // ---- the whole road: one deal from the inbox to Портфель, leaving each stage only
   // when the panel's own conditions (what opens «Перевести») are met
   const { answeredSections, isUntouchedAudit, placeOf, roomFolders, scoreOf, scoreRows, weightedScore } = await import('@modules/Deals/helpers');
   const { isBuiltIn, questionnaireOf } = await import('@modules/Settings/services');
   const { tallyVotes } = await import('@modules/Committee/helpers');
   const { positionOf } = await import('@modules/Portfolio/helpers');
   const lists = ['docFolders', 'ddAudits', 'criteria'] as const;
   check("Настройки's lists of batches 16 and 17 are ucode's rows, not the built-in ones", lists.every((kind) => listOf(kind).length > 0 && !listOf(kind).some(isBuiltIn)) && listOf('docFolders').length === 7 && listOf('ddAudits').length === 3 && listOf('criteria').reduce((sum, { weight }) => sum + (weight ?? 0), 0) === 100, Object.fromEntries(lists.map((kind) => [kind, listOf(kind).map(({ key }) => key)])));
   // a row added to each: on every deal at once, read back from ucode
   await settings.saveListItem('docFolders', null, { key: 'zz_patents', names: { ru: 'ZZ Патенты', uz: '', en: '' }, active: true }, me.id, 'Справочник · ZZ', describe);
   await settings.saveListItem('ddAudits', null, { key: 'zz_esg', names: { ru: 'ZZ ESG-аудит', uz: '', en: '' }, active: true }, me.id, 'Справочник · ZZ', describe);
   await settings.saveListItem('criteria', null, { key: 'zz_esg', names: { ru: 'ZZ ESG', uz: '', en: '' }, hints: { ru: 'ZZ подсказка', uz: '', en: '' }, weight: 10, active: true }, me.id, 'Справочник · ZZ', describe);
   // the founder's questions: one added, kept in fund_settings for the panel and the cabinet
   const questions = questionnaireOf();
   await settings.saveQuestionnaire([{ ...questions[0], fields: [...questions[0].fields, { id: 'zz_question', kind: 'text', label: { ru: 'ZZ Вопрос', uz: '', en: '' } }] }, ...questions.slice(1)], me.id, { field: 'Анкета основателя · ZZ', from: '', to: 'ZZ Вопрос' });
   clearStores();
   const withRows = await settings.getSettings();
   check('a folder, an audit and a criterion added, and a question: read back', itemOf('docFolders', 'zz_patents')?.names.ru === 'ZZ Патенты' && itemOf('ddAudits', 'zz_esg')?.active && itemOf('criteria', 'zz_esg')?.weight === 10 && itemOf('criteria', 'zz_esg')?.hints?.ru === 'ZZ подсказка' && withRows.questionnaireStored && questionnaireOf()[0].fields.at(-1)?.id === 'zz_question', { questionnaireStored: withRows.questionnaireStored });

   const road = await deals.createDeal({ company: 'ZZ Road Co', about: 'ZZ весь путь', legalName: 'ZZ Road LLC', tin: '123456789', foundedYear: 2021, employees: 12, website: 'zz-road.example.com', applicantEmail: 'zz.road@example.com', applicantPhone: '+998900000000', industryKey: 'fintech', industry: '', source: 'network', amount: 150000, country: 'UZ', roundStage: 'seed' }, me.id);
   const roadNow = async () => {
      clearStores();
      await settings.getSettings();
      return (await deals.getDeals()).find((d) => d.id === road.id)!;
   };
   const conditions = async () => exitConditions(keys, await roadNow(), await work.getTasks());
   // the conditions of the stage: each met, or the move stays off
   const leaves = async (stage: string) => {
      const current = await roadNow();
      const exit = exitConditions(keys, current, await work.getTasks());
      check(`road: «${stage}» can be left, every condition met`, current.stage === stage && exit.every((item) => item.state === 'done'), { stage: current.stage, exit: exit.map((item) => `${item.id}:${item.state}`) });
   };
   await deals.setOwners(road.id, [{ name: 'ZZ Основатель', role: 'CEO', share: 70 }, { name: 'ZZ Партнёр', role: 'CTO', share: 30 }]);
   const detailed = await roadNow();
   check("the company's details and its capital read back", detailed.legalName === 'ZZ Road LLC' && detailed.tin === '123456789' && detailed.foundedYear === 2021 && detailed.employees === 12 && detailed.website === 'zz-road.example.com' && detailed.owners?.length === 2 && detailed.owners[0].share === 70, { legalName: detailed.legalName, tin: detailed.tin, owners: detailed.owners });

   // Скрининг
   await deals.takeToScreening(road.id, me.id);
   const unscored = await conditions();
   check('road: Скрининг holds until scored and a second reviewer chosen', unscored.some((item) => item.id === 'score' && item.state !== 'done') && unscored.some((item) => item.id === 'second' && item.state !== 'done'), unscored.map((item) => `${item.id}:${item.state}`));
   for (const { item } of scoreRows(await roadNow())) await deals.setCriterion(road.id, item.key, { score: item.key === 'team' ? 5 : 4, rationale: 'ZZ обоснование' });
   await deals.setScreening(road.id, { decision: 'meeting', secondId: invited!.id });
   await deals.setScreeningNote(road.id, { essence: 'ZZ общий комментарий', whyNow: '', redFlags: '', questions: '' });
   const scored = await roadNow();
   const scoreExpected = (5 * 25 + 4 * 85) / 110; // the six of ucode and ZZ ESG: weights 25, then 85 in all
   check('the score is the sum weighted by the criteria, and the comment read back', Math.abs((scoreOf(scored) ?? 0) - scoreExpected) < 0.001 && Math.abs((weightedScore(scoreRows(scored)) ?? 0) - scoreExpected) < 0.001 && scored.screening?.note?.essence === 'ZZ общий комментарий', { score: scoreOf(scored), scoreExpected });
   await deals.setAnswer(road.id, 'zz_question', 'ZZ ответ фонда', me.id);
   await deals.setAnswer(road.id, 'zz_question', 'ZZ ответ фонда v2', me.id);
   const answered2 = await roadNow();
   const answerRows = (await api.listRows('deal_questionnaires')).filter((row) => row.deals_id === road.id);
   check('an answer to the new question: one row, changed, who wrote it read back', answerRows.length === 1 && answered2.questionnaire?.values.zz_question === 'ZZ ответ фонда v2' && answered2.questionnaire.updatedById === me.id && answeredSections(answered2) === 0, answered2.questionnaire);
   await leaves('screening');
   await deals.completeScreening(road.id, me.id);
   await leaves('meeting');
   await deals.transferDeal(road.id);
   await leaves('analysis');
   await deals.transferDeal(road.id);

   // three members, as the quorum asks
   const roadMembers = [];
   for (const name of ['ZZ Р. Председатель', 'ZZ Р. Член', 'ZZ Р. Независимый']) roadMembers.push(await committee.addMember({ name, role: name.includes('Председатель') ? 'chair' : 'independent', remote: false, contract: '' }));
   // a meeting from start to the signed protocol, as its screens run it
   const holdMeeting = async (body: 'ic' | 'board', stage: 'ic1' | 'ic2' | null, terms = '') => {
      const label = stage ?? body;
      const planned = await committee.scheduleMeeting({ body, stage, date: today, time: '10:00', format: 'Очно', dealIds: [road.id], participantIds: roadMembers });
      check(`road: ${label}: the deal is on the agenda, and its card points at the meeting`, planned.agenda.length === 1 && (await roadNow()).committee?.id === planned.id, planned.agenda.map((i) => i.title));
      check(`road: ${label}: the next step is the wait for the meeting, not yet the move`, nextStepOf(keys, await roadNow(), await work.getTasks()).ready === undefined);
      for (const id of roadMembers) await committee.setAttendance(planned.id, id, 'confirmed');
      await committee.sendMaterials(planned.id);
      const ready = (await committee.getState());
      check(`road: ${label}: ready to open`, preparationOf(ready.meetings.find((m) => m.id === planned.id)!, ready.members).ready, preparationOf(ready.meetings.find((m) => m.id === planned.id)!, ready.members));
      await committee.startMeeting(planned.id);
      const question = planned.agenda[0];
      for (const id of roadMembers) await committee.setVote(planned.id, question.id, id, 'for');
      if (terms) await committee.setProtocol(planned.id, question.id, 'conditions', terms);
      const voted = await committee.getState();
      const liveMeeting = voted.meetings.find((m) => m.id === planned.id)!;
      const tally = tallyVotes(liveMeeting, voted.members, liveMeeting.agenda[0]);
      check(`road: ${label}: three «за» approve under the fund's rules`, tally.state === 'approved' && tally.for === 3, tally);
      await committee.decide(planned.id, question.id, terms ? 'approved_conditions' : 'approved');
      await committee.formProtocol(planned.id, me.id);
      await committee.signProtocol(planned.id, 'https://example.com/zz-road');
      return planned;
   };

   // ИК-1, with a condition
   const beforeIc1 = await conditions();
   check('road: ИК-1 holds until the committee approves', beforeIc1.some((item) => item.id === 'committee' && item.state !== 'done'), beforeIc1.map((item) => `${item.id}:${item.state}`));
   const ic1Meeting = await holdMeeting('ic', 'ic1', 'ZZ условие ИК-1');
   const afterIc1 = await roadNow();
   const ic1Decision = afterIc1.decisions?.find((d) => d.stage === 'ic1');
   check("the decision's parts for its tab: the outcome, the date, the conditions, the meeting", ic1Decision?.verdict === 'approved' && ic1Decision.result === 'approved_conditions' && ic1Decision.date === today && ic1Decision.conditions === 'ZZ условие ИК-1' && ic1Decision.meetingId === ic1Meeting.id && !!ic1Decision.meetingLabel, ic1Decision);
   check('road: after ИК-1 the next step is the move, with its button', !!nextStepOf(keys, afterIc1, await work.getTasks()).ready);
   await leaves('ic1');
   await deals.transferDeal(road.id);

   // DD: every audit of Настройки done, with its conclusion; the condition of ИК-1 met
   const heldOnDd = await conditions();
   check("road: DD holds until ИК-1's condition is met", heldOnDd.some((item) => item.id === 'conditions' && item.state !== 'done'), heldOnDd.map((item) => `${item.id}:${item.state}`));
   const audits = ddStreams(await roadNow());
   check("road: DD has a card per audit of Настройки, the new one too, before any is touched", audits.length === 4 && audits.every(isUntouchedAudit) && audits.some((a) => a.auditKey === 'zz_esg'), audits.map((a) => a.name));
   for (const audit of audits) {
      const opened2 = await deals.openAudit(road.id, audit);
      await deals.handOverWorkstream(road.id, opened2, me.id);
      await deals.updateWorkstream(road.id, opened2, { status: 'done', verdict: 'positive', conclusion: 'ZZ заключение' });
   }
   const auditsDone = await roadNow();
   const auditRows = (await api.listRows('workstreams')).filter((row) => row.deals_id === road.id);
   check('road: the audits read back: their key, status, conclusion and its date; still one card each', ddStreams(auditsDone).length === 4 && auditsDone.workstreams?.every((w) => w.status === 'done' && w.verdict === 'positive' && w.concludedAt === today && w.conclusion === 'ZZ заключение') && audits.every((a) => auditRows.some((row) => row.audit_type === a.auditKey)), auditsDone.workstreams);
   const conditionTask2 = (await work.getTasks()).find((item) => item.relationId === road.id && item.origin === 'ic_condition');
   await committee.setTaskDone(conditionTask2?.id ?? '', true, me.id);
   // the data room, on the folders of Настройки
   await deals.addRequest(road.id, { title: 'ZZ Финмодель', text: 'ZZ', dueDate: addWorkingDays(today, 5), folder: 'financial', ddQuestionnaire: false }, me.id);
   const asked = (await roadNow()).requests?.find((r) => r.title === 'ZZ Финмодель');
   await deals.uploadDocument(road.id, new File(['ZZ модель'], 'zz-model.txt', { type: 'text/plain' }), me.id, 'financial');
   await deals.uploadDocument(road.id, new File(['ZZ патент'], 'zz-patent.txt', { type: 'text/plain' }), me.id, 'zz_patents');
   const withFiles = await roadNow();
   const model = withFiles.documents?.find((d) => d.title === 'zz-model');
   const patent = withFiles.documents?.find((d) => d.title === 'zz-patent');
   check("the data room: a request's folder, a file's folder and size read back; the folders of Настройки on the deal", asked?.folder === 'financial' && model?.folderId === 'financial' && (model?.size ?? 0) > 0 && placeOf(withFiles, model!) === 'financial' && roomFolders(withFiles).some(({ id }) => id === 'zz_patents') && withFiles.waiting === true, { folder: asked?.folder, size: model?.size, place: model && placeOf(withFiles, model) });
   await deals.receiveRequest(road.id, asked?.id ?? '', me.id);
   // a folder in use is deleted with where its files go; an audit and a criterion in use, too
   const folderId = itemOf('docFolders', 'zz_patents')!.id;
   const folderUsage = await settings.usageOf('docFolders', folderId);
   await settings.deleteListItem('docFolders', folderId, 'legal', me.id, 'Справочник · удалено: ZZ', 'ZZ Патенты');
   const movedOver = await roadNow();
   check('a folder in use deleted: its files move to the folder chosen', folderUsage === 1 && movedOver.documents?.find((d) => d.id === patent?.id)?.folderId === 'legal' && !roomFolders(movedOver).some(({ id }) => id === 'zz_patents'), { folderUsage, folder: movedOver.documents?.find((d) => d.id === patent?.id)?.folderId });
   await leaves('dd');
   await deals.transferDeal(road.id);

   // ИК-2 and the director
   await holdMeeting('ic', 'ic2');
   const beforeDirector = await conditions();
   check('road: after ИК-2 the director still confirms', beforeDirector.some((item) => item.id === 'director' && item.state !== 'done') && beforeDirector.some((item) => item.id === 'committee' && item.state === 'done'), beforeDirector.map((item) => `${item.id}:${item.state}`));
   await deals.approveTransfer(road.id, me.id);
   await leaves('ic2');
   await deals.transferDeal(road.id);

   // Набсовет, Закрытие, Портфель
   await holdMeeting('board', null);
   await leaves('board');
   await deals.transferDeal(road.id);
   await leaves('closing');
   const roadCompany = await deals.joinPortfolio(road.id, { instrument: 'safe', amount: 150000, date: today, stakePct: 5, valuation: 3000000 });
   const inPortfolio = await roadNow();
   const companyNow = async () => {
      clearStores();
      await settings.getSettings();
      return (await portfolio.getState()).companies.find((c) => c.id === roadCompany)!;
   };
   const roadInvestments = (await api.listRows('investments')).filter((row) => row.portfolio_companies_id === roadCompany);
   const boardDecision = inPortfolio.decisions?.find((d) => d.stage === 'board');
   check("road: the deal is in the portfolio, with its company and its investment tied to the board's approval", inPortfolio.status === 'portfolio' && roadInvestments.length === 1 && roadInvestments[0].kind === 'initial' && roadInvestments[0].decisions_id === boardDecision?.id && inPortfolio.decisions?.map((d) => d.stage).sort().join() === 'board,ic1,ic2', { status: inPortfolio.status, investments: roadInvestments.length, decisions: inPortfolio.decisions?.map((d) => d.stage) });

   // Портфель: the position, the valuation, a pilot, a data request, the exit, a follow-on
   const position = positionOf(await companyNow());
   await portfolio.setValuation(roadCompany, 6000000);
   const revalued = positionOf(await companyNow());
   check('the position: the stake at the valuation, MOIC from what was invested', position.value === 150000 && position.moic === 1 && revalued.value === 300000 && revalued.moic === 2, { position, revalued });
   await portfolio.addPilot(roadCompany, { title: 'ZZ Пилот', customer: 'SQB', status: 'in_progress', startedAt: today, endedAt: '', note: 'ZZ цель' });
   const pilot = (await companyNow()).pilots.find((p) => p.title === 'ZZ Пилот');
   await portfolio.updatePilot(pilot?.id ?? '', { title: 'ZZ Пилот 2', customer: 'SQB', status: 'in_progress', startedAt: today, endedAt: '', note: 'ZZ цель' });
   const pilotChanged = (await companyNow()).pilots.find((p) => p.id === pilot?.id)?.title;
   await portfolio.removePilot(pilot?.id ?? '');
   forget('pilots', pilot?.id ?? '');
   check('a pilot added, changed, deleted', pilotChanged === 'ZZ Пилот 2' && !(await companyNow()).pilots.some((p) => p.id === pilot?.id));
   await portfolio.addDataRequest(roadCompany, { title: 'ZZ Данные', text: 'ZZ', dueDate: addWorkingDays(today, 5) }, me.id);
   const dataRequest = (await portfolio.getState()).dataRequests.find((r) => r.companyId === roadCompany);
   await portfolio.recordDataAnswer(dataRequest?.id ?? '', 'ZZ ответ');
   await portfolio.acceptDataAnswer(dataRequest?.id ?? '');
   clearStores();
   const dataAfter = (await portfolio.getState()).dataRequests.find((r) => r.id === dataRequest?.id);
   check('a data request asked, answered and accepted', dataRequest?.title === 'ZZ Данные' && dataAfter?.status === 'accepted' && dataAfter.answer === 'ZZ ответ', dataAfter);
   await portfolio.recordExit(roadCompany, { status: 'exit', date: today, proceeds: 450000, type: 'strategic', buyer: 'ZZ Покупатель' });
   const exited = await companyNow();
   check("an exit's details read back from their fields, MOIC from what it brought", exited.status === 'exit' && exited.exit?.date === today && exited.exit.proceeds === 450000 && exited.exit.type === 'strategic' && exited.exit.buyer === 'ZZ Покупатель' && positionOf(exited).moic === 3 && (await portfolio.getState()).exitFields, exited.exit);
   await portfolio.reopenCompany(roadCompany);
   const reopened = await companyNow();
   check('an exit taken back: active again, its details gone', reopened.status === 'active' && !reopened.exit?.proceeds, reopened.exit);
   const followOn = await deals.createDeal({ company: 'ZZ Road Co · follow-on', about: 'ZZ', legalName: '', tin: '', foundedYear: null, employees: null, website: '', applicantEmail: '', applicantPhone: '', industryKey: 'fintech', industry: '', source: 'network', amount: 100000, country: 'UZ', roundStage: 'seed' }, me.id);
   await deals.takeToScreening(followOn.id, me.id);
   await deals.moveDeal(followOn.id, { stage: 'closing', status: 'active' }, 'ZZ', me.id);
   const followOnCompany = await deals.joinPortfolio(followOn.id, { instrument: 'safe', amount: 100000, date: today, stakePct: 2, valuation: 7000000 });
   const afterFollowOn = await companyNow();
   const roadCompanies = (await portfolio.getState()).companies.filter((c) => c.name.startsWith('ZZ Road Co'));
   check('a follow-on adds to the company instead of making a second one', followOnCompany === roadCompany && roadCompanies.length === 1 && afterFollowOn.invested === 250000 && afterFollowOn.investments?.some((i) => i.kind === 'follow_on'), { invested: afterFollowOn.invested, companies: roadCompanies.map((c) => c.name) });

   // a company reports from the quarter the fund first paid in
   const { owesReport } = await import('@modules/Portfolio/helpers');
   const reporting = await portfolio.getState();
   const fresh = reporting.companies.find((c) => c.id === roadCompany)!;
   check('a company that joined today owes no report on a closed quarter, and the dashboard does not ask for one', !owesReport(fresh, reporting.cycle.quarter) && owesReport(fresh, today.slice(0, 4) + '-Q' + (Math.floor((Number(today.slice(5, 7)) - 1) / 3) + 1)) && !(await work.getDashboard()).attention.some((item) => item.kind === 'report' && item.companyId === roadCompany), { cycle: reporting.cycle.quarter });

   // Документы: what the file manager lists comes from the deal, the meeting and the fund
   await attachments.uploadFiles({ section: 'committee', itemId: ic1Meeting.agenda[0].id }, [new File(['ZZ'], 'zz-minutes.txt', { type: 'text/plain' })], me.id);
   clearStores();
   await settings.getSettings();
   const allFiles = await attachments.getAll();
   const committeeFile = allFiles.find((a) => a.section === 'committee' && a.itemId === ic1Meeting.agenda[0].id);
   check("Документы: a question's file kept against it", committeeFile?.title === 'zz-minutes.txt' || committeeFile?.title === 'zz-minutes', committeeFile);
   if (committeeFile) await attachments.remove(committeeFile.id);

   // the rows added to Настройки, taken off
   await settings.deleteListItem('ddAudits', itemOf('ddAudits', 'zz_esg')!.id, null, me.id, 'Справочник · удалено: ZZ', 'ZZ ESG-аудит');
   await settings.deleteListItem('criteria', itemOf('criteria', 'zz_esg')!.id, null, me.id, 'Справочник · удалено: ZZ', 'ZZ ESG');
   created.splice(0, created.length, ...created.filter(([table]) => !['doc_folders', 'dd_audit_types', 'screening_criteria'].includes(table)));

   // Задачи: the start date and the moments (batch 14)
   const dated = await work.createTask({ title: 'ZZ задача с началом', type: 'other', context: '', details: '', relation: 'none', relationId: '', assigneeId: me.id, reviewerId: '', startDate: today, dueDate: addWorkingDays(today, 3), priority: 'low', status: 'assigned', recurrence: 'none', checklist: [] }, me.id);
   await work.updateTask(dated.id, { status: 'in_progress' }, me.id);
   await work.updateTask(dated.id, { status: 'done' }, me.id);
   await work.reloadTasks();
   const datedNow = (await work.getTasks()).find((item) => item.id === dated.id);
   check("a task's start date and when it began and ended read back from ucode", work.hasStampFields() && datedNow?.startDate === today && !!datedNow.stamps.started && !!datedNow.stamps.finished, datedNow?.stamps);

   // ---- the deal that comes back, the founder's file and answer, and what the founder sees
   const { RESUBMIT_LABELS } = await import('@modules/Deals/constants');
   const applied = await deals.createDeal({ company: 'ZZ From Site', about: 'ZZ', legalName: '', tin: '', foundedYear: null, employees: null, website: '', applicantEmail: 'zz.site@example.com', applicantPhone: '', industryKey: 'fintech', industry: '', source: 'network', amount: 100000, country: 'UZ', roundStage: 'seed' }, me.id);
   const applicationId = newId();
   await api.createRow('applications', { guid: applicationId, email: 'zz.site@example.com', public_status: 'submitted' });
   await api.updateRow('deals', { guid: applied.id, applications_id: applicationId });
   clearStores();
   await settings.getSettings();
   const publicStatus = async () => (await api.listRows('applications')).find((row) => row.guid === applicationId)?.public_status;
   const appliedNow = async () => {
      clearStores();
      await settings.getSettings();
      return (await deals.getDeals()).find((d) => d.id === applied.id)!;
   };
   await deals.takeToScreening(applied.id, me.id);
   const onScreening = await publicStatus();
   await deals.completeScreening(applied.id, me.id);
   await deals.transferDeal(applied.id);
   const statusInWork = await publicStatus();
   check('what the founder sees follows the deal: screening, then further on', onScreening === 'screening' && statusInWork !== 'screening' && statusInWork !== 'submitted', { onScreening, statusInWork });
   const stageBefore = (await appliedNow()).stage;
   await deals.stepBack(applied.id, 'meeting', me.id);
   const steppedBack = await appliedNow();
   check('a deal stepped back to a passed stage is on it again, and its journal has it', stageBefore !== 'meeting' && steppedBack.stage === 'meeting' && steppedBack.status === 'active', { stageBefore, stage: steppedBack.stage });
   // a founder's file awaits review: rejected with a reason, then accepted
   await deals.uploadDocument(applied.id, new File(['ZZ'], 'zz-founder.txt', { type: 'text/plain' }), me.id, 'legal');
   const founderFile = (await appliedNow()).documents?.find((d) => d.title === 'zz-founder')!;
   await api.updateRow('deal_documents', { guid: founderFile.id, status: 'review', uploaded_by: 'applicant' });
   await deals.reviewDocument(applied.id, founderFile.id, false, 'ZZ нечитаемо', me.id);
   const refused = (await appliedNow()).documents?.find((d) => d.id === founderFile.id);
   await deals.reviewDocument(applied.id, founderFile.id, true, '', me.id);
   const acceptedFile = (await appliedNow()).documents?.find((d) => d.id === founderFile.id);
   check("a founder's file rejected with its reason, then accepted", refused?.status === 'rejected' && refused.detail === 'ZZ нечитаемо' && refused.handled?.reason === 'ZZ нечитаемо' && acceptedFile?.status === 'accepted', { refused: refused?.status, reason: refused?.detail, accepted: acceptedFile?.status });
   // a founder's answer from the cabinet, accepted by the fund
   await deals.addRequest(applied.id, { title: 'ZZ Ответ основателя', text: 'ZZ', dueDate: addWorkingDays(today, 5), folder: 'legal', ddQuestionnaire: false }, me.id);
   const founderRequest = (await appliedNow()).requests?.find((r) => r.title === 'ZZ Ответ основателя')!;
   await api.updateRow('deal_requests', { guid: founderRequest.id, status: 'answered', answer: 'ZZ ответ из кабинета' });
   const withAnswer = (await appliedNow()).requests?.find((r) => r.id === founderRequest.id);
   await deals.acceptAnswer(applied.id, founderRequest.id);
   const answerAccepted = (await appliedNow()).requests?.find((r) => r.id === founderRequest.id);
   check("a founder's answer shows with its text, and the fund accepts it", withAnswer?.status === 'answered' && withAnswer.detail === 'ZZ ответ из кабинета' && answerAccepted?.status === 'accepted', { answered: withAnswer?.status, accepted: answerAccepted?.status });
   // rejected: read-only, what the founder sees, when they may apply again
   await deals.rejectDeal(applied.id, { reason: listOf('reasons')[0].key, letter: 'ZZ письмо', comment: 'ZZ комментарий', resubmit: Object.keys(RESUBMIT_LABELS)[0] as never }, me.id);
   const rejectedDeal = await appliedNow();
   const applicationRow = (await api.listRows('applications')).find((row) => row.guid === applicationId);
   check('a rejected deal: closed with its reason, the founder told, the date to apply again set', rejectedDeal.status === 'rejected' && rejectedDeal.closed?.reason === listOf('reasons')[0].key && applicationRow?.public_status === 'rejected' && !!applicationRow?.resubmit_after, { status: rejectedDeal.status, reason: rejectedDeal.closed?.reason, publicStatus: applicationRow?.public_status, resubmit: applicationRow?.resubmit_after });

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

   // ---- Договоры and Закупки (batch 18), and how they reach Мой день, the bell and a deal
   const contracts = (await import('@modules/Contracts/services')).default;
   const { investmentContractOf } = await import('@modules/Contracts/helpers');
   const procurement = (await import('@modules/Procurement/services')).default;
   const { planMove } = await import('@modules/Procurement/helpers');
   if (!(await contracts.isStored()) || !(await procurement.isStored())) {
      check('Договоры and Закупки: without batch 18 they read as empty, and Мой день still loads', (await work.getQueue(me.id)).every(({ kind }) => kind !== 'contract') && !(await contracts.getContracts()).length);
   } else {
      const reload = async () => {
         clearStores();
         await settings.getSettings();
      };
      const someDeal = (await deals.getDeals())[0];
      const stages = (await settings.getSettings()).lists.procStages.map(({ key }) => key);
      check('Настройки: contract types, categories and stages have their rows', stages.length >= 2 && (await settings.getSettings()).lists.contractTypes.some(({ key, isSystem }) => key === 'invest' && isSystem) && (await settings.getSettings()).lists.procCategories.some(({ limit }) => limit === 10000), stages);

      // a contract: on approval it waits for the director, back and forth, then signed
      const contractInput = { number: `ZZ-${Date.now()}`, party: 'ZZ Контрагент LLC', subject: 'ZZ Договор инвестирования', type: 'invest', status: 'draft' as const, amount: 500000, signedDate: '', validUntil: '', ownerId: me.id, approverId: '', dealId: someDeal?.id ?? '' };
      await contracts.create(contractInput);
      const findContract = async () => (await contracts.getContracts()).find(({ number }) => number === contractInput.number);
      const contract = await findContract();
      check('a contract is written and read back', contract?.party === contractInput.party && contract?.amount === 500000 && contract?.type === 'invest' && contract?.status === 'draft' && contract?.dealId === contractInput.dealId, contract);
      await contracts.setStatus(contract!.id, 'approval');
      check('sent for approval without an approver, it goes to the director', (await findContract())?.approverId === me.id);
      const contractItem = (await work.getQueue(me.id)).find(({ recordId }) => recordId === contract!.id);
      check('it waits in Мой день', contractItem?.kind === 'contract' && contractItem.decision?.action === 'approve' && contractItem.amount === 500000, contractItem);
      check('and in the bell', (await work.getNotices(me.id)).some(({ id }) => id === `decision-contract-${contract!.id}`));
      await contracts.sendBack(contract!.id, 'ZZ исправьте сумму');
      const back = await findContract();
      check('sent back: a draft again, with what to fix', back?.status === 'draft' && back.decisionNote === 'ZZ исправьте сумму', back);
      check('and no longer in Мой день', !(await work.getQueue(me.id)).some(({ recordId }) => recordId === contract!.id));
      await contracts.setStatus(contract!.id, 'approval');
      check('sent again, the note is gone', (await findContract())?.decisionNote === '');
      await contracts.approve(contract!.id);
      const approved = await findContract();
      check('approved: signed, from today', approved?.status === 'signed' && approved.signedDate === today, approved);
      check('the deal finds it as its investment contract', !someDeal || investmentContractOf(await contracts.getContracts(), someDeal.id)?.id === contract!.id);
      const ending = addWorkingDays(today, 10);
      await contracts.update(contract!.id, { ...approved!, validUntil: ending });
      check('ending within 60 days, it is among the deadlines ahead', (await work.getUpcoming(me.id)).some(({ id }) => id === `contract-${contract!.id}`));
      await reload();
      const stored = await findContract();
      check('all of it read back from ucode afresh', stored?.status === 'signed' && stored.validUntil === ending && stored.signedDate === today, stored);

      // a purchase under the limit goes through, past the vendor stage only with a vendor
      const add = async (title: string, amount: number) => {
         const outcome = await procurement.save(null, { title, category: 'it', amount, stage: stages[0], vendorId: '', needDate: addWorkingDays(today, 15), ownerId: me.id, note: 'ZZ зачем' }, me.id);
         const made = (await procurement.getRequests()).find((item) => item.title === title);
         return { outcome, made: made! };
      };
      const findRequest = async (id: string) => (await procurement.getRequests()).find((item) => item.id === id)!;
      const small = await add('ZZ Мышки', 3000);
      check('a request is written and starts on the first stage', small.outcome.kind === 'saved' && small.made.stage === 'request' && small.made.amount === 3000 && small.made.date === today, small.made);
      let plan = await procurement.move(small.made.id, 'approval', me.id);
      check('under the limit, on to the approval stage', plan.kind === 'moved' && (await findRequest(small.made.id)).stage === 'approval');
      check('it waits for nobody', !(await work.getQueue(me.id)).some(({ recordId }) => recordId === small.made.id));
      plan = await procurement.move(small.made.id, 'vendor', me.id);
      const auto = await findRequest(small.made.id);
      check('and past it with no decision needed', plan.kind === 'moved' && auto.stage === 'vendor' && auto.approvedBy === 'auto', auto);
      plan = await procurement.move(small.made.id, 'contract', me.id);
      check('past the vendor stage it needs a vendor', plan.kind === 'need_vendor' && (await findRequest(small.made.id)).stage === 'vendor');
      await settings.saveVendor(null, { name: 'ZZ Поставщик', tin: '123456789', category: 'it', contact: 'ZZ', phone: '', active: true }, me.id, 'ZZ', () => '');
      const vendor = (await settings.getSettings()).vendors.find(({ name }) => name === 'ZZ Поставщик');
      check('a vendor is written in Настройки', vendor?.tin === '123456789' && vendor.category === 'it', vendor);
      const withVendor = await procurement.save(small.made.id, { ...auto, vendorId: vendor!.id, stage: 'contract' }, me.id);
      check('with a vendor, the form takes it on', withVendor.kind === 'saved' && (await findRequest(small.made.id)).stage === 'contract');
      check('a vendor a request names is not deleted', (await settings.vendorUsage(vendor!.id)) === 1 && (await settings.deleteVendor(vendor!.id, me.id, 'ZZ', '').then(() => false, () => true)));
      plan = await procurement.move(small.made.id, 'paid', me.id);
      check('the last stage closes it', plan.kind === 'moved' && (await findRequest(small.made.id)).stage === 'paid');

      // over the limit it stops on the approval stage until the director decides
      const big = await add('ZZ Серверы', 20000);
      plan = await procurement.move(big.made.id, 'vendor', me.id);
      const stoppedAt = await findRequest(big.made.id);
      check('over the limit, it stops on the approval stage', plan.kind === 'sent' && stoppedAt.stage === 'approval' && stoppedAt.approverId === me.id, stoppedAt);
      const bigItem = (await work.getQueue(me.id)).find(({ recordId }) => recordId === big.made.id);
      check('it waits in the director\'s Мой день', bigItem?.kind === 'procurement' && bigItem.amount === 20000, bigItem);
      check('anyone else is told to wait', planMove(stoppedAt, 'vendor', 'somebody-else').kind === 'waits');
      plan = await procurement.move(big.made.id, 'vendor', me.id);
      check('the director is asked to decide, and it does not move', plan.kind === 'decide' && (await findRequest(big.made.id)).stage === 'approval');
      await procurement.sendBack(big.made.id, 'ZZ дорого');
      const returned = await findRequest(big.made.id);
      check('returned: on the first stage, with why', returned.stage === 'request' && returned.decisionNote === 'ZZ дорого' && !returned.approvedBy, returned);
      await procurement.move(big.made.id, 'vendor', me.id);
      await procurement.approve(big.made.id, me.id, 'ZZ согласовано');
      const decided = await findRequest(big.made.id);
      check('approved: on to the next stage, the decision kept', decided.stage === 'vendor' && decided.approvedBy === me.id && decided.decisionNote === 'ZZ согласовано', decided);
      check('no longer in Мой день', !(await work.getQueue(me.id)).some(({ recordId }) => recordId === big.made.id));
      const same = await procurement.save(big.made.id, { ...decided, title: 'ZZ Серверы 2' }, me.id);
      check('changed without raising the sum, the decision holds', same.kind === 'saved' && (await findRequest(big.made.id)).approvedBy === me.id);
      const raised = await procurement.save(big.made.id, { ...decided, amount: 30000 }, me.id);
      const reopened = await findRequest(big.made.id);
      check('the sum raised after the decision: back to the approver', raised.kind === 'sent' && reopened.stage === 'approval' && !reopened.approvedBy, reopened);

      // under the limit and let through, then raised past it
      const cheap = await add('ZZ Кабели', 2000);
      await procurement.move(cheap.made.id, 'approval', me.id);
      await procurement.move(cheap.made.id, 'vendor', me.id);
      const dear = await procurement.save(cheap.made.id, { ...(await findRequest(cheap.made.id)), amount: 15000 }, me.id);
      check('let through under the limit, then raised past it: stopped too', dear.kind === 'sent' && (await findRequest(cheap.made.id)).stage === 'approval');

      // Настройки: a lower limit asks for a decision; a category in use is moved on deleting
      const it = (await settings.getSettings()).lists.procCategories.find(({ key }) => key === 'it')!;
      const { inputOf } = await import('@modules/Settings/helpers');
      await settings.saveListItem('procCategories', it.id, { ...inputOf(it), limit: 1000 }, me.id, 'ZZ', () => '');
      const lower = await add('ZZ Клавиатуры', 2000);
      plan = await procurement.move(lower.made.id, 'vendor', me.id);
      check('a limit lowered in Настройки counts at once', plan.kind === 'sent');
      await settings.saveListItem('procCategories', it.id, { ...inputOf(it), limit: it.limit }, me.id, 'ZZ', () => '');
      check('a category in use is counted', (await settings.usageOf('procCategories', it.id)) >= 1);
      await contracts.remove(contract!.id);
      forget('contracts', contract!.id);
      check('a contract is deleted', !(await findContract()));
      for (const request of await procurement.getRequests())
         if (request.title.startsWith('ZZ')) {
            await procurement.remove(request.id);
            forget('procurements', request.id);
         }
      check('the requests are deleted', !(await procurement.getRequests()).some(({ title }) => title.startsWith('ZZ')));
      await settings.deleteVendor(vendor!.id, me.id, 'ZZ', '');
      forget('vendors', vendor!.id);
      check('a vendor nothing names is deleted', !(await settings.getSettings()).vendors.some(({ name }) => name === 'ZZ Поставщик'));
   }

   // ---- who sees what: a role with «Своё» sees what is attached to it, the director all
   {
      const { seesAllDeals } = await import('@modules/Deals/helpers');
      const someone = TEAM.find(({ email }: { email?: string }) => email === 'test.employee@example.com') ?? (await settings.getSettings()).staff.find((m) => m.email === 'test.employee@example.com');
      const analystId = someone?.id ?? '';
      const allDeals = await deals.getDeals();
      check('the director sees every deal', seesAllDeals({ id: me.id, name: '', role: 'director' }) && (await work.getVisibleDeals(me.id)).length === allDeals.length);
      check('an analyst with no «Полный» sees only what is attached; an accountant reads all', !seesAllDeals({ id: '', name: '', role: 'analyst', access: 'work' }) && seesAllDeals({ id: '', name: '', role: 'analyst', access: 'full' }) && seesAllDeals({ id: '', name: '', role: 'accountant' }) && !seesAllDeals({ id: '', name: '', role: 'other' }));
      const before = await work.getVisibleDeals(analystId);
      check('someone not on the team sees no deals', !(await work.getVisibleDeals('no-such-person')).length);
      check('an analyst sees only the deals attached to them', before.length < allDeals.length, before.map(({ company }) => company));
      const target = allDeals.find(({ id, status }) => (status === 'active' || status === 'review') && !before.some((deal) => deal.id === id));
      if (target) {
         await deals.addTeamMember(target.id, { employeeId: analystId, role: 'ZZ Аналитик' });
         const seen = await work.getVisibleDeals(analystId);
         check('attached to one more deal, they see it too and no others', seen.length === before.length + 1 && seen.some(({ id }) => id === target.id), seen.map(({ company }) => company));
         check('the dashboard counts only theirs', (await work.getDashboard(analystId)).deals.inWork <= seen.length);
         const attachedTask = await work.createTask({ ...(await import('@modules/Work/helpers')).getInitialValues(undefined, me.id), title: 'ZZ Задача аналитику', relation: 'deal', relationId: target.id, assigneeId: analystId, checklist: [] } as never, me.id);
         const otherTask = await work.createTask({ ...(await import('@modules/Work/helpers')).getInitialValues(undefined, me.id), title: 'ZZ Чужая задача', relation: 'none', relationId: '', assigneeId: me.id, checklist: [] } as never, me.id);
         const tasksSeen = await work.getVisibleTasks(analystId);
         check('they see their task, and not one that is not theirs', tasksSeen.some(({ id }) => id === attachedTask.id) && !tasksSeen.some(({ id }) => id === otherTask.id));
         check('the director sees every task', (await work.getVisibleTasks(me.id)).some(({ id }) => id === otherTask.id));
         await work.deleteTask(attachedTask.id);
         await work.deleteTask(otherTask.id);
         const member = (await deals.getDeals()).find(({ id }) => id === target.id)?.team?.find(({ employeeId }) => employeeId === analystId);
         if (member?.id) await deals.removeTeamMember(target.id, member.id);
      }
   }

   // ---- a list's rows found by their key exactly, though ucode matches a text by a part of it
   {
      const statuses = await api.listRows('task_statuses', { slug: 'do' });
      check('a filter by a part of a key finds nothing', statuses.length === 0, statuses.map((row) => row.slug));
   }

   // ---- sign-in refusal
   if (!API_KEY) {
      const { login } = api;
      let refused = false;
      try {
         await login(process.env.UCODE_LOGIN ?? '', 'wrong-password');
      } catch (error) {
         refused = error instanceof api.UcodeError && error.status >= 400 && error.status < 500;
      }
      check('a wrong password is refused with a 4xx', refused);
   }
} catch (error) {
   failures++;
   console.log('✗ the run stopped:', error);
} finally {
   // ---- put everything back
   if (invitedUserId) await api.deleteStaffUser(invitedUserId).catch((error) => check('the test user taken back', false, String(error)));
   if (settingsRow)
      await api.updateRow('fund_settings', {
         guid: settingsRow.guid,
         check_min: settingsRow.check_min ?? null,
         check_max: settingsRow.check_max ?? null,
         focus_text: settingsRow.focus_text ?? null,
         excluded_text: settingsRow.excluded_text ?? null,
         flag_churn_pct: settingsRow.flag_churn_pct ?? null,
         questionnaire: settingsRow.questionnaire ?? null,
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
   check('cleanup: fund settings and norms put back', restored?.flag_churn_pct === settingsRow?.flag_churn_pct && (restored?.check_max ?? null) === (settingsRow?.check_max ?? null) && (restored?.questionnaire ?? null) === (settingsRow?.questionnaire ?? null));
   if (process.env.PANEL_TEST_WRITES) {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(process.env.PANEL_TEST_WRITES, JSON.stringify(Object.fromEntries([...writes].map(([table, fields]) => [table, [...fields].sort()])), null, 1));
   }
   if (dry?.dropped.size)
      console.log('Fields written that their tables lack:', Object.fromEntries([...dry.dropped].map(([table, fields]) => [table, [...fields].sort()])));
   // a mark only some tables have, read on purpose by a mapper they all share
   const realMisses = [...missingReads].filter((field) => !field.endsWith('.is_system') && !field.startsWith('quarter_reports.zz_'));
   if (realMisses.length) {
      failures += realMisses.length;
      console.log('Fields read that their tables lack:', realMisses.sort().join(', '));
   }
   console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
   process.exit(failures ? 1 : 0);
}

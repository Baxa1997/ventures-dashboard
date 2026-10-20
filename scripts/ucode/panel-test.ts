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
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
   const response = await realFetch(input, init);
   const table = String(input).match(/\/v2\/items\/(\w+)$/)?.[1];
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
const { addWorkingDays, clearStores, todayISO } = await import('@shared/helpers');

let failures = 0;
const check = (label: string, ok: unknown, detail: unknown = '') => {
   if (!ok) failures++;
   console.log(`${ok ? '✓' : '✗'} ${label}${detail === '' ? '' : ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- sign in
await signIn(process.env.UCODE_LOGIN ?? '', process.env.UCODE_PASSWORD ?? '', true);
for (let i = 0; i < 50 && !TEAM.length; i++) await sleep(200);
const me = TEAM.find(({ role }) => role === 'director');
check('signed in; the team read from employees, the user a director', me, TEAM);
if (!me) process.exit(1);
const today = todayISO();

const settingsRow = (await api.listRows('fund_settings'))[0];
const normRows = await api.listRows('stage_norms');

try {
   // ---- Настройки
   const initial = await settings.getSettings();
   check('settings: mandate, 8 norms, flags, staff, 11 industries', initial.norms.length === 8 && initial.industries.length === 11 && initial.staff.length >= 1, {
      norms: initial.norms.map((n) => `${n.stage}:${n.norm}`),
      flags: initial.flags,
      staff: initial.staff.map((m) => `${m.name}/${m.role}`),
   });
   await settings.save(
      {
         mandate: { ...initial.mandate, check: '$50 000 – $300 000', stages: 'Pre-seed, Seed' },
         norms: initial.norms.map((n) => (n.stage === 'screening' ? { ...n, norm: '6 · публично' } : n)),
         flags: { ...initial.flags, churn: 6 },
      },
      me.id,
      { 'mandate.check': 'Мандат · Чек', 'mandate.stages': 'Мандат · Стадии', 'norm.screening': 'Норматив · Скрининг', 'flag.churn': 'Флаг · Churn' },
   );
   const saved = await settings.getSettings();
   check('settings saved and read back', saved.mandate.check === '$50 000 – $300 000' && saved.mandate.stages === 'Pre-seed, Seed' && saved.flags.churn === 6 && saved.norms.find((n) => n.stage === 'screening')?.norm === '6 · публично', saved.mandate);
   // only the values that differ from what the fund has saved go to the journal
   const changed = [initial.mandate.check !== '$50 000 – $300 000', initial.mandate.stages !== 'Pre-seed, Seed', initial.norms.find((n) => n.stage === 'screening')?.norm !== '6 · публично', initial.flags.churn !== 6].filter(Boolean).length;
   check(`settings journal has the ${changed} changes`, saved.journal.length - initial.journal.length === changed, saved.journal.slice(0, changed).map((j) => `${j.field}: ${j.from} → ${j.to}`));
   const { stageNorm, mandateLimits } = await import('@modules/Deals/helpers');
   check('Сделки follow the saved rules', stageNorm('screening') === 6 && mandateLimits().maxCheck === 300000, { screening: stageNorm('screening'), limits: mandateLimits() });

   await settings.invite({ name: 'Тест Сотрудник', email: 'test.employee@example.com', position: 'Аналитик', role: 'analyst', roles: ['analyst'], access: 'work' });
   const invited = (await settings.getSettings()).staff.find((m) => m.email === 'test.employee@example.com');
   check('invite adds an employees row, not signed in yet', invited && invited.invitedAt === today && invited.role === 'analyst', invited);
   check('the team includes the invited employee', TEAM.some(({ id }) => id === invited?.id));

   // ---- Сделки
   const deal = await deals.createDeal({ company: 'ZZ Test Co', about: 'Тестовая сделка', industry: 'FinTech', source: 'network', amount: 150000, country: 'Узбекистан', roundStage: 'seed' }, me.id);
   check('deal created in the inbox', deal.status === 'review' && /^SQBV-\d{4}-\d{4}$/.test(deal.number), deal.number);
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
   const { preparationOf } = await import('@modules/Committee/helpers');
   await committee.addMember({ name: 'ZZ Член ИК', role: 'chair', remote: false, contract: 'ZZ договор' });
   const memberId = (await committee.getState()).members.find((m) => m.name === 'ZZ Член ИК')?.id ?? '';
   // a meeting scheduled with no questions is not ready to open; a deal is added to it after
   const meeting = await committee.scheduleMeeting({ body: 'ic', stage: 'ic1', date: addWorkingDays(today, 3), time: '10:00', format: 'Очно', dealIds: [] });
   check('a meeting with no questions is not ready to open', !preparationOf(meeting, (await committee.getState()).members).ready);
   await committee.addToAgenda(meeting.id, [deal.id]);
   // a member who joins after the meeting was scheduled, and does not confirm
   await committee.addMember({ name: 'ZZ Второй член', role: 'independent', remote: true, contract: '' });
   clearStores();
   const committeeState0 = await committee.getState();
   const lateId = committeeState0.members.find((m) => m.name === 'ZZ Второй член')?.id ?? '';
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
   const { exitConditions } = await import('@modules/Deals/helpers');
   const keys = ((key: string) => key) as never;
   const atStage = (stage: 'ic1' | 'ic2') => exitConditions(keys, { ...reread!, stage, exit: undefined }).find((c) => c.id === 'committee')?.state;
   check('the ИК-1 approval opens the way out of ИК-1, not out of ИК-2', atStage('ic1') === 'done' && atStage('ic2') === 'blocking', { ic1: atStage('ic1'), ic2: atStage('ic2') });
   await committee.setTaskDone(condition!.id, true, me.id);
   check('marking the condition done', (await committee.getState()).tasks.find((t) => t.id === condition?.id)?.done === true);
   // after ИК-2 the director approves too, for the stage the approval was given on
   const directorAt = async () => exitConditions(keys, { ...(await deals.getDeals()).find((d) => d.id === deal.id)!, stage: 'ic2', exit: undefined }).find((c) => c.id === 'director')?.state;
   const beforeApproval = await directorAt();
   await deals.approveTransfer(deal.id, me.id);
   clearStores();
   const approvedDeal = (await deals.getDeals()).find((d) => d.id === deal.id);
   check('ИК-2 also needs the director: blocking, then approved and read back from the journal', beforeApproval === 'blocking' && (await directorAt()) === 'done' && approvedDeal?.journal[0]?.kind === 'approved', { beforeApproval, journal: approvedDeal?.journal.slice(0, 2).map((e) => e.kind) });
   await committee.retireMember(lateId);
   await deals.transferDeal(deal.id);
   clearStores();
   check("the director's approval belongs to the stage it was given on", (await directorAt()) === 'blocking');
   check('a member who left is no longer in the committee', !(await committee.getState()).members.some((m) => m.id === lateId));
   check('a new stage takes the deal off its meeting', !(await deals.getDeals()).find((d) => d.id === deal.id)?.committee);

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
         round_stages: settingsRow.round_stages ?? null,
         focus_text: settingsRow.focus_text ?? null,
         geography_text: settingsRow.geography_text ?? null,
         excluded_text: settingsRow.excluded_text ?? null,
         flag_churn_pct: settingsRow.flag_churn_pct ?? null,
      });
   for (const row of normRows)
      await api.updateRow('stage_norms', { guid: row.guid, norm_text: row.norm_text ?? null, norm_days: row.norm_days ?? null });
   // children before their parents: the reverse of the order they were made in
   let left = 0;
   for (const [table, guid] of [...created].reverse())
      try {
         await api.deleteRow(table, guid);
      } catch {
         left++;
      }
   const restored = (await api.listRows('fund_settings'))[0];
   check(`cleanup: the ${created.length} rows this run made deleted`, !left, left ? `${left} could not be deleted` : '');
   check('cleanup: fund settings and norms put back', restored?.flag_churn_pct === settingsRow?.flag_churn_pct && (restored?.check_max ?? null) === (settingsRow?.check_max ?? null));
   console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
   process.exit(failures ? 1 : 0);
}

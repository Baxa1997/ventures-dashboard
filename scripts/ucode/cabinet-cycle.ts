/* A founder in the startup cabinet and the fund in the panel, on the same data:
   each step is done on one side and checked on the other, as a founder and the
   fund would meet it. Run by cabinet-cycle.mjs; nothing reaches ucode but reads. */

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

const { memoryFetch, trackMissingReads } = await import('./panel-test-memory');
const ADMIN = 'https://api.admin.u-code.io';
const KEY = process.env.PANEL_TEST_API_KEY ?? '';
const missingReads = trackMissingReads();
const dry = memoryFetch(globalThis.fetch, KEY, import.meta.env.VITE_UCODE_ENVIRONMENT_ID ?? '', ADMIN, {}, true);
const withKey = (init?: RequestInit): RequestInit => {
   const headers = new Headers(init?.headers);
   headers.set('Authorization', 'API-KEY');
   headers.set('X-API-KEY', KEY);
   return { ...init, headers };
};
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
   // the panel signs in as the director, with the key
   if (String(input).includes('/v2/login')) {
      const rows = ((await (await dry.fetchInMemory(`${ADMIN}/v2/items/employees?data=${encodeURIComponent(JSON.stringify({ limit: 200, offset: 0 }))}`)).json()) as { data: { data: { response: { user_id?: string; role?: string }[] } } }).data.data.response;
      const director = rows.find(({ user_id, role }) => user_id && role === 'director');
      return new Response(JSON.stringify({ data: { token: { access_token: 'key', refresh_token: 'key' }, user_id_auth: director?.user_id } }), { status: 200 });
   }
   return dry.fetchInMemory(input, withKey(init));
}) as typeof fetch;

const { default: dayjs } = await import('dayjs');
const api = await import('@shared/api/ucode');
const { signIn } = await import('@shared/hooks/useSession');
const { TEAM } = await import('@shared/constants');
const settings = (await import('@modules/Settings/services')).default;
const { listOf } = await import('@modules/Settings/services');
const deals = (await import('@modules/Deals/services')).default;
const work = (await import('@modules/Work/services')).default;
const portfolio = (await import('@modules/Portfolio/services')).default;
const { addWorkingDays, clearStores, newId, todayISO } = await import('@shared/helpers');
const cabinet = await import(process.env.CABINET_BUNDLE as string) as { handle: (request: Request) => Promise<Response> };

let failures = 0;
const check = (label: string, ok: unknown, detail: unknown = '') => {
   if (!ok) failures++;
   console.log(`${ok ? '✓' : '✗'} ${label}${!ok && detail !== '' ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 400)}` : ''}`);
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const fresh = async () => {
   clearStores();
   await settings.getSettings();
};

// A person in the cabinet: their cookie, and the calls of its pages.
const person = () => {
   let cookie = '';
   const call = async (method: string, path: string, body?: unknown) => {
      const headers = new Headers();
      if (cookie) headers.set('cookie', cookie);
      const form = body instanceof FormData;
      if (body && !form) headers.set('content-type', 'application/json');
      const response = await cabinet.handle(new Request(`https://app.test${path}`, { method, headers, body: form ? (body as FormData) : body ? JSON.stringify(body) : undefined }));
      const set = response.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : null };
   };
   return {
      call,
      signIn: async (email: string) => {
         const code = await call('POST', '/api/account/code', { email, language: 'ru' });
         return call('POST', '/api/account/verify', { email, code: code.body?.devCode });
      },
      account: async () => (await call('GET', '/api/account')).body,
   };
};
const formOf = (fields: Record<string, string>, files: File[] = [], name = 'files') => {
   const form = new FormData();
   for (const [key, value] of Object.entries(fields)) form.append(key, value);
   for (const file of files) form.append(name, file);
   return form;
};
const file = (name: string) => new File(['ZZ'], name, { type: 'application/pdf' });

await signIn('api-key', 'api-key', true);
for (let i = 0; i < 50 && !TEAM.length; i++) await sleep(100);
const me = TEAM.find(({ role }) => role === 'director')!;
const today = todayISO();
await settings.getSettings();

// what the website writes for an application: its row and its deal
const applyAs = async (email: string, company: string) => {
   const deal = await deals.createDeal({ company, about: 'ZZ', legalName: '', tin: '', foundedYear: null, employees: null, website: '', applicantEmail: email, applicantPhone: '', industryKey: 'fintech', industry: '', source: 'network', amount: 100000, country: 'UZ', roundStage: 'seed' }, me.id);
   const applicationId = newId();
   await api.createRow('applications', { guid: applicationId, email, startup_name: company, contact_name: 'ZZ Основатель', phone: '', ref: `ZZ-${company}`, public_status: 'submitted', locale: 'ru' });
   await api.updateRow('deals', { guid: deal.id, applications_id: applicationId });
   await fresh();
   return { id: deal.id, applicationId };
};
const dealOf = async (id: string) => {
   await fresh();
   return (await deals.getDeals()).find((deal) => deal.id === id)!;
};

try {
   // ---- signing in: the email is checked first, then a code is sent
   const EMAIL = 'zz.founder@example.com';
   const founder = person();
   const stranger = await founder.call('POST', '/api/account/code', { email: 'zz.nobody@example.com', language: 'ru' });
   check('an email with no application is told so, and no code is made', stranger.status === 404 && stranger.body?.error?.code === 'no_application', stranger);
   const applied = await applyAs(EMAIL, 'ZZ Cycle Co');
   const code = await founder.call('POST', '/api/account/code', { email: EMAIL, language: 'ru' });
   check('an email with an application gets a code', code.status === 200 && /^\d{6}$/.test(code.body?.devCode ?? ''), code);
   const wrong = await founder.call('POST', '/api/account/verify', { email: EMAIL, code: code.body.devCode === '000000' ? '000001' : '000000' });
   check('a wrong code is refused, with the tries left', wrong.status === 400 && wrong.body?.error?.code === 'wrong_code', wrong);
   const noAccount = await founder.call('GET', '/api/account');
   check('without signing in the cabinet answers nothing', noAccount.status === 401, noAccount);
   const right = await founder.call('POST', '/api/account/verify', { email: EMAIL, code: code.body.devCode });
   check('the right code signs in', right.status === 200, right);
   let account = await founder.account();
   check('the cabinet finds the application and its deal', account?.application?.company === 'ZZ Cycle Co' && account.hasDeal === true && account.me?.owner === true && account.me?.role === 'ceo' && account.application.status === 'submitted', account);

   // ---- the deal moves: what the founder sees follows it, and nothing inner
   await deals.takeToScreening(applied.id, me.id);
   await deals.setScreeningNote(applied.id, { essence: 'ZZ ВНУТРЕННЕЕ', whyNow: '', redFlags: '', nextStep: '' } as never);
   account = await founder.account();
   check('the fund takes it to screening: the founder sees «screening»', account.application.status === 'screening', account.application);
   check("the fund's own notes, owner and scores do not reach the founder", !JSON.stringify(account).includes('ZZ ВНУТРЕННЕЕ') && !JSON.stringify(account).includes(me.id) && !('owner' in account) && !('screening' in account), Object.keys(account));

   // ---- a request: asked in the panel, answered in the cabinet, checked in the panel
   await deals.addRequest(applied.id, { title: 'ZZ Отчётность', text: 'ZZ пришлите', dueDate: addWorkingDays(today, 5), folder: 'financial', ddQuestionnaire: false }, me.id);
   account = await founder.account();
   const asked = account.requests.find((item: { title: string }) => item.title === 'ZZ Отчётность');
   check('a request from the panel shows in the cabinet, with who asked and by when', asked?.status === 'waiting' && asked.text === 'ZZ пришлите' && asked.dueDate && asked.askedBy?.name, asked);
   const answered = await founder.call('POST', `/api/account/requests/${asked.id}/answer`, formOf({ text: 'ZZ ответ основателя' }, [file('zz-report.pdf')]));
   check('the founder answers it with a file', answered.status === 200, answered);
   let inPanel = await dealOf(applied.id);
   const request = inPanel.requests?.find((item) => item.id === asked.id);
   const requestFile = inPanel.documents?.find((item) => item.requestId === asked.id);
   check('the panel shows the answer, waiting for its check', request?.status === 'answered' && request.detail === 'ZZ ответ основателя', request);
   check("the answer's file is on the deal, from the applicant, in the request's folder, with its size", requestFile && requestFile.status === 'review' && requestFile.uploadedById === '' && (requestFile.folderId || request?.folder) === 'financial', requestFile);
   const queue = await work.getQueue(me.id);
   check("it waits in the owner's Мой день", queue.some((item) => item.kind === 'answer' && item.dealId === applied.id) || queue.some((item) => item.kind === 'document' && item.dealId === applied.id), queue.map(({ kind }) => kind));
   await deals.acceptAnswer(applied.id, asked.id);
   account = await founder.account();
   check('the fund accepts: the founder sees it accepted', account.requests.find((item: { id: string }) => item.id === asked.id)?.status === 'accepted', account.requests);

   // ---- the data room: uploaded in the cabinet, reviewed in the panel, sent again
   const upload = await founder.call('POST', '/api/account/documents', formOf({ folder: 'legal' }, [file('zz-charter.pdf')]));
   check('the founder uploads to a folder of the data room', upload.status === 200, upload);
   inPanel = await dealOf(applied.id);
   const charter = inPanel.documents?.find((item) => item.title.includes('zz-charter'));
   check('the panel has it in that folder, for checking, with its size', charter?.folderId === 'legal' && charter.status === 'review' && charter.size === 2, charter);
   await deals.reviewDocument(applied.id, charter!.id, false, 'ZZ нечитаемо', me.id);
   account = await founder.account();
   const refused = account.documents.find((item: { id: string }) => item.id === charter!.id);
   check('the fund rejects it: the founder sees why', refused?.status === 'rejected' && refused.reason === 'ZZ нечитаемо', refused);
   const again = await founder.call('POST', '/api/account/documents', formOf({ replaces: charter!.id, folder: 'legal' }, [file('zz-charter.pdf')]));
   check('the founder sends a new version', again.status === 200, again);
   inPanel = await dealOf(applied.id);
   const versions = (inPanel.documents ?? []).filter((item) => item.title.includes('zz-charter'));
   check('the panel has both versions', versions.length === 2 && versions.some((item) => item.version === 2 && item.status === 'review'), versions.map(({ version, status }) => ({ version, status })));
   const badFolder = await founder.call('POST', '/api/account/documents', formOf({ folder: 'no_such_folder' }, [file('zz-x.pdf')]));
   check('a folder that does not exist is refused', badFolder.status >= 400, badFolder);

   // ---- the questionnaire: the fund's questions, the founder's answers, both ways
   const sections = (await settings.getSettings()).questionnaire;
   const fieldId = sections[0].fields[0].id;
   await deals.addRequest(applied.id, { title: 'ZZ Анкета', text: 'ZZ', dueDate: addWorkingDays(today, 5), folder: '', ddQuestionnaire: true }, me.id);
   account = await founder.account();
   check("the fund asks for the questionnaire: the cabinet shows the fund's questions", account.questionnaire?.open === true && account.questionnaire.sections[0].fields[0].id === fieldId, account.questionnaire);
   const saved = await founder.call('PUT', '/api/account/questionnaire', { answers: { [fieldId]: 'ZZ ответ в анкете' } });
   const incomplete = await founder.call('POST', '/api/account/questionnaire/submit');
   check('a questionnaire with sections left empty is not sent', sections.length < 2 || incomplete.status === 409, incomplete);
   check('the founder saves an answer', saved.status === 200, saved);
   inPanel = await dealOf(applied.id);
   check('the panel reads it', JSON.stringify(inPanel.questionnaire ?? {}).includes('ZZ ответ в анкете'), inPanel.questionnaire);
   await deals.setAnswer(applied.id, fieldId, 'ZZ поправил фонд', me.id);
   account = await founder.account();
   check("the fund corrects it: the founder sees the fund's text", account.questionnaire?.answers?.[fieldId] === 'ZZ поправил фонд', account.questionnaire?.answers);
   await founder.call('PUT', '/api/account/questionnaire', { answers: Object.fromEntries(sections.flatMap(({ fields }) => fields.map(({ id, kind, options }) => [id, kind === 'number' ? '1' : kind === 'yesno' ? 'yes' : kind === 'select' ? (options?.[0]?.ru ?? 'ZZ') : 'ZZ ответ']))) });
   const submitted = await founder.call('POST', '/api/account/questionnaire/submit');
   check('the founder sends the questionnaire', submitted.status === 200, submitted);
   inPanel = await dealOf(applied.id);
   check('the panel shows it answered', inPanel.requests?.find((item) => item.ddQuestionnaire)?.status === 'answered', inPanel.requests?.map(({ title, status }) => ({ title, status })));

   // ---- members: added by the CEO, visible to the fund, with their own rights
   const added = await founder.call('POST', '/api/account/members', { name: 'ZZ Финансист', email: 'zz.cfo@example.com', role: 'cfo' });
   check('the CEO adds a CFO', added.status === 200, added);
   await portfolio.reload();
   const memberRow = (await portfolio.getState()).members.find((item) => item.email === 'zz.cfo@example.com');
   check("the panel's «Команда в кабинете основателя» has them", memberRow?.role === 'cfo' && memberRow.applicationId === applied.applicationId, memberRow);
   const cfo = person();
   const cfoIn = await cfo.signIn('zz.cfo@example.com');
   const cfoAccount = await cfo.account();
   check('the CFO signs in to the same application, not as its owner', cfoIn.status === 200 && cfoAccount.application?.company === 'ZZ Cycle Co' && cfoAccount.me?.owner === false && cfoAccount.me?.role === 'cfo', cfoAccount?.me);
   const cfoOwnFolder = await cfo.call('POST', '/api/account/documents', formOf({ folder: 'financial' }, [file('zz-cfo.pdf')]));
   const cfoOtherFolder = await cfo.call('POST', '/api/account/documents', formOf({ folder: 'team' }, [file('zz-cfo2.pdf')]));
   check('a CFO uploads to the financial folder, not to another', cfoOwnFolder.status === 200 && cfoOtherFolder.status === 403, { own: cfoOwnFolder.status, other: cfoOtherFolder.status });
   const cfoAdds = await cfo.call('POST', '/api/account/members', { name: 'ZZ Другой', email: 'zz.other@example.com', role: 'other' });
   check('only a CEO manages members', cfoAdds.status === 403, cfoAdds);

   // ---- the investment: the company's cabinet opens, and reports reach the panel
   // through the committees, as the fund does, to the last stage
   await deals.moveDeal(applied.id, { stage: 'closing', status: 'active' }, 'ZZ', me.id);
   const paidIn = dayjs(today).subtract(4, 'month').format('YYYY-MM-DD');
   const companyId = await deals.joinPortfolio(applied.id, { instrument: 'safe', amount: 100000, date: paidIn, stakePct: 5, valuation: 2000000 });
   account = await founder.account();
   check('the deal joins Портфель: the cabinet opens the company', account.company?.name && account.application.status === 'portfolio', { company: account.company?.name, status: account.application.status });
   const held = await founder.account();
   check('a request left waiting is closed for the founder, not asked for ever', held.requests.every((item: { status: string }) => item.status !== 'waiting'), held.requests.map(({ status }: { status: string }) => status));
   const firstQuarter = account.company.firstQuarter;
   const fundQuarter = account.company.quarter;
   check("it owes reports from the fund's first quarter, no earlier", account.company.reports.every((item: { quarter: string }) => item.quarter >= firstQuarter), { firstQuarter, fundQuarter, reports: account.company.reports.map(({ quarter }: { quarter: string }) => quarter) });
   const earlierMetrics = await founder.call('PUT', '/api/account/company/metrics', { quarter: '2020-Q1', values: {} });
   check('a quarter it does not owe is refused', earlierMetrics.status >= 400, earlierMetrics);
   const metric = account.company.metrics[0];
   const owed = account.company.reports[0]?.quarter ?? firstQuarter;
   const sentMetrics = await founder.call('PUT', '/api/account/company/metrics', { quarter: owed, values: { [metric.id]: 12345 } });
   check('the company enters its figures for a quarter it owes', sentMetrics.status === 200, sentMetrics);
   await portfolio.reload();
   const company = (await portfolio.getState()).companies.find((item) => item.id === companyId)!;
   const metricKey = listOf('metrics', true).find((item) => item.id === metric.id)?.key;
   check("the company's card in the panel has them", company.metrics.find((item) => item.key === metricKey)?.values[owed] === 12345, company.metrics.find((item) => item.key === metricKey));
   const docSlug = account.company.reports.find((item: { quarter: string }) => item.quarter === owed)?.documents?.[0]?.slug;
   if (docSlug) {
      const sentReport = await founder.call('POST', `/api/account/company/reports/${docSlug}`, formOf({ quarter: owed }, [file('zz-pnl.pdf')], 'file'));
      check('the company sends a report document', sentReport.status === 200, sentReport);
      await portfolio.reload();
      const after = (await portfolio.getState()).companies.find((item) => item.id === companyId)!;
      check('the panel has it in that quarter', JSON.stringify(after.reports[owed] ?? {}).includes('zz-pnl') || JSON.stringify(after.reports[owed] ?? {}).includes(docSlug), after.reports[owed]);
   } else check('a report document is asked for', listOf('reportDocs').length === 0, 'none in the owed quarter');

   // ---- a request for data, and the company's own request to the fund
   await portfolio.addDataRequest(companyId, { title: 'ZZ Данные за квартал', text: 'ZZ', dueDate: addWorkingDays(today, 5) }, me.id);
   account = await founder.account();
   const dataAsked = account.company.dataRequests.find((item: { title: string }) => item.title === 'ZZ Данные за квартал');
   check("the fund's request for data shows in the cabinet", dataAsked?.status === 'waiting', dataAsked);
   const dataAnswered = await founder.call('POST', `/api/account/company/data-requests/${dataAsked.id}/answer`, formOf({ text: 'ZZ ответ компании' }));
   check('the company answers it', dataAnswered.status === 200, dataAnswered);
   await portfolio.reload();
   let dataRow = (await portfolio.getState()).dataRequests.find((item) => item.id === dataAsked.id);
   check('the panel shows the answer and who sent it', dataRow?.status === 'answered' && dataRow.answer === 'ZZ ответ компании' && dataRow.answeredBy === EMAIL, dataRow);
   check("it waits in the company's owner's Мой день", (await work.getQueue(me.id)).some((item) => item.kind === 'company_answer' && item.title === 'ZZ Данные за квартал'));
   await portfolio.acceptDataAnswer(dataAsked.id);
   account = await founder.account();
   check('the fund accepts: the cabinet shows it accepted', account.company.dataRequests.find((item: { id: string }) => item.id === dataAsked.id)?.status === 'accepted');
   const opened = await founder.call('POST', '/api/account/company/requests', { title: 'ZZ Познакомьте с банком', note: 'ZZ' });
   check('the company asks the fund for something', opened.status === 200, opened);
   await portfolio.reload();
   const companyAsk = (await portfolio.getState()).requests.find((item) => item.title === 'ZZ Познакомьте с банком');
   check('the panel has it, waiting for the fund, and the menu counts it', companyAsk?.status === 'waiting_fund' && ((await work.getCounters(me.id)).portfolio ?? 0) >= 1, companyAsk);
   await portfolio.answerRequest(companyAsk!.id, 'ZZ познакомили');
   account = await founder.account();
   check('the fund answers: the cabinet shows the answer', account.company.requests.find((item: { id: string }) => item.id === companyAsk!.id)?.answer === 'ZZ познакомили', account.company.requests);
   await portfolio.addPilot(companyId, { title: 'ZZ Пилот', customer: 'ZZ SQB', status: 'in_progress', note: 'ZZ', startedAt: today, endedAt: '' } as never);
   account = await founder.account();
   check("the fund's pilot shows in the cabinet", account.company.pilots.some((item: { title: string }) => item.title === 'ZZ Пилот'), account.company.pilots);

   // ---- a rejection: read-only, with the letter, nothing asked any more
   const rejectedEmail = 'zz.rejected@example.com';
   const toReject = await applyAs(rejectedEmail, 'ZZ Rejected Co');
   const rejectedFounder = person();
   await rejectedFounder.signIn(rejectedEmail);
   await deals.takeToScreening(toReject.id, me.id);
   await deals.addRequest(toReject.id, { title: 'ZZ Просьба', text: 'ZZ', dueDate: addWorkingDays(today, 5), folder: 'legal', ddQuestionnaire: false }, me.id);
   const beforeReject = (await rejectedFounder.account()).requests[0];
   const reason = listOf('reasons')[0].key;
   await deals.rejectDeal(toReject.id, { reason, letter: 'ZZ письмо основателю', comment: 'ZZ ВНУТРЕННИЙ КОММЕНТАРИЙ', resubmit: 'month_3' as never }, me.id);
   const rejectedAccount = await rejectedFounder.account();
   check('rejected: the cabinet is read-only and shows the letter', rejectedAccount.closed === true && rejectedAccount.application.status === 'rejected' && JSON.stringify(rejectedAccount.rejection ?? {}).includes('ZZ письмо основателю'), rejectedAccount.rejection);
   check("the fund's comment on the rejection does not reach the founder", !JSON.stringify(rejectedAccount).includes('ZZ ВНУТРЕННИЙ КОММЕНТАРИЙ'));
   const lateAnswer = await rejectedFounder.call('POST', `/api/account/requests/${beforeReject.id}/answer`, formOf({ text: 'ZZ поздно' }));
   const lateUpload = await rejectedFounder.call('POST', '/api/account/documents', formOf({ folder: 'legal' }, [file('zz-late.pdf')]));
   check('a rejected founder can no longer answer or upload', lateAnswer.status >= 400 && lateUpload.status >= 400, { answer: lateAnswer.status, upload: lateUpload.status });

   // ---- withdrawn in the cabinet: closed in the panel
   const leaverEmail = 'zz.leaver@example.com';
   const toLeave = await applyAs(leaverEmail, 'ZZ Leaver Co');
   const leaver = person();
   await leaver.signIn(leaverEmail);
   const left = await leaver.call('POST', '/api/account/withdraw', { reason: 'ZZ нашли другого инвестора' });
   check('the founder withdraws the application', left.status === 200, left);
   const leftDeal = await dealOf(toLeave.id);
   check('the panel shows the deal withdrawn, with the reason', leftDeal.status === 'withdrawn' && JSON.stringify(leftDeal.closed ?? {}).includes('ZZ нашли другого инвестора'), leftDeal.closed);

   // ---- sessions
   const out = await founder.call('POST', '/api/account/logout');
   const afterOut = await founder.call('GET', '/api/account');
   check('signing out ends the session', out.status === 200 && afterOut.status === 401, { out: out.status, after: afterOut.status });
} catch (error) {
   failures++;
   console.log('✗ the run stopped:', error);
}

if (dry.dropped.size) {
   console.log('\nFields written that their tables lack:', Object.fromEntries([...dry.dropped].map(([table, fields]) => [table, [...fields].sort()])));
   failures += dry.dropped.size;
}
// a mark only some tables have, read on purpose by a mapper they all share
const realMisses = [...missingReads].filter((field) => !field.endsWith('.is_system') && field !== 'company_data_requests.is_dd_questionnaire');
if (realMisses.length) {
   console.log('\nFields read that their tables lack:', realMisses.sort().join(', '));
   failures += realMisses.length;
}
console.log(failures ? `\n${failures} problem(s)` : '\nAll checks passed');
process.exit(failures ? 1 : 0);

import {
   createRow,
   day,
   deleteFile,
   deleteRow,
   fromJson,
   groupBy,
   listRows,
   num,
   numOrNull,
   type Row,
   str,
   updateRow,
} from '@shared/api/ucode';
import settings, { listIdOf, listKeyOf } from '@modules/Settings/services';
import { createStore, newId, todayISO } from '@shared/helpers';
import attachments from '@shared/services/attachments';
import type { Deal } from '@shared/types/deals.types';
import type {
   CompanyDataRequest,
   CompanyInput,
   CompanyRequest,
   CompanyStatus,
   DataRequestInput,
   ExitInput,
   ExitType,
   Instrument,
   Investment,
   InvestmentRecord,
   MetricKey,
   PilotInput,
   PilotStatus,
   PortfolioCompany,
   QuarterReport,
   ReportingCycle,
   RequestStatus,
   SystemReportDoc,
} from '@shared/types/portfolio.types';
import {
   companyOfDeal,
   lastClosedQuarter,
   metricFormat,
   metricKeys,
   reportDates,
} from '../helpers';

/* Портфель in ucode (docs/ucode-migration.md, batch 4): portfolio_companies
   with their investments, quarter_reports, pilots and company_requests, and
   the reporting cycles. What a company has invested is the sum of its
   investments. Until the fund requests the first reports there is no cycle
   row: the last closed quarter is shown, with its deadline by the rule in
   ../constants, and requesting the reports creates the row. An exit's date,
   sum, kind and buyer are batch 13's fields: a project without them keeps
   only the company's status. */

export interface PortfolioState {
   companies: PortfolioCompany[];
   requests: CompanyRequest[]; // the companies' requests to the fund
   dataRequests: CompanyDataRequest[]; // the fund's requests for data, newest first
   cycle: ReportingCycle;
   exitFields: boolean; // ucode has batch 13's fields for an exit
   pilotFields: boolean; // ucode has batch 24's sponsor and budget of a pilot
}

const COMPANY_STATUSES: CompanyStatus[] = ['active', 'exit', 'written_off'];
const EXIT_TYPES: ExitType[] = ['strategic', 'secondary', 'buyback', 'ipo'];

const toInvestment = (row: Row): InvestmentRecord => ({
   id: row.guid,
   date: day(row.date),
   kind: str(row.kind) === 'follow_on' ? 'follow_on' : 'initial',
   instrument: (str(row.instrument) || 'safe') as Instrument,
   amount: num(row.amount),
   valuation: numOrNull(row.valuation),
   stakePct: numOrNull(row.stake_pct),
   dealId: str(row.deals_id),
});

// The days the documents of batch 4 came, in their own columns; the fund's
// own documents keep theirs in `received`.
const DOC_FIELDS: Record<SystemReportDoc, string> = {
   fund_template: 'fund_template_at',
   company_template: 'company_template_at',
   form1: 'form1_at',
   form2: 'form2_at',
};

const toReport = (row: Row): QuarterReport => ({
   received: {
      ...fromJson<Record<string, string>>(row.received, {}),
      ...Object.fromEntries(
         Object.entries(DOC_FIELDS).flatMap(([doc, field]) =>
            row[field] ? [[doc, day(row[field])]] : [],
         ),
      ),
   },
   metrics: (str(row.metrics_state) || 'none') as QuarterReport['metrics'],
   filledAt: day(row.filled_at) || null,
});

// metric_values' `quarter` holds a quarter (2026-Q3) or a month (2026-09)
const isMonth = (period: string) => /^\d{4}-\d{2}$/.test(period);

const toCompany = (
   row: Row,
   investments: Row[],
   reports: Row[],
   pilots: Row[],
   values: Row[],
): PortfolioCompany => {
   const byQuarter = new Map(
      reports.map((report) => [str(report.quarter), report]),
   );
   // a figure in metric_values, by quarter or, with `monthly`, by month; one
   // a report row holds in its own column (batch 4) counts while
   // metric_values has none
   const valueOf = (key: MetricKey, monthly = false) =>
      Object.fromEntries([
         ...(monthly ? [] : [...byQuarter]).flatMap(([quarter, report]) =>
            report[key] === undefined || report[key] === null
               ? []
               : [[quarter, numOrNull(report[key])]],
         ),
         ...values
            .filter(
               (value) =>
                  listKeyOf('metrics', value.portfolio_metrics_id) === key &&
                  isMonth(str(value.quarter)) === monthly,
            )
            .map((value) => [str(value.quarter), numOrNull(value.value)]),
      ]);
   return {
      id: row.guid,
      name: str(row.name),
      tagline: str(row.tagline),
      about: str(row.about),
      industryKey: listKeyOf('industries', row.industries_id) ?? '',
      countries: str(row.countries),
      instrument: (str(row.instrument) || 'safe') as Instrument,
      invested: investments.reduce((sum, item) => sum + num(item.amount), 0),
      investments: investments
         .map(toInvestment)
         .sort((a, b) => a.date.localeCompare(b.date)),
      since: num(row.since),
      ownerId: str(row.owner_id),
      status:
         COMPANY_STATUSES.find((status) => status === row.status) ?? 'active',
      now: str(row.current_note),
      ...(row.deals_id ? { dealId: str(row.deals_id) } : {}),
      facts: fromJson<{ label: string; value: string }[]>(row.facts, []),
      position: { valuation: str(row.valuation), moic: str(row.moic) },
      exit:
         row.exit_date || row.exit_proceeds != null || row.exit_buyer
            ? {
                 date: day(row.exit_date),
                 proceeds: numOrNull(row.exit_proceeds),
                 type: EXIT_TYPES.find((type) => type === row.exit_type) ?? '',
                 buyer: str(row.exit_buyer),
              }
            : null,
      reports: Object.fromEntries(
         [...byQuarter].map(([quarter, report]) => [quarter, toReport(report)]),
      ),
      metrics: metricKeys().map((key) => ({
         key,
         format: metricFormat(key),
         values: valueOf(key),
         months: valueOf(key, true),
      })),
      pilots: pilots.map((pilot) => ({
         id: pilot.guid,
         title: str(pilot.title),
         customer: str(pilot.customer),
         sponsor: str(pilot.sponsor),
         budget: numOrNull(pilot.budget),
         status: (str(pilot.status) || 'in_progress') as PilotStatus,
         note: str(pilot.note),
         startedAt: day(pilot.started_at),
         endedAt: day(pilot.ended_at),
      })),
      ...(row.commercial_title
         ? {
              commercial: {
                 title: str(row.commercial_title),
                 note: str(row.commercial_note),
              },
           }
         : {}),
   };
};

const toRequest = (row: Row): CompanyRequest => ({
   id: row.guid,
   companyId: str(row.portfolio_companies_id),
   title: str(row.title),
   openedAt: day(row.opened_at),
   status: (str(row.status) || 'waiting_fund') as RequestStatus,
   note: str(row.note),
   ownerId: str(row.owner_id),
   answer: str(row.answer),
});

const DATA_STATUSES: CompanyDataRequest['status'][] = [
   'waiting',
   'answered',
   'accepted',
];

const toDataRequest = (row: Row): CompanyDataRequest => ({
   id: row.guid,
   companyId: str(row.portfolio_companies_id),
   title: str(row.title),
   text: str(row.text),
   byId: str(row.sent_by_id),
   sentAt: day(row.sent_at),
   dueDate: day(row.due_date),
   status: DATA_STATUSES.find((status) => status === row.status) ?? 'waiting',
   answer: str(row.answer),
   closedAt: day(row.closed_at),
   answeredBy: str(row.answered_by),
});

// The rows behind the state, to write changes back to.
let rowIds = {
   cycle: '',
   reports: new Map<string, string>(),
   values: new Map<string, string>(), // company/metric/period → metric_values
   // the figures a report row holds in its own column (batch 4)
   columns: new Set<string>(),
};
const investmentFields = (investment: Investment) => ({
   date: investment.date,
   instrument: investment.instrument,
   amount: investment.amount,
   valuation: investment.valuation,
   stake_pct: investment.stakePct,
});

const pilotFields = (input: PilotInput) => ({
   title: input.title,
   customer: input.customer,
   sponsor: input.sponsor,
   budget: input.budget,
   status: input.status,
   note: input.note,
   started_at: input.startedAt || null,
   ended_at: input.endedAt || null,
});

const reportKey = (companyId: string, quarter: string) =>
   `${companyId}/${quarter}`;
const valueKey = (companyId: string, metric: string, period: string) =>
   `${companyId}/${metric}/${period}`;

const store = createStore<PortfolioState>(async () => {
   // the companies' sectors are rows of Настройки's industries
   await settings.getSettings();
   const [
      [companies, investments, reports, pilots, requests, cycles, values],
      dataRequests,
   ] = await Promise.all([
      Promise.all(
         [
            'portfolio_companies',
            'investments',
            'quarter_reports',
            'pilots',
            'company_requests',
            'reporting_cycles',
            'metric_values',
         ].map((table) => listRows(table)),
      ),
      // the startup cabinet's table (batch 11): a project without it reads none
      listRows('company_data_requests').catch((error: unknown) => {
         console.warn('company_data_requests could not be read', error);
         return [];
      }),
   ]);
   const by = {
      investments: groupBy(investments, 'portfolio_companies_id'),
      reports: groupBy(reports, 'portfolio_companies_id'),
      pilots: groupBy(pilots, 'portfolio_companies_id'),
      values: groupBy(values, 'portfolio_companies_id'),
   };
   const latest = [...cycles].sort((a, b) =>
      str(b.quarter).localeCompare(str(a.quarter)),
   )[0];
   rowIds = {
      cycle: latest?.guid ?? '',
      reports: new Map(
         reports.map((row) => [
            reportKey(str(row.portfolio_companies_id), str(row.quarter)),
            row.guid,
         ]),
      ),
      values: new Map(
         values.map((row) => [
            valueKey(
               str(row.portfolio_companies_id),
               listKeyOf('metrics', row.portfolio_metrics_id) ?? '',
               str(row.quarter),
            ),
            row.guid,
         ]),
      ),
      columns: new Set(
         reports.flatMap((row) =>
            metricKeys()
               .filter((key) => row[key] !== undefined && row[key] !== null)
               .map((key) =>
                  valueKey(
                     str(row.portfolio_companies_id),
                     key,
                     str(row.quarter),
                  ),
               ),
         ),
      ),
   };
   const quarter = latest ? str(latest.quarter) : lastClosedQuarter();
   const rule = reportDates(quarter);
   return {
      companies: companies
         .map((row) =>
            toCompany(
               row,
               by.investments.get(row.guid) ?? [],
               by.reports.get(row.guid) ?? [],
               by.pilots.get(row.guid) ?? [],
               by.values.get(row.guid) ?? [],
            ),
         )
         .sort((a, b) => a.name.localeCompare(b.name)),
      requests: requests
         .map(toRequest)
         .sort((a, b) => b.openedAt.localeCompare(a.openedAt)),
      dataRequests: dataRequests
         .map(toDataRequest)
         .sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
      // ucode lists every field of a row, empty ones as null
      exitFields: companies.some((row) => 'exit_proceeds' in row),
      // known only from a pilot: none yet, and the fields are taken as there
      pilotFields: !pilots.length || pilots.some((row) => 'budget' in row),
      cycle: {
         quarter,
         due: (latest && day(latest.due)) || rule.due,
         requestedAt: latest ? day(latest.requested_at) : '',
         remindedAt: latest ? day(latest.reminded_at) : '',
         autoReminderAt:
            (latest && day(latest.auto_reminder_at)) || rule.autoReminderAt,
      },
   };
});

class Portfolio {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   // Reads the portfolio again: what the companies sent from the startup cabinet.
   async reload() {
      await store.reload();
   }

   async getState(): Promise<PortfolioState> {
      return store.get();
   }

   // The analyst checked the figures the fund's template brought in.
   async confirmMetrics(companyId: string, quarter: string, userId = '') {
      await store.get();
      const guid = rowIds.reports.get(reportKey(companyId, quarter));
      if (!guid)
         throw new Error(`No ${quarter} report of company ${companyId}`);
      await updateRow('quarter_reports', {
         guid,
         metrics_state: 'confirmed',
         confirmed_by_id: userId,
      });
      await store.reload();
   }

   /* A company's figures as the analyst enters or corrects them, by period
      (a quarter, 2026-Q3, or a month, 2026-09) and metric: a figure written,
      changed, or cleared (null deletes its row, and empties the quarter
      report's column that held it). */
   async saveMetrics(
      companyId: string,
      periods: Record<string, Record<MetricKey, number | null>>,
   ) {
      await store.get();
      const writes = Object.entries(periods).flatMap(([period, values]) => {
         const report = rowIds.reports.get(reportKey(companyId, period));
         const cleared = Object.entries(values)
            .filter(
               ([metric, value]) =>
                  value === null &&
                  rowIds.columns.has(valueKey(companyId, metric, period)),
            )
            .map(([metric]) => [metric, null]);
         return [
            ...Object.entries(values).map(([metric, value]) => {
               const guid = rowIds.values.get(
                  valueKey(companyId, metric, period),
               );
               if (guid)
                  return value === null
                     ? deleteRow('metric_values', guid)
                     : updateRow('metric_values', { guid, value });
               if (value === null) return Promise.resolve();
               return createRow('metric_values', {
                  guid: newId(),
                  quarter: period,
                  value,
                  portfolio_companies_id: companyId,
                  portfolio_metrics_id: listIdOf('metrics', metric),
               });
            }),
            ...(report && cleared.length
               ? [
                    updateRow('quarter_reports', {
                       guid: report,
                       ...Object.fromEntries(cleared),
                    }),
                 ]
               : []),
         ];
      });
      try {
         await Promise.all(writes);
      } finally {
         await store.reload();
      }
   }

   // A reminder goes to the cabinets of the companies that have not sent all
   // their documents yet; the first one requests the quarter's reports.
   async remind() {
      const { cycle } = await store.get();
      const today = todayISO();
      if (rowIds.cycle)
         await updateRow('reporting_cycles', {
            guid: rowIds.cycle,
            reminded_at: today,
            ...(cycle.requestedAt ? {} : { requested_at: today }),
         });
      else
         await createRow('reporting_cycles', {
            guid: newId(),
            quarter: cycle.quarter,
            due: cycle.due,
            requested_at: today,
            reminded_at: today,
            auto_reminder_at: cycle.autoReminderAt,
         });
      await store.reload();
   }

   /* A closed deal joins the portfolio: the company, with the deal's owner as
      its owner, and the fund's first investment. Once per deal: a deal whose
      payment is already there adds nothing. A follow-on, opened from the company's
      card, adds its investment to that company instead, and its round's price
      becomes the company's valuation. An older follow-on is known by its name
      («Компания · follow-on»). Returns the company's id. */
   async addFromDeal(
      deal: Deal,
      sector: { tagline: string; countries: string },
      investment: Investment,
      decisionId: string,
   ): Promise<string> {
      const { companies } = await store.get();
      const known = companyOfDeal(companies, deal.id);
      // a company whose first payment was refused halfway gets it on the next try
      if (known?.investments.length) return known.id;
      if (known) {
         await createRow('investments', {
            guid: newId(),
            ...investmentFields(investment),
            kind: 'initial',
            portfolio_companies_id: known.id,
            deals_id: deal.id,
            decisions_id: decisionId || null,
         });
         await store.reload();
         return known.id;
      }
      const parent =
         companies.find(({ id }) => id === deal.followOnOf) ??
         companies.find(({ name }) =>
            deal.company.toLowerCase().startsWith(`${name.toLowerCase()} ·`),
         );
      if (parent) {
         await createRow('investments', {
            guid: newId(),
            ...investmentFields(investment),
            kind: 'follow_on',
            portfolio_companies_id: parent.id,
            deals_id: deal.id,
            decisions_id: decisionId || null,
         });
         if (investment.valuation !== null)
            await updateRow('portfolio_companies', {
               guid: parent.id,
               valuation: String(Math.round(investment.valuation)),
            });
         await store.reload();
         return parent.id;
      }
      const id = newId();
      await createRow('portfolio_companies', {
         guid: id,
         name: deal.company,
         tagline: sector.tagline,
         about: deal.about,
         countries: sector.countries,
         instrument: investment.instrument,
         since: Number(investment.date.slice(0, 4)),
         owner_id: deal.ownerId,
         status: 'active',
         facts: '[]',
         industries_id: listIdOf('industries', deal.industryKey),
         deals_id: deal.id,
      });
      await createRow('investments', {
         guid: newId(),
         ...investmentFields(investment),
         kind: 'initial',
         portfolio_companies_id: id,
         deals_id: deal.id,
         decisions_id: decisionId || null,
      });
      await store.reload();
      return id;
   }

   /* A payment corrected, or its stake and valuation written once known: a SAFE
      that converts. The company shows its first payment's instrument and year. */
   async updateInvestment(
      companyId: string,
      investment: InvestmentRecord,
      input: Investment,
   ) {
      await updateRow('investments', {
         guid: investment.id,
         ...investmentFields(input),
      });
      if (investment.kind === 'initial')
         await updateRow('portfolio_companies', {
            guid: companyId,
            instrument: input.instrument,
            since: Number(input.date.slice(0, 4)),
         });
      await store.reload();
   }

   /* Deletes a company added to the portfolio by mistake, with all that is
      only its: the payments, the quarters' reports and figures, the pilots,
      the requests either way, its documents and files, and its tasks with
      their checklists and history. Its deal returns to its closing in the
      page that asks (deals.moveDeal); the website's row stays, as it may be
      published. Returns the deal it came from. */
   async removeCompany(id: string) {
      const rowsOf = async (table: string, field: string, key: string) =>
         (await listRows(table, { [field]: key }).catch(() => [] as Row[])).filter(
            (row) => row[field] === key,
         );
      const { companies } = await store.get();
      const dealId = companies.find((company) => company.id === id)?.dealId ?? '';
      const tasks = await rowsOf('tasks', 'portfolio_companies_id', id);
      const taskRows = await Promise.all(
         tasks.flatMap((task) => [
            rowsOf('task_checklist', 'tasks_id', task.guid).then((rows) =>
               rows.map((row) => ['task_checklist', row] as const),
            ),
            rowsOf('task_events', 'tasks_id', task.guid).then((rows) =>
               rows.map((row) => ['task_events', row] as const),
            ),
         ]),
      );
      const attachments = await rowsOf('attachments', 'portfolio_companies_id', id);
      const documents = await rowsOf('company_documents', 'portfolio_companies_id', id);
      try {
         await Promise.all(
            taskRows.flat().map(([table, row]) => deleteRow(table, row.guid)),
         );
         await Promise.all(tasks.map((task) => deleteRow('tasks', task.guid)));
         for (const table of [
            'investments',
            'quarter_reports',
            'metric_values',
            'pilots',
            'company_requests',
            'company_data_requests',
         ])
            await Promise.all(
               (await rowsOf(table, 'portfolio_companies_id', id)).map((row) =>
                  deleteRow(table, row.guid),
               ),
            );
         await Promise.all([
            ...attachments.map((row) => deleteRow('attachments', row.guid)),
            ...documents.map((row) => deleteRow('company_documents', row.guid)),
         ]);
         await deleteRow('portfolio_companies', id);
         await Promise.all(
            [...attachments, ...documents]
               .map((row) => str(row.file_id) || str(row.file))
               .filter((file) => file && !file.startsWith('http'))
               .map((file) => deleteFile(file).catch(() => undefined)),
         );
      } finally {
         await store.reload();
      }
      return dealId;
   }

   // A follow-on recorded by mistake; the first payment stays.
   async removeInvestment(id: string) {
      await deleteRow('investments', id);
      await store.reload();
   }

   // What the card changes about the company: the fields given, whether
   // the whole window or one field changed where it stands.
   async updateCompany(id: string, input: Partial<CompanyInput>) {
      await updateRow('portfolio_companies', {
         guid: id,
         ...(input.name !== undefined && { name: input.name }),
         ...(input.tagline !== undefined && { tagline: input.tagline }),
         ...(input.about !== undefined && { about: input.about }),
         ...(input.countries !== undefined && { countries: input.countries }),
         ...(input.ownerId !== undefined && { owner_id: input.ownerId }),
         ...(input.now !== undefined && { current_note: input.now }),
         ...(input.industryKey !== undefined && {
            industries_id: listIdOf('industries', input.industryKey) || null,
         }),
      });
      await store.reload();
   }

   // Someone is leaving: the companies they look after go to another person.
   async handOver(fromId: string, toId: string) {
      const { companies } = await store.get();
      await Promise.all(
         companies
            .filter(({ ownerId }) => ownerId === fromId)
            .map(({ id }) =>
               updateRow('portfolio_companies', { guid: id, owner_id: toId }),
            ),
      );
      await store.reload();
   }

   // The fund's valuation of the company (post-money, USD) on a reporting
   // date: the price of the last round or the fund's own.
   async setValuation(id: string, valuation: number) {
      await updateRow('portfolio_companies', {
         guid: id,
         valuation: String(Math.round(valuation)),
      });
      await store.reload();
   }

   // The fund leaves the company: sold (with what it brought) or written off.
   async recordExit(id: string, input: ExitInput) {
      await updateRow('portfolio_companies', {
         guid: id,
         status: input.status,
         exit_date: input.date || null,
         exit_proceeds: input.proceeds,
         exit_type: input.type || null,
         exit_buyer: input.buyer,
      });
      await store.reload();
   }

   // An exit recorded by mistake: the company is active again.
   async reopenCompany(id: string) {
      await updateRow('portfolio_companies', {
         guid: id,
         status: 'active',
         exit_date: null,
         exit_proceeds: null,
         exit_type: null,
         exit_buyer: '',
      });
      await store.reload();
   }

   async addPilot(companyId: string, input: PilotInput) {
      await createRow('pilots', {
         guid: newId(),
         ...pilotFields(input),
         portfolio_companies_id: companyId,
      });
      await store.reload();
   }

   async updatePilot(id: string, input: PilotInput) {
      await updateRow('pilots', { guid: id, ...pilotFields(input) });
      await store.reload();
   }

   async removePilot(id: string) {
      await deleteRow('pilots', id);
      await store.reload();
   }

   /* A request for data to a company: it shows in the company's startup
      cabinet («Компания» → «Запросы от фонда»), which answers it there. */
   async addDataRequest(
      companyId: string,
      input: DataRequestInput,
      userId: string,
   ) {
      await createRow('company_data_requests', {
         guid: newId(),
         title: input.title,
         text: input.text,
         due_date: input.dueDate || null,
         sent_by_id: userId,
         sent_at: todayISO(),
         status: 'waiting',
         answer: '',
         portfolio_companies_id: companyId,
      });
      await store.reload();
   }

   async updateDataRequest(id: string, input: DataRequestInput) {
      await updateRow('company_data_requests', {
         guid: id,
         title: input.title,
         text: input.text,
         due_date: input.dueDate || null,
      });
      await store.reload();
   }

   // The fund records an answer that came another way (a company without a cabinet).
   async recordDataAnswer(id: string, answer: string) {
      await updateRow('company_data_requests', {
         guid: id,
         status: 'accepted',
         answer,
         closed_at: todayISO(),
         answered_by: '',
      });
      await store.reload();
   }

   // The fund checked what the company answered in the cabinet.
   async acceptDataAnswer(id: string) {
      await updateRow('company_data_requests', {
         guid: id,
         status: 'accepted',
      });
      await store.reload();
   }

   // Deletes a request with its files: the fund's and those of the answer.
   async removeDataRequest(id: string, companyId: string) {
      await deleteRow('company_data_requests', id);
      await Promise.all(
         ['data_request', 'data_answer'].map((section) =>
            attachments.removeAt({ companyId, section, itemId: id }),
         ),
      );
      await store.reload();
   }

   async answerRequest(id: string, answer: string) {
      await updateRow('company_requests', {
         guid: id,
         status: 'closed',
         answer,
         answered_at: todayISO(),
      });
      await store.reload();
   }
}

export default new Portfolio();

import {
   createRow,
   day,
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
import type { Deal } from '@shared/types/deals.types';
import type {
   CompanyRequest,
   Instrument,
   Investment,
   MetricKey,
   PilotStatus,
   PortfolioCompany,
   QuarterReport,
   ReportingCycle,
   RequestStatus,
   SystemReportDoc,
} from '@shared/types/portfolio.types';
import {
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
   ../constants, and requesting the reports creates the row. */

export interface PortfolioState {
   companies: PortfolioCompany[];
   requests: CompanyRequest[];
   cycle: ReportingCycle;
}

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
   // a figure in metric_values; one a report row holds in its own column
   // (batch 4) counts while metric_values has none
   const valueOf = (key: MetricKey) =>
      Object.fromEntries([
         ...[...byQuarter].flatMap(([quarter, report]) =>
            report[key] === undefined || report[key] === null
               ? []
               : [[quarter, numOrNull(report[key])]],
         ),
         ...values
            .filter(
               (value) =>
                  listKeyOf('metrics', value.portfolio_metrics_id) === key,
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
      since: num(row.since),
      ownerId: str(row.owner_id),
      now: str(row.current_note),
      ...(row.deals_id ? { dealId: str(row.deals_id) } : {}),
      facts: fromJson<{ label: string; value: string }[]>(row.facts, []),
      position: { valuation: str(row.valuation), moic: str(row.moic) },
      reports: Object.fromEntries(
         [...byQuarter].map(([quarter, report]) => [quarter, toReport(report)]),
      ),
      metrics: metricKeys().map((key) => ({
         key,
         format: metricFormat(key),
         values: valueOf(key),
      })),
      pilots: pilots.map((pilot) => ({
         id: pilot.guid,
         title: str(pilot.title),
         customer: str(pilot.customer),
         status: (str(pilot.status) || 'in_progress') as PilotStatus,
         note: str(pilot.note),
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

// The rows behind the state, to write changes back to.
let rowIds = {
   cycle: '',
   reports: new Map<string, string>(),
   values: new Map<string, string>(), // company/metric/quarter → metric_values
   // the figures a report row holds in its own column (batch 4)
   columns: new Set<string>(),
};
const reportKey = (companyId: string, quarter: string) =>
   `${companyId}/${quarter}`;
const valueKey = (companyId: string, metric: string, quarter: string) =>
   `${companyId}/${metric}/${quarter}`;

const store = createStore<PortfolioState>(async () => {
   // the companies' sectors are rows of Настройки's industries
   await settings.getSettings();
   const [companies, investments, reports, pilots, requests, cycles, values] =
      await Promise.all(
         [
            'portfolio_companies',
            'investments',
            'quarter_reports',
            'pilots',
            'company_requests',
            'reporting_cycles',
            'metric_values',
         ].map((table) => listRows(table)),
      );
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

   /* A company's figures for a quarter, as the analyst enters or corrects
      them: a figure written, changed, or cleared (null deletes its row, and
      empties the report's column that held it). */
   async saveQuarterMetrics(
      companyId: string,
      quarter: string,
      values: Record<MetricKey, number | null>,
   ) {
      await store.get();
      const report = rowIds.reports.get(reportKey(companyId, quarter));
      const cleared = Object.entries(values)
         .filter(
            ([metric, value]) =>
               value === null &&
               rowIds.columns.has(valueKey(companyId, metric, quarter)),
         )
         .map(([metric]) => [metric, null]);
      await Promise.all([
         ...Object.entries(values).map(([metric, value]) => {
            const guid = rowIds.values.get(
               valueKey(companyId, metric, quarter),
            );
            if (guid)
               return value === null
                  ? deleteRow('metric_values', guid)
                  : updateRow('metric_values', { guid, value });
            if (value === null) return Promise.resolve();
            return createRow('metric_values', {
               guid: newId(),
               quarter,
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
      ]);
      await store.reload();
   }

   // Every figure of a company's quarter, deleted.
   async deleteQuarterMetrics(companyId: string, quarter: string) {
      const company = (await store.get()).companies.find(
         ({ id }) => id === companyId,
      );
      await this.saveQuarterMetrics(
         companyId,
         quarter,
         Object.fromEntries(
            (company?.metrics ?? [])
               .filter(({ values }) => values[quarter] != null)
               .map(({ key }) => [key, null]),
         ),
      );
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
      its owner, and the fund's first investment. Once per deal: for a deal that
      already has its company nothing is added. Returns the company's id. */
   async addFromDeal(
      deal: Deal,
      sector: { tagline: string; countries: string },
      investment: Investment,
      decisionId: string,
   ): Promise<string> {
      const { companies } = await store.get();
      const known = companies.find(({ dealId }) => dealId === deal.id);
      if (known) return known.id;
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
         date: investment.date,
         kind: 'initial',
         instrument: investment.instrument,
         amount: investment.amount,
         valuation: investment.valuation,
         stake_pct: investment.stakePct,
         portfolio_companies_id: id,
         deals_id: deal.id,
         decisions_id: decisionId || null,
      });
      await store.reload();
      return id;
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

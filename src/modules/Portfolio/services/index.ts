import {
   createRow,
   day,
   fromJson,
   groupBy,
   listRows,
   num,
   numOrNull,
   type Row,
   str,
   updateRow,
} from '@shared/api/ucode';
import { createStore, newId, todayISO } from '@shared/helpers';
import type {
   CompanyRequest,
   Instrument,
   MetricKey,
   PilotStatus,
   PortfolioCompany,
   QuarterReport,
   ReportDoc,
   ReportingCycle,
   RequestStatus,
} from '@shared/types/portfolio.types';
import { METRIC_FORMATS } from '../constants';
import { lastClosedQuarter, reportDates } from '../helpers';

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

const DOC_FIELDS: Record<ReportDoc, string> = {
   fund_template: 'fund_template_at',
   company_template: 'company_template_at',
   form1: 'form1_at',
   form2: 'form2_at',
};

const METRICS = Object.keys(METRIC_FORMATS) as MetricKey[];

const toReport = (row: Row): QuarterReport => ({
   received: Object.fromEntries(
      Object.entries(DOC_FIELDS).flatMap(([doc, field]) =>
         row[field] ? [[doc, day(row[field])]] : [],
      ),
   ),
   metrics: (str(row.metrics_state) || 'none') as QuarterReport['metrics'],
   filledAt: day(row.filled_at) || null,
});

const toCompany = (
   row: Row,
   investments: Row[],
   reports: Row[],
   pilots: Row[],
): PortfolioCompany => {
   const byQuarter = new Map(
      reports.map((report) => [str(report.quarter), report]),
   );
   return {
      id: row.guid,
      name: str(row.name),
      tagline: str(row.tagline),
      about: str(row.about),
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
      metrics: METRICS.map((key) => ({
         key,
         format: METRIC_FORMATS[key],
         values: Object.fromEntries(
            [...byQuarter].map(([quarter, report]) => [
               quarter,
               numOrNull(report[key]),
            ]),
         ),
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
let rowIds = { cycle: '', reports: new Map<string, string>() };
const reportKey = (companyId: string, quarter: string) =>
   `${companyId}/${quarter}`;

const store = createStore<PortfolioState>(async () => {
   const [companies, investments, reports, pilots, requests, cycles] =
      await Promise.all(
         [
            'portfolio_companies',
            'investments',
            'quarter_reports',
            'pilots',
            'company_requests',
            'reporting_cycles',
         ].map((table) => listRows(table)),
      );
   const by = {
      investments: groupBy(investments, 'portfolio_companies_id'),
      reports: groupBy(reports, 'portfolio_companies_id'),
      pilots: groupBy(pilots, 'portfolio_companies_id'),
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

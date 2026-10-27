// Портфель: the companies the fund has invested in, their quarterly
// reporting, pilots with the bank and requests to the fund.

export type Instrument = 'safe' | 'convertible' | 'equity';

// The report documents batch 4 started with; Настройки → Отчётность keeps
// the list (report_documents), the fund's own documents among them.
export type SystemReportDoc =
   'fund_template' | 'company_template' | 'form1' | 'form2';
export type ReportDoc = string;

export type MetricsState = 'none' | 'check' | 'confirmed';

export interface QuarterReport {
   received: Partial<Record<ReportDoc, string>>; // document → the day it came
   metrics: MetricsState;
   filledAt: string | null; // the day the figures came from the fund's template
}

export type MetricFormat = 'usd' | 'percent' | 'months' | 'number';

// The metrics batch 4 started with; Настройки → Показатели keeps the list
// (portfolio_metrics), the fund's own metrics among them.
export type SystemMetric =
   | 'mrr'
   | 'revenue'
   | 'margin'
   | 'burn'
   | 'runway'
   | 'clients'
   | 'churn'
   | 'team';
export type MetricKey = string;

export interface Metric {
   key: MetricKey;
   format: MetricFormat;
   values: Record<string, number | null>; // quarter → value
}

export type PilotStatus = 'planned' | 'in_progress' | 'success' | 'failed';

export interface Pilot {
   id: string;
   title: string;
   customer: string;
   status: PilotStatus;
   note: string;
}

export type RequestStatus = 'waiting_fund' | 'in_work' | 'closed';

// What a company asked the fund for.
export interface CompanyRequest {
   id: string;
   companyId: string;
   title: string;
   openedAt: string; // YYYY-MM-DD
   status: RequestStatus;
   note: string;
   ownerId: string;
   answer: string;
}

/* A request for data from the fund to a company (company_data_requests, ucode
   batch 11). The company answers it in the startup cabinet; its files are the
   company's attachments: the fund's under `data_request`, the answer's under
   `data_answer`, by the request's id. */
export interface CompanyDataRequest {
   id: string;
   companyId: string;
   title: string;
   text: string;
   byId: string; // the employee who asked
   sentAt: string; // YYYY-MM-DD
   dueDate: string; // YYYY-MM-DD
   // answered: the company answered in the cabinet and the fund checks it
   status: 'waiting' | 'answered' | 'accepted';
   answer: string;
   closedAt: string; // YYYY-MM-DD, '' while waiting
   answeredBy: string; // who answered in the cabinet (email), '' when the fund recorded it
}

export interface DataRequestInput {
   title: string;
   text: string;
   dueDate: string;
}

// portfolio_companies.status: held by the fund, sold, or written off.
export type CompanyStatus = 'active' | 'exit' | 'written_off';

export interface PortfolioCompany {
   id: string; // also the address of the company's card
   name: string;
   status: CompanyStatus;
   tagline: string; // the line under the name in the list
   about: string; // the line under the name on the card
   industryKey: string; // an industries key; '' when not set
   countries: string;
   instrument: Instrument;
   invested: number; // USD
   since: number; // year
   ownerId: string;
   now: string; // what is going on, when nothing more pressing is
   dealId?: string;
   facts: { label: string; value: string }[];
   position: { valuation: string; moic: string };
   reports: Record<string, QuarterReport>; // quarter → report
   metrics: Metric[];
   pilots: Pilot[];
   commercial?: { title: string; note: string };
}

// The fund's first investment, entered when a closed deal joins the portfolio.
export interface Investment {
   instrument: Instrument;
   amount: number; // USD
   date: string; // YYYY-MM-DD, the payment
   stakePct: number | null;
   valuation: number | null; // USD, post-money
}

export interface ReportingCycle {
   quarter: string; // 2026-Q3
   due: string; // YYYY-MM-DD
   requestedAt: string;
   remindedAt: string;
   autoReminderAt: string;
}

// Портфель: the companies the fund has invested in, their quarterly
// reporting, pilots with the bank and requests to the fund.

export type Instrument = 'safe' | 'equity';

export type ReportDoc =
   'fund_template' | 'company_template' | 'form1' | 'form2';

export type MetricsState = 'none' | 'check' | 'confirmed';

export interface QuarterReport {
   received: Partial<Record<ReportDoc, string>>; // document → the day it came
   metrics: MetricsState;
   filledAt: string | null; // the day the figures came from the fund's template
}

export type MetricFormat = 'usd' | 'percent' | 'months' | 'number';

export type MetricKey =
   | 'mrr'
   | 'revenue'
   | 'margin'
   | 'burn'
   | 'runway'
   | 'clients'
   | 'churn'
   | 'team';

export interface Metric {
   key: MetricKey;
   format: MetricFormat;
   values: Record<string, number | null>; // quarter → value
}

export type PilotStatus = 'success' | 'in_progress' | 'failed';

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

export interface PortfolioCompany {
   id: string; // also the address of the company's card
   name: string;
   tagline: string; // the line under the name in the list
   about: string; // the line under the name on the card
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

export interface ReportingCycle {
   quarter: string; // 2026-Q3
   due: string; // YYYY-MM-DD
   requestedAt: string;
   remindedAt: string;
   autoReminderAt: string;
}

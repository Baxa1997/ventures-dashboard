import { itemOf, listOf, nameOf } from '@modules/Settings/services';
import { formatDate, formatNumber, todayISO } from '@shared/helpers';
import dayjs from 'dayjs';
import type {
   CompanyRequest,
   Metric,
   MetricFormat,
   PortfolioCompany,
   ReportingCycle,
} from '@shared/types/portfolio.types';
import type { ItemFile } from '@shared/types/settings.types';
import type { TFunction } from 'i18next';
import {
   AUTO_REMINDER_DAYS,
   METRIC_FORMATS,
   METRIC_LABELS,
   QUARTERS_SHOWN,
   REPORT_DOC_LABELS,
   REPORT_DOCS,
   REPORTS_DUE_DAY,
   REQUEST_ANSWER_DAYS,
} from '../constants';

type T = TFunction<'portfolio'>;

// ---- the lists of Настройки → Портфель

// The documents of a quarter's report, in their order: Настройки →
// Отчётность, or the four of batch 4 until it is read.
export const reportDocs = () => {
   const list = listOf('reportDocs');
   return list.length ? list.map(({ key }) => key) : [...REPORT_DOCS];
};

export const reportDocName = (t: T, key: string) => {
   const item = itemOf('reportDocs', key);
   if (item) return nameOf(item);
   return key in REPORT_DOC_LABELS
      ? t(REPORT_DOC_LABELS[key as keyof typeof REPORT_DOC_LABELS])
      : key;
};

// The template a company fills in for the document, if the fund keeps one.
export const reportTemplate = (key: string): ItemFile | null =>
   itemOf('reportDocs', key)?.file ?? null;

// The metrics a company reports, in their order: Настройки → Показатели, or
// the eight of batch 4 until it is read.
export const metricKeys = () => {
   const list = listOf('metrics');
   return list.length
      ? list.map(({ key }) => key)
      : (Object.keys(METRIC_FORMATS) as (keyof typeof METRIC_FORMATS)[]);
};

export const metricFormat = (key: string): MetricFormat =>
   itemOf('metrics', key)?.format ??
   METRIC_FORMATS[key as keyof typeof METRIC_FORMATS] ??
   'number';

export const metricName = (t: T, key: string) => {
   const item = itemOf('metrics', key);
   if (item) return nameOf(item);
   return key in METRIC_LABELS
      ? t(METRIC_LABELS[key as keyof typeof METRIC_LABELS])
      : key;
};

// 2026-Q3 → "Q3 2026"; with `roman`, "III квартал 2026"
export const quarterLabel = (t: T, quarter: string, roman = false) => {
   const [year, q] = quarter.split('-Q');
   if (!roman) return `Q${q} ${year}`;
   return t('{{quarter}} квартал {{year}}', {
      quarter: ['I', 'II', 'III', 'IV'][Number(q) - 1],
      year,
   });
};

// "III квартал" without the year
export const quarterName = (t: T, quarter: string) =>
   t('{{quarter}} квартал', {
      quarter: ['I', 'II', 'III', 'IV'][Number(quarter.split('-Q')[1]) - 1],
   });

// The quarter before the one `today` is in: 2026-10-18 → 2026-Q3.
export const lastClosedQuarter = (today = todayISO()) => {
   const previous = dayjs(today).subtract(3, 'month');
   return `${previous.year()}-Q${Math.floor(previous.month() / 3) + 1}`;
};

// 2026-Q3 → 2026-Q2
const previousQuarter = (quarter: string) => {
   const [year, q] = quarter.split('-Q').map(Number);
   return q > 1 ? `${year}-Q${q - 1}` : `${year - 1}-Q4`;
};

// The quarters the tables show, oldest first, ending with `quarter`.
export const recentQuarters = (quarter: string, count = QUARTERS_SHOWN) => {
   const quarters = [quarter];
   while (quarters.length < count)
      quarters.unshift(previousQuarter(quarters[0]));
   return quarters;
};

// The reporting deadline of a quarter and its automatic reminder.
export const reportDates = (quarter: string) => {
   const [year, q] = quarter.split('-Q').map(Number);
   const due = dayjs(new Date(year, q * 3, REPORTS_DUE_DAY));
   return {
      due: due.format('YYYY-MM-DD'),
      autoReminderAt: due
         .subtract(AUTO_REMINDER_DAYS, 'day')
         .format('YYYY-MM-DD'),
   };
};

// $150K
export const formatK = (amount: number) => `$${Math.round(amount / 1000)}K`;

export const receivedCount = (company: PortfolioCompany, quarter: string) =>
   reportDocs().filter((doc) => company.reports[quarter]?.received[doc]).length;

export const hasAllDocs = (company: PortfolioCompany, quarter: string) =>
   receivedCount(company, quarter) === reportDocs().length;

// The quarter a day falls in: 2026-10-31 → 2026-Q4.
const quarterOf = (date: string) => {
   const day = dayjs(date);
   return `${day.year()}-Q${Math.floor(day.month() / 3) + 1}`;
};

// A company reports from the quarter the fund first paid in; null: not known.
const firstReportQuarter = ({ investments }: PortfolioCompany) =>
   investments[0]?.date ? quarterOf(investments[0].date) : null;

// A quarter that ended before the fund came in is owed by nobody.
export const owesReport = (company: PortfolioCompany, quarter: string) => {
   const first = firstReportQuarter(company);
   return !first || quarter >= first;
};

// Said while a new company owes nothing yet.
export const firstReportNote = (t: T, company: PortfolioCompany) => {
   const quarter = firstReportQuarter(company) ?? '';
   return t('Первый отчёт — за {{quarter}}, срок сдачи {{date}}', {
      quarter: quarterName(t, quarter),
      date: formatDate(reportDates(quarter).due),
   });
};

export const waitingDays = (request: CompanyRequest, today = todayISO()) =>
   dayjs(today).diff(dayjs(request.openedAt), 'day');

// A request the fund has left unanswered for too long.
export const isOverdue = (request: CompanyRequest) =>
   request.status === 'waiting_fund' &&
   waitingDays(request) > REQUEST_ANSWER_DAYS;

// What the list says is going on with a company: an unanswered request first,
// then a report to check, then the company's own line.
export const nowOf = (
   t: T,
   company: PortfolioCompany,
   requests: CompanyRequest[],
   cycle: ReportingCycle,
): { text: string; late: boolean } => {
   const overdue = requests.find(
      (request) => request.companyId === company.id && isOverdue(request),
   );
   if (overdue)
      return {
         text: t('{{title}} — ждёт ответа фонда {{count}} день', {
            title: overdue.title,
            count: waitingDays(overdue),
         }),
         late: true,
      };
   const report = company.reports[cycle.quarter];
   if (report?.metrics === 'check' && report.filledAt)
      return {
         text: t('Отчёт получен {{date}} — внести показатели', {
            date: dayjs(report.filledAt).format('D MMMM'),
         }),
         late: false,
      };
   if (report?.metrics === 'confirmed' && !company.now)
      return { text: t('Показатели за квартал подтверждены'), late: false };
   return { text: company.now || '—', late: false };
};

// $38 200, 71%, 14 мес, 212; −$18 500
export const formatMetric = (
   t: T,
   metric: Metric,
   value: number | null,
   language: string,
) => {
   if (value === null) return '';
   const digits =
      metric.format === 'percent' && !Number.isInteger(value) ? 1 : 0;
   const number = formatNumber(Math.abs(value), language, digits);
   const sign = value < 0 ? '−' : '';
   if (metric.format === 'usd') return `${sign}$${number}`;
   if (metric.format === 'percent') return `${sign}${number}%`;
   if (metric.format === 'months')
      return t('{{value}} мес', { value: `${sign}${number}` });
   return `${sign}${number}`;
};

// ---- the fund's position in a company

// The fund's valuation of the company (USD): the one set on its card, or the
// post-money of its latest investment that has one; null when neither says.
export const valuationOf = (company: PortfolioCompany) => {
   const own = company.position.valuation.trim();
   if (/^\d+(\.\d+)?$/.test(own)) return Number(own);
   const priced = [...company.investments]
      .reverse()
      .find(({ valuation }) => valuation !== null);
   return priced?.valuation ?? null;
};

// The fund's stake, %: its investments' stakes added up; null when none of
// them has one (a SAFE before it converts).
export const stakeOf = (company: PortfolioCompany) => {
   const stakes = company.investments.flatMap(({ stakePct }) =>
      stakePct === null ? [] : [stakePct],
   );
   return stakes.length ? stakes.reduce((sum, stake) => sum + stake, 0) : null;
};

/* What the fund's position is worth: the stake at the valuation while the
   company is held, what the exit brought after it (nothing for a write-off);
   MOIC is that against what was invested. Null where the figures are not
   known yet. */
export const positionOf = (company: PortfolioCompany) => {
   const stake = stakeOf(company);
   const valuation = valuationOf(company);
   const value =
      company.status === 'active'
         ? stake !== null && valuation !== null
            ? (valuation * stake) / 100
            : null
         : company.status === 'written_off'
           ? 0
           : (company.exit?.proceeds ?? null);
   const moic =
      value !== null && company.invested ? value / company.invested : null;
   return { stake, valuation, value, moic };
};

// The latest figure of a metric, with its quarter; null when there is none.
export const latestValue = (company: PortfolioCompany, key: string) => {
   const values = company.metrics.find((metric) => metric.key === key)?.values;
   const quarter = Object.keys(values ?? {})
      .filter((one) => values?.[one] != null)
      .sort()
      .at(-1);
   return values && quarter
      ? { quarter, value: values[quarter] as number }
      : null;
};

// The MRR of the active companies added up by quarter, oldest first.
export const mrrByQuarter = (companies: PortfolioCompany[]) => {
   const sums = new Map<string, number>();
   companies
      .filter(({ status }) => status === 'active')
      .forEach((company) => {
         const values =
            company.metrics.find(({ key }) => key === 'mrr')?.values ?? {};
         Object.entries(values).forEach(([quarter, value]) => {
            if (value != null)
               sums.set(quarter, (sums.get(quarter) ?? 0) + value);
         });
      });
   return [...sums]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([quarter, value]) => ({ quarter, value }));
};

// 1,85×
export const formatMoic = (moic: number, language: string) =>
   `${formatNumber(moic, language, 2)}×`;

// 12,5%
export const formatStake = (stake: number, language: string) =>
   `${formatNumber(stake, language, Number.isInteger(stake) ? 0 : 1)}%`;

import { formatNumber, todayISO } from '@shared/helpers';
import dayjs from 'dayjs';
import type {
   CompanyRequest,
   Metric,
   PortfolioCompany,
   ReportingCycle,
} from '@shared/types/portfolio.types';
import type { TFunction } from 'i18next';
import {
   AUTO_REMINDER_DAYS,
   QUARTERS_SHOWN,
   REPORT_DOCS,
   REPORTS_DUE_DAY,
   REQUEST_ANSWER_DAYS,
} from '../constants';

type T = TFunction<'portfolio'>;

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
   REPORT_DOCS.filter((doc) => company.reports[quarter]?.received[doc]).length;

export const hasAllDocs = (company: PortfolioCompany, quarter: string) =>
   receivedCount(company, quarter) === REPORT_DOCS.length;

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

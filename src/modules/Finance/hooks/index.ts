import { useRights } from '@modules/Settings/hooks/rights';
import settings from '@modules/Settings/services';
import { todayISO } from '@shared/helpers';
import { useServiceData } from '@shared/hooks';
import type { FinPeriod } from '@shared/types/finance.types';
import { useSearchParams } from 'react-router';
import finance from '../services';

// The accounts, line items, operations, statements and rules, and Настройки
// for the profit tax and the roles' rights.
const load = () =>
   Promise.all([finance.getState(), settings.getSettings()]).then(
      ([state]) => state,
   );

const subscribe = (listener: () => void) => {
   const offFinance = finance.subscribe(listener);
   const offSettings = settings.subscribe(listener);
   return () => {
      offFinance();
      offSettings();
   };
};

export const useFinance = () => useServiceData(load, subscribe);

// Whether the person may change Финансы, not only look at them.
export const useFinanceEditable = () => useRights()('finance') === 'full';

/* The report's year, its columns (months or quarters) and its currency, kept
   in the address, so P&L and Cash Flow open on the same choice and a link
   gives it: ?year=2026&by=quarter&currency=UZS. */
export const useReportParams = (years: number[], currencies: string[]) => {
   const [params, setParams] = useSearchParams();
   const thisYear = Number(todayISO().slice(0, 4));
   const year = Number(params.get('year')) || thisYear;
   const period: FinPeriod =
      params.get('by') === 'quarter' ? 'quarter' : 'month';
   const currency =
      currencies.find((one) => one === params.get('currency')) ??
      currencies[0] ??
      'USD';
   const set = (patch: {
      year?: number;
      period?: FinPeriod;
      currency?: string;
   }) => {
      const next = { year, period, currency, ...patch };
      const query: Record<string, string> = {};
      if (next.year !== thisYear) query.year = String(next.year);
      if (next.period === 'quarter') query.by = 'quarter';
      if (next.currency !== (currencies[0] ?? 'USD'))
         query.currency = next.currency;
      setParams(query, { replace: true });
   };
   return {
      year: years.includes(year) ? year : thisYear,
      period,
      currency,
      set,
   };
};

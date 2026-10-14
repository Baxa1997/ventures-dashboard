import committee from '@modules/Committee/services';
import portfolio from '@modules/Portfolio/services';
import { useServiceData } from '@shared/hooks';
import finance from '../services';

// The fund's finances, with the portfolio and the committee's agenda that the
// placement plan counts from.
const load = () =>
   Promise.all([
      finance.getState(),
      portfolio.getState(),
      committee.getState(),
   ]).then(([state, { companies }, { meetings }]) => ({
      ...state,
      companies,
      meetings,
   }));

const subscribe = (listener: () => void) => {
   const offs = [finance, portfolio, committee].map((service) =>
      service.subscribe(listener),
   );
   return () => offs.forEach((off) => off());
};

export const useFinance = () => useServiceData(load, subscribe);

export type FinanceData = NonNullable<ReturnType<typeof useFinance>>;

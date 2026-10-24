import portfolio from '@modules/Portfolio/services';
import work from '@modules/Work/services';
import { useServiceData } from '@shared/hooks';

// The tasks, for the conditions of the committee's approvals, and the
// portfolio's companies, for the one a closed deal became.
const load = () =>
   Promise.all([work.getTasks(), portfolio.getState()]).then(
      ([tasks, { companies }]) => ({ tasks, companies }),
   );

const subscribe = (listener: () => void) => {
   const offTasks = work.subscribeTasks(listener);
   const offPortfolio = portfolio.subscribe(listener);
   return () => {
      offTasks();
      offPortfolio();
   };
};

/* What a deal's card needs from Задачи and Портфель: the tasks and the
   company the deal became, if any. Empty until both are read. */
const useDealLinks = (dealId: string) => {
   const data = useServiceData(load, subscribe);
   return {
      tasks: data?.tasks ?? [],
      company: data?.companies.find((company) => company.dealId === dealId),
      loaded: data !== null,
   };
};

export default useDealLinks;

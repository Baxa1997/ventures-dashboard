import contracts from '@modules/Contracts/services';
import { investmentContractOf } from '@modules/Contracts/helpers';
import portfolio from '@modules/Portfolio/services';
import work from '@modules/Work/services';
import { useServiceData } from '@shared/hooks';

// The tasks, for the conditions of the committee's approvals; the portfolio's
// companies, for the one a closed deal became; the contracts, for the deal's.
const load = () =>
   Promise.all([
      work.getTasks(),
      portfolio.getState(),
      contracts.getContracts(),
      contracts.isStored(),
   ]).then(([tasks, { companies }, allContracts, contractsStored]) => ({
      tasks,
      companies,
      allContracts,
      contractsStored,
   }));

const subscribe = (listener: () => void) => {
   const offTasks = work.subscribeTasks(listener);
   const offPortfolio = portfolio.subscribe(listener);
   const offContracts = contracts.subscribe(listener);
   return () => {
      offTasks();
      offPortfolio();
      offContracts();
   };
};

/* What a deal's card needs from Задачи, Портфель and Договоры: the tasks, the
   company the deal became and its investment contract, if any. Empty until all
   are read. */
const useDealLinks = (dealId: string) => {
   const data = useServiceData(load, subscribe);
   return {
      tasks: data?.tasks ?? [],
      company: data?.companies.find((company) => company.dealId === dealId),
      contract: investmentContractOf(data?.allContracts ?? [], dealId),
      contractsStored: data?.contractsStored ?? false,
      loaded: data !== null,
   };
};

export default useDealLinks;

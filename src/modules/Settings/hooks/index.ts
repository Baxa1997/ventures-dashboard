import deals from '@modules/Deals/services';
import work from '@modules/Work/services';
import { useServiceData } from '@shared/hooks';

// Every deal and task, to count and list what is attached to each person.
const loadWork = () =>
   Promise.all([deals.getDeals(), work.getTasks()]).then(([all, tasks]) => ({
      deals: all,
      tasks,
   }));

const subscribeWork = (listener: () => void) => {
   const offDeals = deals.subscribe(listener);
   const offTasks = work.subscribeTasks(listener);
   return () => {
      offDeals();
      offTasks();
   };
};

export const usePeopleWork = () => useServiceData(loadWork, subscribeWork);

import deals from '@modules/Deals/services';
import settings from '@modules/Settings/services';
import work from '@modules/Work/services';
import { useServiceData } from '@shared/hooks';
import type { StaffLogin } from '@shared/types/settings.types';

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

const noLogins = (): Promise<StaffLogin[]> => Promise.resolve([]);
const loadLogins = () => settings.getLogins();
const subscribeLogins = (listener: () => void) =>
   settings.subscribeLogins(listener);

// Who signs in with what. Only the director reads them.
export const useLogins = (director: boolean) =>
   useServiceData(director ? loadLogins : noLogins, subscribeLogins) ?? [];

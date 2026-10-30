import settings from '@modules/Settings/services';
import work from '@modules/Work/services';
import { useRefreshOnReturn, useServiceData } from '@shared/hooks';
import attachments from '@shared/services/attachments';
import portfolio from '../services';

// The portfolio with the thresholds of its risk flags from the settings.
const load = () =>
   Promise.all([portfolio.getState(), settings.getSettings()]).then(
      ([state, { flags }]) => ({ ...state, flags }),
   );

const subscribe = (listener: () => void) => {
   const offPortfolio = portfolio.subscribe(listener);
   const offSettings = settings.subscribe(listener);
   return () => {
      offPortfolio();
      offSettings();
   };
};

// A company's reports and requests from the startup cabinet come in when the
// person returns to the tab.
const refresh = () => Promise.all([portfolio.reload(), attachments.reload()]);

export const usePortfolio = () => {
   useRefreshOnReturn(refresh);
   return useServiceData(load, subscribe);
};

export type PortfolioData = NonNullable<ReturnType<typeof usePortfolio>>;

const loadTasks = () => work.getTasks();
const subscribeTasks = (listener: () => void) => work.subscribeTasks(listener);

// The fund's tasks about a company, nearest deadline first; empty until read.
export const useCompanyTasks = (companyId: string) =>
   (useServiceData(loadTasks, subscribeTasks) ?? [])
      .filter(
         (task) =>
            task.relation === 'portfolio' && task.relationId === companyId,
      )
      .sort((a, b) =>
         (a.dueDate || '9999').localeCompare(b.dueDate || '9999'),
      );

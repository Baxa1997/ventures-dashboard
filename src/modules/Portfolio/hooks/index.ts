import settings from '@modules/Settings/services';
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

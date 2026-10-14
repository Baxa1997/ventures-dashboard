import settings from '@modules/Settings/services';
import { useServiceData } from '@shared/hooks';
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

export const usePortfolio = () => useServiceData(load, subscribe);

export type PortfolioData = NonNullable<ReturnType<typeof usePortfolio>>;

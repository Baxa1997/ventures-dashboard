import deals from '@modules/Deals/services';
import settings from '@modules/Settings/services';
import { useServiceData } from '@shared/hooks';
import contracts from '../services';

// The contracts, the deals they can belong to, and Настройки for the types.
const load = () =>
   Promise.all([
      contracts.getContracts(),
      contracts.isStored(),
      deals.getDeals(),
      settings.getSettings(),
   ]).then(([list, stored, allDeals]) => ({
      contracts: list,
      stored,
      deals: allDeals,
   }));

const subscribe = (listener: () => void) => {
   const offContracts = contracts.subscribe(listener);
   const offSettings = settings.subscribe(listener);
   return () => {
      offContracts();
      offSettings();
   };
};

export const useContracts = () => useServiceData(load, subscribe);

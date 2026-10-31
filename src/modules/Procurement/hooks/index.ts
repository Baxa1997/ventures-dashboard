import settings from '@modules/Settings/services';
import { useServiceData } from '@shared/hooks';
import procurement from '../services';

// The requests, and Настройки for their stages, categories and vendors.
const load = () =>
   Promise.all([
      procurement.getRequests(),
      procurement.isStored(),
      settings.getSettings(),
   ]).then(([requests, stored]) => ({ requests, stored }));

const subscribe = (listener: () => void) => {
   const offRequests = procurement.subscribe(listener);
   const offSettings = settings.subscribe(listener);
   return () => {
      offRequests();
      offSettings();
   };
};

export const useProcurement = () => useServiceData(load, subscribe);

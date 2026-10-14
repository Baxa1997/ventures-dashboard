import deals from '@modules/Deals/services';
import { useServiceData } from '@shared/hooks';
import committee from '../services';

// The committee's data with the deals its meetings decide on.
const load = () =>
   Promise.all([committee.getState(), deals.getDeals()]).then(
      ([state, allDeals]) => ({ ...state, deals: allDeals }),
   );

const subscribe = (listener: () => void) => {
   const offCommittee = committee.subscribe(listener);
   const offDeals = deals.subscribe(listener);
   return () => {
      offCommittee();
      offDeals();
   };
};

export const useCommittee = () => useServiceData(load, subscribe);

export type CommitteeData = NonNullable<ReturnType<typeof useCommittee>>;

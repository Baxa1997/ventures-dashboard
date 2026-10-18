import type { Deal, DealsSummary } from '@shared/types/deals.types';
import { useEffect, useState } from 'react';
import deals from '../services';

interface State {
   deals: Deal[];
   summary: DealsSummary | null;
   loading: boolean;
}

// The deals and the register's figures, loaded again after every change so
// each page shows what the others have changed.
const useDeals = () => {
   const [state, setState] = useState<State>({
      deals: [],
      summary: null,
      loading: true,
   });

   useEffect(() => {
      let active = true;
      const load = () =>
         Promise.all([deals.getDeals(), deals.getSummary()]).then(
            ([loaded, summary]) => {
               if (active) setState({ deals: loaded, summary, loading: false });
            },
            (error: unknown) => {
               // ucode could not be read: show what is there and say why in the console
               console.error(error);
               if (active) setState((state) => ({ ...state, loading: false }));
            },
         );
      load();
      const unsubscribe = deals.subscribe(load);
      return () => {
         active = false;
         unsubscribe();
      };
   }, []);

   return state;
};

export default useDeals;

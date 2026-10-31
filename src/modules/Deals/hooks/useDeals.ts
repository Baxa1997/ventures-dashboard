import work from '@modules/Work/services';
import type { Deal, DealsSummary } from '@shared/types/deals.types';
import { useCurrentUser, useRefreshOnReturn } from '@shared/hooks';
import { useEffect, useState } from 'react';
import deals from '../services';
import { summarize } from '../services/ucode';

interface State {
   deals: Deal[];
   summary: DealsSummary | null;
   loading: boolean;
}

// The deals the signed-in person sees and the register's figures, loaded again
// after every change so each page shows what the others have changed.
const useDeals = () => {
   const { id: userId } = useCurrentUser();
   const [state, setState] = useState<State>({
      deals: [],
      summary: null,
      loading: true,
   });

   useEffect(() => {
      let active = true;
      const load = () =>
         work.getVisibleDeals(userId).then(
            (loaded) => {
               if (active)
                  setState({
                     deals: loaded,
                     summary: summarize(loaded),
                     loading: false,
                  });
            },
            (error: unknown) => {
               // ucode could not be read: show what is there and say why in the console
               console.error(error);
               if (active) setState((state) => ({ ...state, loading: false }));
            },
         );
      load();
      const unsubscribe = deals.subscribe(load);
      const unsubscribeTasks = work.subscribeTasks(load);
      return () => {
         active = false;
         unsubscribe();
         unsubscribeTasks();
      };
   }, [userId]);
   // an answer from the startup cabinet comes in when the person returns
   useRefreshOnReturn(() => deals.reload());

   return state;
};

export default useDeals;

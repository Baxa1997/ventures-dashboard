import work from '@modules/Work/services';
import type { SectionCounters } from '@shared/types/work.types';
import { useEffect, useState } from 'react';

// Figures next to the sidebar items, kept in step with changes to the data.
const useCounters = (userId: string) => {
   const [counters, setCounters] = useState<SectionCounters>({});

   useEffect(() => {
      let active = true;
      const load = () =>
         work.getCounters(userId).then((loaded) => {
            if (active) setCounters(loaded);
         });
      load();
      const unsubscribe = work.subscribe(load);
      return () => {
         active = false;
         unsubscribe();
      };
   }, [userId]);

   return counters;
};

export default useCounters;

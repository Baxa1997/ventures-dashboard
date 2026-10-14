import { useEffect, useState } from 'react';

type Subscribe = (listener: () => void) => () => void;

/* Loads what a service returns and loads it again after every change the
   service reports, so each page shows what the others have changed. Pass
   functions defined outside the component: they must stay the same between
   renders. Returns null until the first load has finished. */
const useServiceData = <T>(load: () => Promise<T>, subscribe: Subscribe) => {
   const [data, setData] = useState<T | null>(null);

   useEffect(() => {
      let active = true;
      const run = () =>
         load().then((loaded) => {
            if (active) setData(loaded);
         });
      run();
      const unsubscribe = subscribe(run);
      return () => {
         active = false;
         unsubscribe();
      };
   }, [load, subscribe]);

   return data;
};

export default useServiceData;

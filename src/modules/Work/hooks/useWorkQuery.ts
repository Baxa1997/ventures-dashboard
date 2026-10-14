import { type DependencyList, useEffect, useState } from 'react';
import work from '../services';

// Loads a value from the work service and loads it again after every change
// to the stored data, so each page shows what the others have changed.
const useWorkQuery = <T>(
   load: () => Promise<T>,
   initial: T,
   deps: DependencyList,
) => {
   const [state, setState] = useState({ data: initial, loading: true });

   useEffect(() => {
      let active = true;
      const run = () =>
         load().then((data) => {
            if (active) setState({ data, loading: false });
         });
      run();
      const unsubscribe = work.subscribe(run);
      return () => {
         active = false;
         unsubscribe();
      };
   }, deps);

   return state;
};

export default useWorkQuery;

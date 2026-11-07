import { useEffect, useRef } from 'react';

// Returning to the tab reads again, at most this often.
const REFRESH_AFTER_MS = 60_000;
// While the tab stays in view, it reads again this often.
const REFRESH_EVERY_MS = 5 * 60_000;

/* Reads the rows again when the person comes back to the tab, and every few
   minutes while it is in view: what changed elsewhere (an answer or a report
   from the startup cabinet, a colleague's change) then shows without
   reopening the page. A field being typed in keeps what is typed. */
const useRefreshOnReturn = (refresh: () => Promise<unknown>) => {
   const latest = useRef(refresh);
   latest.current = refresh;

   useEffect(() => {
      let readAt = Date.now();
      const read = () => {
         readAt = Date.now();
         latest.current().catch((error: unknown) => console.error(error));
      };
      const onReturn = () => {
         if (document.visibilityState !== 'visible') return;
         if (Date.now() - readAt < REFRESH_AFTER_MS) return;
         read();
      };
      const timer = window.setInterval(() => {
         if (document.visibilityState === 'visible') read();
      }, REFRESH_EVERY_MS);
      window.addEventListener('focus', onReturn);
      document.addEventListener('visibilitychange', onReturn);
      return () => {
         window.clearInterval(timer);
         window.removeEventListener('focus', onReturn);
         document.removeEventListener('visibilitychange', onReturn);
      };
   }, []);
};

export default useRefreshOnReturn;

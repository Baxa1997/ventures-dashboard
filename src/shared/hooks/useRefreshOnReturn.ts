import { useEffect, useRef } from 'react';

// Returning to the tab reads again, at most this often.
const REFRESH_AFTER_MS = 60_000;

/* Reads a section's rows again when the person comes back to the tab: what
   changed elsewhere (an answer or a report from the startup cabinet, a
   colleague's change) then shows without reopening the page. The panel
   otherwise reads ucode when a page opens. */
const useRefreshOnReturn = (refresh: () => Promise<unknown>) => {
   const latest = useRef(refresh);
   latest.current = refresh;

   useEffect(() => {
      let readAt = Date.now();
      const onReturn = () => {
         if (document.visibilityState !== 'visible') return;
         if (Date.now() - readAt < REFRESH_AFTER_MS) return;
         readAt = Date.now();
         latest.current().catch((error: unknown) => console.error(error));
      };
      window.addEventListener('focus', onReturn);
      document.addEventListener('visibilitychange', onReturn);
      return () => {
         window.removeEventListener('focus', onReturn);
         document.removeEventListener('visibilitychange', onReturn);
      };
   }, []);
};

export default useRefreshOnReturn;

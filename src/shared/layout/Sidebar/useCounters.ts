import chatRead from '@modules/Chat/services/read';
import telegram from '@modules/Chat/services/telegram';
import finance from '@modules/Finance/services';
import work from '@modules/Work/services';
import type { SectionCounters } from '@shared/types/work.types';
import { useEffect, useState } from 'react';

/* Figures next to the sidebar items, kept in step with changes to the data.
   «Транзакции» counts the operations not sorted into a line item yet, for
   those who sort them: Финансы are read only for them. */
const useCounters = (userId: string, sortsFinance = false) => {
   const [counters, setCounters] = useState<SectionCounters>({});
   const [unsorted, setUnsorted] = useState(0);

   useEffect(() => {
      if (!sortsFinance) return;
      let active = true;
      const load = () =>
         finance.getState().then(
            ({ transactions }) => {
               if (active)
                  setUnsorted(
                     transactions.filter(({ category }) => !category).length,
                  );
            },
            () => undefined,
         );
      load();
      const unsubscribe = finance.subscribe(load);
      return () => {
         active = false;
         unsubscribe();
      };
   }, [sortsFinance]);

   useEffect(() => {
      let active = true;
      const load = () =>
         work.getCounters(userId).then((loaded) => {
            if (active) setCounters(loaded);
         });
      load();
      const unsubscribe = work.subscribe(load);
      // a group read or marked unread in «Чат и письма»
      const unsubscribeChat = chatRead.subscribe(load);
      const unsubscribeGroups = telegram.subscribe(load);
      return () => {
         active = false;
         unsubscribe();
         unsubscribeChat();
         unsubscribeGroups();
      };
   }, [userId]);

   return sortsFinance ? { ...counters, finance: unsorted } : counters;
};

export default useCounters;

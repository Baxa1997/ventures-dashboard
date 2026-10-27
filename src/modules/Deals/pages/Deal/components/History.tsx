import { journalText } from '@modules/Deals/helpers';
import { Card, NoData } from '@shared/components';
import { formatDayYear } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import { useTranslation } from 'react-i18next';

interface HistoryProps {
   deal: Deal;
}

// The deal's journal, newest first: stage moves, requests, decisions.
const History = ({ deal }: HistoryProps) => {
   const { t } = useTranslation('deals');

   if (!deal.journal.length)
      return (
         <Card className='grid flex-1 place-items-center'>
            <NoData>{t('Записей в журнале этой сделки в примере нет')}</NoData>
         </Card>
      );

   return (
      <Card title={t('Журнал сделки')}>
         <ol className='divide-line divide-y px-5 py-1'>
            {deal.journal.map((entry) => (
               <li
                  key={entry.id}
                  className='text-meta grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 py-3'
               >
                  <time className='text-ink-soft' dateTime={entry.date}>
                     {formatDayYear(entry.date)}
                  </time>
                  <span>{journalText(t, entry)}</span>
               </li>
            ))}
         </ol>
      </Card>
   );
};

export default History;

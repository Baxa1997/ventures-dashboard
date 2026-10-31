import { journalText, personName } from '@modules/Deals/helpers';
import { Card, NoData } from '@shared/components';
import { formatDayYear, formatNumericStamp } from '@shared/helpers';
import type { Deal, JournalEntry } from '@shared/types/deals.types';
import { useTranslation } from 'react-i18next';

interface HistoryProps {
   deal: Deal;
}

// Who made the entry: the employee, or the website for a new application.
const authorOf = (entry: JournalEntry) =>
   'userId' in entry ? personName(entry.userId) : '';

/* «История», as the design draws it: the deal's journal, newest first —
   stage moves, requests, documents, decisions — each with a dot, what
   happened, who did it and, on the right, when. */
const History = ({ deal }: HistoryProps) => {
   const { t } = useTranslation('deals');

   if (!deal.journal.length)
      return (
         <Card className='grid flex-1 place-items-center'>
            <NoData>{t('Записей в журнале этой сделки в примере нет')}</NoData>
         </Card>
      );

   return (
      <Card
         hint={t('{{count}} событие', { count: deal.journal.length })}
         title={t('История сделки')}
      >
         <ol className='divide-line divide-y'>
            {deal.journal.map((entry) => {
               const author =
                  authorOf(entry) ||
                  (entry.kind === 'created' ? t('Сайт') : '');
               return (
                  <li
                     key={entry.id}
                     className='flex items-center gap-3 px-4.5 py-2.75'
                  >
                     <span
                        aria-hidden
                        className='bg-sky size-2 shrink-0 rounded-full'
                     />
                     <div className='min-w-0 flex-1'>
                        <div className='text-meta'>{journalText(t, entry)}</div>
                        {author && (
                           <div className='text-ink-faint text-xs'>
                              {author}
                           </div>
                        )}
                     </div>
                     <time
                        className='text-ink-soft text-xs whitespace-nowrap tabular-nums'
                        dateTime={entry.at || entry.date}
                     >
                        {entry.at
                           ? formatNumericStamp(entry.at)
                           : formatDayYear(entry.date)}
                     </time>
                  </li>
               );
            })}
         </ol>
      </Card>
   );
};

export default History;

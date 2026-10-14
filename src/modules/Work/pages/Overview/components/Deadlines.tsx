import { SOON_DAYS } from '@modules/Work/constants';
import { daysUntil, formatWeekday } from '@modules/Work/helpers';
import { SECTION_LABELS } from '@shared/constants';
import type { WeekDeadline } from '@shared/types/work.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface DeadlinesProps {
   items: WeekDeadline[];
}

// The day is coloured when the deadline is close or is the event of the week.
const dayClass = ({ date, keyEvent }: WeekDeadline) => {
   if (daysUntil(date) <= SOON_DAYS) return 'text-warning-ink';
   return keyEvent ? 'text-accent' : 'text-ink-soft';
};

const Deadlines = ({ items }: DeadlinesProps) => {
   const { t } = useTranslation('layout');

   return (
      <ul className='divide-line divide-y px-5 py-1.5'>
         {items.map((item) => (
            <li key={item.id} className='flex gap-3 py-3.5'>
               <time
                  dateTime={item.date}
                  className={clsx(
                     'w-17 shrink-0 text-xs leading-4.5 font-semibold',
                     dayClass(item),
                  )}
               >
                  {formatWeekday(item.date)}
               </time>
               <div className='min-w-0'>
                  <div className='text-meta'>{item.title}</div>
                  <div className='text-ink-soft mt-px text-xs'>
                     {t(SECTION_LABELS[item.section])} · {item.note}
                  </div>
               </div>
            </li>
         ))}
      </ul>
   );
};

export default Deadlines;

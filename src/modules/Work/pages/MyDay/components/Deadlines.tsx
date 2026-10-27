import { SOON_DAYS } from '@modules/Work/constants';
import {
   daysUntil,
   deadlineWording,
   formatWeekday,
} from '@modules/Work/helpers';
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
   const { t: tWork } = useTranslation('work');
   const { t: tDeals } = useTranslation('deals');

   return (
      <ul className='divide-line divide-y px-4.5 py-1'>
         {items.map((item) => {
            const { title, note } = deadlineWording(tWork, tDeals, item);
            return (
               <li key={item.id} className='flex gap-3 py-3'>
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
                     <div className='font-medium'>{title}</div>
                     <div className='text-ink-soft mt-px text-xs'>
                        {[t(SECTION_LABELS[item.section]), note]
                           .filter(Boolean)
                           .join(' · ')}
                     </div>
                  </div>
               </li>
            );
         })}
      </ul>
   );
};

export default Deadlines;

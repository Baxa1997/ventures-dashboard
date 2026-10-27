import { stageNextLabel } from '@modules/Deals/helpers';
import { SECTION_PATHS } from '@shared/constants';
import type { ScheduleItem } from '@shared/types/work.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface ScheduleProps {
   items: ScheduleItem[];
}

// «Расписание»: today's meetings by the hour; the one going on is marked.
const Schedule = ({ items }: ScheduleProps) => {
   const { t } = useTranslation('work');
   const { t: tDeals } = useTranslation('deals');

   return (
      <ul>
         {items.map((item) => {
            const live = item.kind === 'meeting' && item.live;
            return (
               <li
                  key={item.id}
                  className={clsx(
                     'border-line grid grid-cols-[3.875rem_minmax(0,1fr)] gap-3 border-b px-4.5 py-3 last:border-b-0',
                     live && 'bg-accent-tint',
                  )}
               >
                  <time className='font-bold tabular-nums'>
                     {item.time || '—'}
                  </time>
                  {item.kind === 'meeting' ? (
                     <div>
                        <Link
                           className='font-semibold hover:underline'
                           to={`${SECTION_PATHS.committee}/${item.meetingId}`}
                        >
                           {item.body === 'board'
                              ? t('Заседание НС № {{number}}', {
                                   number: item.number,
                                })
                              : t('Заседание ИК № {{number}}', {
                                   number: item.number,
                                })}
                        </Link>
                        {(item.format || live) && (
                           <div className='text-ink-faint text-xs'>
                              {item.format}
                              {item.format && live && ' · '}
                              {live && (
                                 <b className='text-accent'>
                                    {t('идёт сейчас')}
                                 </b>
                              )}
                           </div>
                        )}
                     </div>
                  ) : (
                     <div>
                        <div className='font-semibold'>
                           {item.title || stageNextLabel(tDeals, item.stage)}
                        </div>
                        <Link
                           className='text-accent text-xs hover:underline'
                           to={`${SECTION_PATHS.deals}/${item.dealId}`}
                        >
                           {item.company}
                        </Link>
                     </div>
                  )}
               </li>
            );
         })}
      </ul>
   );
};

export default Schedule;

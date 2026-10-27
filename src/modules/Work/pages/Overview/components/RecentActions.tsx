import { journalAction, journalAuthor } from '@modules/Deals/helpers';
import { SECTION_PATHS } from '@shared/constants';
import {
   formatNumericDate,
   formatNumericStamp,
   personName,
} from '@shared/helpers';
import type { RecentAction } from '@shared/types/work.types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface RecentActionsProps {
   items: RecentAction[];
}

/* The latest lines of the deals' journals: the company and what happened,
   and under it who did it and when. Each opens its deal's history. */
const RecentActions = ({ items }: RecentActionsProps) => {
   const { t } = useTranslation('work');
   const { t: tDeals } = useTranslation('deals');

   return (
      <ul>
         {items.map(({ dealId, company, entry }) => {
            const author = journalAuthor(entry);
            return (
               <li key={entry.id} className='border-line border-b last:border-b-0'>
                  <Link
                     className='hover:bg-hover flex gap-2.5 px-4.5 py-2.75 transition-colors'
                     to={`${SECTION_PATHS.deals}/${dealId}?tab=history`}
                  >
                     <span
                        aria-hidden
                        className='bg-accent mt-1.75 size-1.75 shrink-0 rounded-full'
                     />
                     <div className='min-w-0'>
                        <div>
                           <span className='font-bold'>{company}</span>
                           {' · '}
                           {journalAction(tDeals, entry)}
                        </div>
                        <div className='text-ink-faint text-xs'>
                           {[
                              author ? personName(author) : t('Заявитель'),
                              entry.at
                                 ? formatNumericStamp(entry.at)
                                 : formatNumericDate(entry.date),
                           ].join(' · ')}
                        </div>
                     </div>
                  </Link>
               </li>
            );
         })}
      </ul>
   );
};

export default RecentActions;

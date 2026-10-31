import { stageName } from '@modules/Settings/services';
import { formatQuarter, relativeDay } from '@modules/Work/helpers';
import { SECTION_PATHS } from '@shared/constants';
import { formatNumericDate } from '@shared/helpers';
import type { UpcomingItem } from '@shared/types/work.types';
import type { TFunction } from 'i18next';
import {
   FileClock,
   FileSignature,
   Gavel,
   type LucideIcon,
   Timer,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface UpcomingProps {
   items: UpcomingItem[];
}

const ICONS: Record<UpcomingItem['kind'], LucideIcon> = {
   meeting: Gavel,
   stage: Timer,
   reports: FileClock,
   contract: FileSignature,
};

// A deadline's line and where it leads.
const wordingOf = (t: TFunction<'work'>, item: UpcomingItem) => {
   switch (item.kind) {
      case 'meeting':
         return {
            title:
               item.body === 'board'
                  ? t('Заседание НС № {{number}}', { number: item.number })
                  : t('Заседание ИК № {{number}}', { number: item.number }),
            to: `${SECTION_PATHS.committee}/${item.meetingId}`,
         };
      case 'stage':
         return {
            title: item.overdue
               ? t('Просрочен этап «{{stage}}» · {{company}}', {
                    stage: stageName(item.stage),
                    company: item.company,
                 })
               : t('Срок этапа «{{stage}}» · {{company}}', {
                    stage: stageName(item.stage),
                    company: item.company,
                 }),
            to: `${SECTION_PATHS.deals}/${item.dealId}`,
         };
      case 'reports':
         return {
            title: t('Квартальные отчёты компаний · {{quarter}}', {
               quarter: formatQuarter(item.quarter),
            }),
            to: SECTION_PATHS.portfolio,
         };
      case 'contract':
         return {
            title: t('Истекает договор {{number}} · {{party}}', {
               number: item.number,
               party: item.party,
            }),
            to: `${SECTION_PATHS.contracts}?open=${item.contractId}`,
         };
   }
};

// «Ближайшие сроки»: each with its date and how far it is.
const Upcoming = ({ items }: UpcomingProps) => {
   const { t } = useTranslation('work');

   return (
      <ul>
         {items.map((item) => {
            const Icon = ICONS[item.kind];
            const { title, to } = wordingOf(t, item);
            return (
               <li key={item.id} className='border-line border-b last:border-b-0'>
                  <Link
                     className='hover:bg-hover flex items-center gap-3 px-4.5 py-2.75 transition-colors'
                     to={to}
                  >
                     <Icon aria-hidden className='text-ink-faint size-4 shrink-0' />
                     <span className='min-w-0'>
                        <span className='block font-medium'>{title}</span>
                        <span className='text-ink-faint block text-xs'>
                           {formatNumericDate(item.date)} ·{' '}
                           {relativeDay(t, item.date)}
                        </span>
                     </span>
                  </Link>
               </li>
            );
         })}
      </ul>
   );
};

export default Upcoming;

import { stageName } from '@modules/Settings/services';
import { Badge, CompanyMark } from '@shared/components';
import { SECTION_PATHS } from '@shared/constants';
import type { AttentionItem } from '@shared/types/work.types';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ATTENTION_TONES } from '../constants';
import { formatQuarter } from '../helpers';

interface AttentionProps {
   items: AttentionItem[];
}

// Why the line is here, in the interface language.
const reasonOf = (t: TFunction<'work'>, item: AttentionItem) => {
   switch (item.kind) {
      case 'stage':
         return t('Просрочен этап «{{stage}}»: {{count}} раб. дн.', {
            stage: stageName(item.stage),
            count: item.days,
         });
      case 'requests':
         return t('Просрочен запрос документов: {{count}}', {
            count: item.count,
         });
      case 'inbox':
         return t('Заявка ждёт скрининга {{count}} дн.', { count: item.days });
      case 'report':
         return t('Не поданы отчёты за {{quarter}}', {
            quarter: formatQuarter(item.quarter),
         });
      case 'agenda':
         return t('Не включена в повестку ИК');
   }
};

// Where the line leads: the deal's card (its requests for a late request),
// or the company's card.
const targetOf = (item: AttentionItem) => {
   if (item.kind === 'report')
      return `${SECTION_PATHS.portfolio}/${item.companyId}`;
   const card = `${SECTION_PATHS.deals}/${item.dealId}`;
   return item.kind === 'requests' ? `${card}?tab=requests` : card;
};

// What is late or stands still in the fund's work, the most pressing first.
const Attention = ({ items }: AttentionProps) => {
   const { t } = useTranslation('work');

   return (
      <ul>
         {items.map((item) => (
            <li key={item.id} className='border-line border-b last:border-b-0'>
               <Link
                  className='hover:bg-hover flex items-center gap-3 px-4.5 py-2.75 transition-colors'
                  to={targetOf(item)}
               >
                  <CompanyMark name={item.subject} />
                  <div className='min-w-0 flex-1'>
                     <div className='truncate font-semibold'>{item.subject}</div>
                     <div className='text-ink-faint text-xs'>
                        {reasonOf(t, item)}
                     </div>
                  </div>
                  <Badge tone={ATTENTION_TONES[item.kind]} />
               </Link>
            </li>
         ))}
      </ul>
   );
};

export default Attention;

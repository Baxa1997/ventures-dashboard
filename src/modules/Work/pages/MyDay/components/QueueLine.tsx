import { WorkLine } from '@modules/Work/components';
import { queueWording, todayISO } from '@modules/Work/helpers';
import { Badge } from '@shared/components';
import { SECTION_LABELS, SECTION_PATHS } from '@shared/constants';
import type { QueueItem } from '@shared/types/work.types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface QueueLineProps {
   item: QueueItem;
   done: boolean;
   onTick: (item: QueueItem, done: boolean) => Promise<unknown>;
}

// A piece of work a deal or a company brings, in the row of a task: what to
// do, where it comes from, and its deadline. The row opens the deal.
const QueueLine = ({ item, done, onTick }: QueueLineProps) => {
   const { t } = useTranslation('work');
   const { t: tLayout } = useTranslation('layout');
   const { t: tDeals } = useTranslation('deals');
   const { title, note } = queueWording(t, tDeals, item);
   const to = item.dealId
      ? `${SECTION_PATHS.deals}/${item.dealId}`
      : SECTION_PATHS[item.section];

   return (
      <WorkLine
         done={done}
         dueDate={item.dueDate}
         overdue={!done && !!item.dueDate && item.dueDate < todayISO()}
         success={done ? t('Возвращено в работу') : t('Отмечено выполненным')}
         title={title}
         to={to}
         meta={
            <>
               <Badge tone='neutral'>
                  {tLayout(SECTION_LABELS[item.section])}
               </Badge>
               ·
               <Link className='text-accent hover:underline' to={to}>
                  {item.subject}
               </Link>
               {note && <span>· {note}</span>}
            </>
         }
         onToggle={() => onTick(item, !done)}
      />
   );
};

export default QueueLine;

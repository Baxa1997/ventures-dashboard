import { DueBadge, TaskCheck } from '@modules/Work/components';
import { listName } from '@modules/Settings/services';
import { queueWording } from '@modules/Work/helpers';
import { SECTION_LABELS } from '@shared/constants';
import { useRequest } from '@shared/hooks';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { DayItem } from '../helpers';

interface TaskRowProps {
   item: DayItem;
   onToggle: (item: DayItem) => Promise<unknown>;
}

// One thing to do: where it comes from, what it is and when it is due.
const TaskRow = ({ item, onToggle }: TaskRowProps) => {
   const { t } = useTranslation('work');
   const { t: tLayout } = useTranslation('layout');
   const { t: tDeals } = useTranslation('deals');
   const toggling = useRequest({
      success: item.done ? t('Возвращено в работу') : t('Отмечено выполненным'),
   });

   const text =
      item.kind === 'queue'
         ? {
              origin: [
                 item.item.subject,
                 tLayout(SECTION_LABELS[item.item.section]),
              ],
              ...queueWording(t, tDeals, item.item),
           }
         : {
              origin: [
                 listName('taskTypes', item.task.type),
                 item.task.context,
                 tLayout(SECTION_LABELS.tasks),
              ],
              title: item.task.title,
              note: item.task.basis,
           };

   return (
      <li className='flex items-start gap-3 py-3'>
         <TaskCheck
            busy={toggling.pending}
            done={item.done}
            title={text.title}
            onToggle={() => toggling.run(() => onToggle(item))}
         />
         <div className='min-w-0 flex-1'>
            <div className='text-ink-soft text-xs leading-4'>
               {text.origin.filter(Boolean).join(' · ')}
            </div>
            <div
               className={clsx(
                  'mt-px font-semibold',
                  item.done && 'text-ink-soft line-through',
               )}
            >
               {text.title}
            </div>
            {text.note && (
               <div className='text-ink-soft text-meta mt-px'>{text.note}</div>
            )}
         </div>
         {item.dueDate && !item.done && <DueBadge date={item.dueDate} />}
      </li>
   );
};

export default TaskRow;

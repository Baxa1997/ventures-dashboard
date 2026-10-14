import type { Task } from '@shared/types/work.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { formatDay, isDone, isOverdue, relativeDue } from '../helpers';

interface DueDateProps {
   task: Task;
}

// The deadline in a table cell: the day, and under it how far away it is.
const DueDate = ({ task }: DueDateProps) => {
   const { t } = useTranslation('work');

   if (!task.dueDate)
      return (
         <div className='whitespace-nowrap'>
            <div aria-hidden className='text-ink-faint'>
               —
            </div>
            <div className='text-ink-faint text-xs'>{t('срок не задан')}</div>
         </div>
      );

   const overdue = isOverdue(task);
   const relative = isDone(task) ? '' : relativeDue(t, task.dueDate);

   return (
      <div className={clsx('whitespace-nowrap', overdue && 'text-danger')}>
         <time dateTime={task.dueDate}>{formatDay(task.dueDate)}</time>
         {relative && (
            <div className={clsx('text-xs', !overdue && 'text-ink-soft')}>
               {relative}
            </div>
         )}
      </div>
   );
};

export default DueDate;

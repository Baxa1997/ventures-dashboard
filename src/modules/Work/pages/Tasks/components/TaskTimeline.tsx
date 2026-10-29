import {
   isDone,
   isOverdue,
   statusFill,
   statusName,
   taskKey,
} from '@modules/Work/helpers';
import { openTask } from '@modules/Work/hooks';
import { Timeline, TONE_COLORS } from '@shared/components';
import {
   formatNumericDate,
   type TimelineGrid,
   timelineShare,
} from '@shared/helpers';
import type { Task } from '@shared/types/work.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface TaskTimelineProps {
   tasks: Task[];
}

/* «Таймлайн»: each task as a bar from the day it was made to its deadline,
   in red once it is late, over four weeks of days, sixteen weeks or a year
   of months. A task without a deadline has no bar. */
const TaskTimeline = ({ tasks }: TaskTimelineProps) => {
   const { t } = useTranslation('work');

   const rows = (grid: TimelineGrid) =>
      tasks.flatMap((task) => {
         if (!task.dueDate) return [];
         const start =
            task.createdAt && task.createdAt < task.dueDate
               ? task.createdAt
               : task.dueDate;
         if (grid.index(task.dueDate) < 0 || grid.index(start) >= grid.total)
            return [];
         const first = Math.max(0, grid.index(start));
         const last = Math.max(
            first,
            Math.min(grid.total - 1, grid.index(task.dueDate)),
         );
         const color = isOverdue(task)
            ? TONE_COLORS.danger
            : statusFill(task.status);
         return [
            {
               id: task.id,
               name: (
                  <div
                     className={clsx(
                        'text-meta truncate font-medium',
                        isDone(task) && 'text-ink-faint line-through',
                     )}
                     title={task.title}
                  >
                     <span className='text-ink-faint text-xs tabular-nums'>
                        {taskKey(task)}
                     </span>{' '}
                     {task.title}
                  </div>
               ),
               bars: (
                  <button
                     type='button'
                     aria-label={task.title}
                     className='absolute top-1/2 h-4.5 -translate-y-1/2 rounded-full opacity-85 hover:opacity-100'
                     style={{
                        background: color,
                        left: `calc(${timelineShare(first, grid.total)} + 2px)`,
                        width: `max(6px, calc(${timelineShare(last - first + 1, grid.total)} - 4px))`,
                     }}
                     title={`${task.title} · ${formatNumericDate(start)} – ${formatNumericDate(task.dueDate)} · ${statusName(t, task.status)}`}
                     onClick={() => openTask(task.id)}
                  />
               ),
            },
         ];
      });

   return (
      <Timeline
         empty={t('Нет задач в этом периоде')}
         hint={t('Полоса: от даты создания до дедлайна')}
         nameLabel={t('Задача')}
         rows={rows}
         scales={['day', 'week', 'month']}
      />
   );
};

export default TaskTimeline;

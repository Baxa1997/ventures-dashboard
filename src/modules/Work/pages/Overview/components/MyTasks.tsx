import { listName } from '@modules/Settings/services';
import { TaskCheck } from '@modules/Work/components';
import { TASK_RELATION_SECTIONS } from '@modules/Work/constants';
import { isOverdue, typeTone } from '@modules/Work/helpers';
import { Badge } from '@shared/components';
import { SECTION_PATHS } from '@shared/constants';
import { formatNumericDate } from '@shared/helpers';
import { useRequest } from '@shared/hooks';
import type { Task } from '@shared/types/work.types';
import clsx from 'clsx';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

interface MyTasksProps {
   tasks: Task[];
   targetName: (task: Task) => string;
   onTick: (task: Task) => Promise<unknown>;
}

interface TaskLineProps {
   task: Task;
   target: string;
   onTick: (task: Task) => Promise<unknown>;
}

/* A task: its tick, its title, its type, what it is about and its deadline.
   The row opens the task in Задачи; the tick and the link do their own. */
const TaskLine = ({ task, target, onTick }: TaskLineProps) => {
   const { t } = useTranslation('work');
   const navigate = useNavigate();
   const ticking = useRequest({ success: t('Отмечено выполненным') });
   const overdue = isOverdue(task);
   const done = task.checklist.filter((item) => item.done).length;
   const targetPath =
      task.relation === 'none'
         ? ''
         : `${SECTION_PATHS[TASK_RELATION_SECTIONS[task.relation]]}/${task.relationId}`;

   const open = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('a, button')) return;
      navigate(`${SECTION_PATHS.tasks}?task=${task.id}`);
   };

   return (
      // the row's click is for the mouse; the title is the keyboard's link
      <li
         className='border-line hover:bg-hover flex cursor-pointer items-start gap-3 border-b px-4.5 py-2.75 transition-colors last:border-b-0'
         onClick={open}
      >
         <span className='mt-0.5'>
            <TaskCheck
               busy={ticking.pending}
               done={false}
               title={task.title}
               onToggle={() => ticking.run(() => onTick(task))}
            />
         </span>
         <div className='min-w-0 flex-1'>
            <Link
               className='block font-semibold'
               to={`${SECTION_PATHS.tasks}?task=${task.id}`}
            >
               {task.title}
            </Link>
            <div className='text-ink-faint mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs'>
               <Badge tone={typeTone(task.type)}>
                  {listName('taskTypes', task.type)}
               </Badge>
               {target && targetPath && (
                  <>
                     ·
                     <Link
                        className='text-accent hover:underline'
                        to={targetPath}
                     >
                        {target}
                     </Link>
                  </>
               )}
               {task.checklist.length > 0 && (
                  <span className='tabular-nums'>
                     · ☑ {done}/{task.checklist.length}
                  </span>
               )}
            </div>
         </div>
         {task.dueDate && (
            <time
               className={clsx(
                  'mt-0.5 shrink-0 text-xs whitespace-nowrap',
                  overdue ? 'text-danger font-semibold' : 'text-ink-faint',
               )}
               dateTime={task.dueDate}
            >
               {overdue
                  ? t('Просрочена · {{date}}', {
                       date: formatNumericDate(task.dueDate),
                    })
                  : formatNumericDate(task.dueDate)}
            </time>
         )}
      </li>
   );
};

// The signed-in person's open tasks, the nearest deadline first.
const MyTasks = ({ tasks, targetName, onTick }: MyTasksProps) => (
   <ul>
      {tasks.map((task) => (
         <TaskLine
            key={task.id}
            target={targetName(task)}
            task={task}
            onTick={onTick}
         />
      ))}
   </ul>
);

export default MyTasks;

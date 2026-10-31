import { listName } from '@modules/Settings/services';
import { StatusBadge, TaskCheck } from '@modules/Work/components';
import {
   TASK_GROUP_LABELS,
   TASK_GROUP_ORDER,
   TASK_PRIORITY_LABELS,
   TASK_RELATION_SECTIONS,
} from '@modules/Work/constants';
import {
   getAssigneeId,
   isOverdue,
   statusGroup,
   taskKey,
   tickOf,
   typeTone,
} from '@modules/Work/helpers';
import { openTask } from '@modules/Work/hooks';
import {
   Avatar,
   Badge,
   type BadgeTone,
   Card,
   NoData,
   Table,
   TD,
   TH,
} from '@shared/components';
import { SECTION_PATHS } from '@shared/constants';
import { formatNumericDate, personName } from '@shared/helpers';
import { useCurrentUser, useRequest } from '@shared/hooks';
import type { Task, TaskPriority } from '@shared/types/work.types';
import clsx from 'clsx';
import { Fragment, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

const PRIORITY_TONES: Record<TaskPriority, BadgeTone> = {
   high: 'danger',
   medium: 'warning',
   low: 'neutral',
};

interface TaskTableProps {
   tasks: Task[];
   targetName: (task: Task) => string;
   files: Map<string, number>; // attachments by task
   onTick: (task: Task) => Promise<unknown>;
}

interface TaskRowProps extends Omit<TaskTableProps, 'tasks' | 'files'> {
   task: Task;
   fileCount: number;
}

// A row: the tick, the task with its checklist, files and comments, its
// type, status, deal, who does it, priority and deadline. The row opens the
// task's card; the title is the keyboard's way to it.
const TaskRow = ({ task, targetName, fileCount, onTick }: TaskRowProps) => {
   const { t } = useTranslation('work');
   const user = useCurrentUser();
   const { done, sent, note } = tickOf(task, user.id);
   const ticking = useRequest({ success: t(note) });
   const overdue = !sent && isOverdue(task);
   const ticked = task.checklist.filter((item) => item.done).length;
   const comments = task.history.filter(({ kind }) => kind === 'comment');
   const target = targetName(task);
   const assignee = personName(getAssigneeId(task));

   const open = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('a, button')) return;
      openTask(task.id);
   };

   return (
      <tr className='hover:bg-hover cursor-pointer' onClick={open}>
         <td className={clsx(TD, 'w-9')}>
            <TaskCheck
               busy={ticking.pending}
               done={done}
               title={task.title}
               onToggle={() => ticking.run(() => onTick(task))}
            />
         </td>
         <td className={TD}>
            <div className='min-w-60'>
               <button
                  type='button'
                  className='text-left'
                  onClick={() => openTask(task.id)}
               >
                  <span className='text-ink-faint tabular-nums'>
                     {taskKey(task)}
                  </span>{' '}
                  <span
                     className={clsx(
                        'font-semibold',
                        done && 'text-ink-faint line-through',
                     )}
                  >
                     {task.title}
                  </span>
               </button>
               {(task.checklist.length > 0 ||
                  fileCount > 0 ||
                  comments.length > 0) && (
                  <div className='text-ink-faint mt-0.5 flex gap-2 text-xs tabular-nums'>
                     {task.checklist.length > 0 && (
                        <span>
                           ☑ {ticked}/{task.checklist.length}
                        </span>
                     )}
                     {fileCount > 0 && <span>📎 {fileCount}</span>}
                     {comments.length > 0 && <span>💬 {comments.length}</span>}
                  </div>
               )}
            </div>
         </td>
         <td className={clsx(TD, 'whitespace-nowrap')}>
            <Badge tone={typeTone(task.type)}>
               {listName('taskTypes', task.type)}
            </Badge>
         </td>
         <td className={clsx(TD, 'whitespace-nowrap')}>
            <StatusBadge status={task.status} />
         </td>
         <td className={clsx(TD, 'whitespace-nowrap')}>
            {task.relation !== 'none' && target ? (
               <Link
                  className='text-accent hover:underline'
                  to={`${SECTION_PATHS[TASK_RELATION_SECTIONS[task.relation]]}/${task.relationId}`}
               >
                  {target}
               </Link>
            ) : (
               <span className='text-ink-faint'>—</span>
            )}
         </td>
         <td className={TD}>
            <span className='flex' title={assignee}>
               <Avatar name={assignee} />
               <span className='sr-only'>{assignee}</span>
            </span>
         </td>
         <td className={clsx(TD, 'whitespace-nowrap')}>
            <Badge tone={PRIORITY_TONES[task.priority]}>
               {t(TASK_PRIORITY_LABELS[task.priority])}
            </Badge>
         </td>
         <td
            className={clsx(TD, 'whitespace-nowrap', overdue && 'text-danger')}
         >
            {task.dueDate
               ? formatNumericDate(task.dueDate)
               : task.dueLabel || '—'}
         </td>
      </tr>
   );
};

const COLUMNS = 8;

/* «Список»: the tasks in a table by the groups of their statuses — «К
   выполнению», «В работе», «Завершено» — each under its name and count,
   the nearest deadline first within it. */
const TaskTable = ({ tasks, targetName, files, onTick }: TaskTableProps) => {
   const { t } = useTranslation('work');
   const groups = TASK_GROUP_ORDER.map((group) => ({
      group,
      tasks: tasks.filter((task) => statusGroup(task.status) === group),
   })).filter((one) => one.tasks.length);

   return (
      <Card>
         {tasks.length ? (
            <Table
               className='min-w-240'
               head={
                  <>
                     <th className={clsx(TH, 'w-9')}>
                        <span className='sr-only'>{t('Выполнено')}</span>
                     </th>
                     <th className={TH}>{t('Задача')}</th>
                     <th className={TH}>{t('Тип')}</th>
                     <th className={TH}>{t('Статус')}</th>
                     <th className={TH}>{t('Сделка')}</th>
                     <th className={TH}>{t('Исполнители')}</th>
                     <th className={TH}>{t('Приоритет')}</th>
                     <th className={TH}>{t('Срок')}</th>
                  </>
               }
            >
               {groups.map(({ group, tasks: inGroup }) => (
                  <Fragment key={group}>
                     <tr className='bg-ground/70'>
                        <th
                           className='text-ink-soft px-4.5 py-2 text-left text-[11px] font-bold tracking-[0.06em] uppercase'
                           colSpan={COLUMNS}
                           scope='rowgroup'
                        >
                           {t(TASK_GROUP_LABELS[group])}
                           <span className='bg-hover ml-2 rounded-full px-2 py-0.5 tabular-nums'>
                              {inGroup.length}
                           </span>
                        </th>
                     </tr>
                     {inGroup.map((task) => (
                        <TaskRow
                           key={task.id}
                           fileCount={files.get(task.id) ?? 0}
                           targetName={targetName}
                           task={task}
                           onTick={onTick}
                        />
                     ))}
                  </Fragment>
               ))}
            </Table>
         ) : (
            <NoData>{t('Задач по этим условиям нет.')}</NoData>
         )}
         <div className='border-line text-ink-soft flex flex-wrap justify-between gap-x-4 gap-y-1 border-t px-4.5 py-2.5 text-xs'>
            <span>{t('{{count}} задача', { count: tasks.length })}</span>
            <span>{t('Нажмите на задачу, чтобы открыть карточку')}</span>
         </div>
      </Card>
   );
};

export default TaskTable;

import { DueDate, StatusBadge } from '@modules/Work/components';
import { listName } from '@modules/Settings/services';
import {
   getAssigneeId,
   getEmployee,
   shortName,
   taskStatuses,
} from '@modules/Work/helpers';
import { Avatar, ItemActions } from '@shared/components';
import type { Employee, Task } from '@shared/types/work.types';
import clsx from 'clsx';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { RECURS_LABELS } from '../constants';

interface TasksTableProps {
   tasks: Task[];
   employees: Employee[];
   selectedId?: string;
   onSelect: (id: string) => void;
   onEdit: (task: Task) => void;
   onDelete: (task: Task) => void; // asks first
}

const TH = 'px-3 py-2.5 text-xs font-normal text-ink-soft';

// The tasks by status, in the order Настройки give the statuses; a status
// the list no longer has comes last.
const byStatus = (tasks: Task[]) => {
   const order = taskStatuses().map(({ key }) => key);
   const rank = (status: string) =>
      order.includes(status) ? order.indexOf(status) : order.length;
   const groups = new Map<string, Task[]>();
   for (const task of [...tasks].sort(
      (a, b) => rank(a.status) - rank(b.status),
   ))
      groups.set(task.status, [...(groups.get(task.status) ?? []), task]);
   return [...groups];
};

// A click anywhere in a row opens the task in the card beside the table; the
// title is a button, so the keyboard and screen readers can do the same.
// Each row ends with its pencil and bin. The rows come in groups, one per
// status.
const TasksTable = ({
   tasks,
   employees,
   selectedId,
   onSelect,
   onEdit,
   onDelete,
}: TasksTableProps) => {
   const { t } = useTranslation('work');

   return (
      <div className='overflow-x-auto'>
         <table className='text-meta w-full min-w-2xl border-collapse text-left'>
            <thead>
               <tr className='border-line border-b'>
                  <th className={`${TH} pl-5`}>{t('Задача')}</th>
                  <th className={`${TH} w-37.5 pl-0`}>{t('Исполнитель')}</th>
                  <th className={`${TH} w-27`}>{t('Срок')}</th>
                  <th className={`${TH} w-32`}>{t('Статус')}</th>
                  <th className={`${TH} w-20 pr-5`}>
                     <span className='sr-only'>{t('Действия')}</span>
                  </th>
               </tr>
            </thead>
            <tbody className='divide-line divide-y'>
               {byStatus(tasks).map(([status, group]) => (
                  <Fragment key={status}>
                     <tr className='bg-ground/70'>
                        <th
                           className='px-5 py-2 text-left font-normal'
                           colSpan={5}
                           scope='rowgroup'
                        >
                           <span className='flex items-center gap-2'>
                              <StatusBadge status={status} />
                              <span className='text-ink-soft text-xs'>
                                 {group.length}
                              </span>
                           </span>
                        </th>
                     </tr>
                     {group.map((task) => {
                        const selected = task.id === selectedId;
                        const assignee = getEmployee(
                           employees,
                           getAssigneeId(task),
                        );
                        return (
                           <tr
                              key={task.id}
                              className={clsx(
                                 'cursor-pointer',
                                 selected ? 'bg-ground' : 'hover:bg-ground/60',
                              )}
                              onClick={() => onSelect(task.id)}
                           >
                              <td
                                 className={clsx(
                                    'py-3.25 pr-2 pl-5',
                                    selected &&
                                       'shadow-[inset_3px_0_0_var(--color-accent)]',
                                 )}
                              >
                                 <div className='text-ink-soft text-xs leading-4'>
                                    {[
                                       listName('taskTypes', task.type),
                                       task.context,
                                    ]
                                       .filter(Boolean)
                                       .join(' · ')}
                                 </div>
                                 <button
                                    type='button'
                                    aria-pressed={selected}
                                    className='mt-0.5 text-left font-medium'
                                 >
                                    {task.title}
                                 </button>
                                 {task.recurrence !== 'none' && (
                                    <div className='text-accent mt-0.5 text-xs'>
                                       {t(RECURS_LABELS[task.recurrence])}
                                    </div>
                                 )}
                              </td>
                              <td className='py-3.25 pr-3'>
                                 {assignee && (
                                    <div className='flex items-center gap-2.5 whitespace-nowrap'>
                                       <Avatar name={assignee.name} />
                                       <div>
                                          {shortName(assignee.name)}
                                          {!task.assigneeId && (
                                             <div className='text-warning-ink text-xs'>
                                                {t('по умолчанию')}
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                 )}
                              </td>
                              <td className='px-3 py-3.25'>
                                 <DueDate task={task} />
                              </td>
                              <td className='px-3 py-3.25'>
                                 <StatusBadge status={task.status} />
                              </td>
                              {/* the buttons do not open the task in the card */}
                              <td
                                 className='py-2 pr-5'
                                 onClick={(event) => event.stopPropagation()}
                              >
                                 <ItemActions
                                    icons
                                    name={task.title}
                                    onDelete={() => onDelete(task)}
                                    onEdit={() => onEdit(task)}
                                 />
                              </td>
                           </tr>
                        );
                     })}
                  </Fragment>
               ))}
            </tbody>
         </table>
      </div>
   );
};

export default TasksTable;

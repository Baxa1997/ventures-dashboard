import { DueDate, StatusBadge } from '@modules/Work/components';
import { listName } from '@modules/Settings/services';
import { getAssigneeId, getEmployee, shortName } from '@modules/Work/helpers';
import { Avatar } from '@shared/components';
import type { Employee, Task } from '@shared/types/work.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { RECURS_LABELS } from '../constants';

interface TasksTableProps {
   tasks: Task[];
   employees: Employee[];
   selectedId?: string;
   onSelect: (id: string) => void;
}

const TH = 'px-3 py-2.5 text-xs font-normal text-ink-soft';

// A click anywhere in a row opens the task in the card beside the table; the
// title is a button, so the keyboard and screen readers can do the same.
const TasksTable = ({
   tasks,
   employees,
   selectedId,
   onSelect,
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
                  <th className={`${TH} w-32 pr-5`}>{t('Статус')}</th>
               </tr>
            </thead>
            <tbody className='divide-line divide-y'>
               {tasks.map((task) => {
                  const selected = task.id === selectedId;
                  const assignee = getEmployee(employees, getAssigneeId(task));
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
                              {[listName('taskTypes', task.type), task.context]
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
                        <td className='py-3.25 pr-5 pl-3'>
                           <StatusBadge status={task.status} />
                        </td>
                     </tr>
                  );
               })}
            </tbody>
         </table>
      </div>
   );
};

export default TasksTable;

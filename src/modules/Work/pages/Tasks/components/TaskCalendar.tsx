import { statusFill } from '@modules/Work/helpers';
import { openNewTask, openTask } from '@modules/Work/hooks';
import { MonthCalendar } from '@shared/components';
import type { Task } from '@shared/types/work.types';
import { useTranslation } from 'react-i18next';
import { CALENDAR_SHOWN } from '../constants';

interface TaskCalendarProps {
   tasks: Task[];
}

/* «Календарь»: a month of the tasks by deadline, coloured by status. A task
   opens its card; a double click on a day starts a task due that day. */
const TaskCalendar = ({ tasks }: TaskCalendarProps) => {
   const { t } = useTranslation('work');

   return (
      <MonthCalendar
         hint={t('Дважды нажмите на день, чтобы создать задачу')}
         renderDay={(date) => {
            const due = tasks.filter(({ dueDate }) => dueDate === date);
            return (
               <>
                  {due.slice(0, CALENDAR_SHOWN).map((task) => {
                     const color = statusFill(task.status);
                     return (
                        <button
                           key={task.id}
                           type='button'
                           className='text-ink mt-1 block w-full truncate rounded-sm border-l-2 px-1.5 py-0.5 text-left text-[11px]'
                           data-hint={t('Открыть задачу: {{title}}', {
                              title: task.title,
                           })}
                           style={{
                              borderLeftColor: color,
                              background: `color-mix(in srgb, ${color} 22%, transparent)`,
                           }}
                           onClick={() => openTask(task.id)}
                        >
                           {task.title}
                        </button>
                     );
                  })}
                  {due.length > CALENDAR_SHOWN && (
                     <span className='mt-1 block'>
                        {t('ещё {{count}}', {
                           count: due.length - CALENDAR_SHOWN,
                        })}
                     </span>
                  )}
               </>
            );
         }}
         onDayDoubleClick={(dueDate) => openNewTask({ dueDate })}
      />
   );
};

export default TaskCalendar;

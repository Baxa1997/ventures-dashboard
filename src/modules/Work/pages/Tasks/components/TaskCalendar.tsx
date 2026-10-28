import { capitalize, statusTone, todayISO } from '@modules/Work/helpers';
import { openNewTask, openTask } from '@modules/Work/hooks';
import { Button, TONE_COLORS } from '@shared/components';
import type { Task } from '@shared/types/work.types';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CALENDAR_SHOWN } from '../constants';
import { monthCells, monthOf, shiftMonth } from '../helpers';

interface TaskCalendarProps {
   tasks: Task[];
}

const ARROW =
   'text-ink-soft hover:bg-hover hover:text-ink grid size-8 place-items-center rounded-lg';

// Пн … Вс in the interface language
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

/* «Календарь»: a month of the tasks by deadline, coloured by status. A task
   opens its card; a double click on a day starts a task due that day. */
const TaskCalendar = ({ tasks }: TaskCalendarProps) => {
   const { t } = useTranslation('work');
   const today = todayISO();
   const [month, setMonth] = useState(() => monthOf(today));

   return (
      <section className='border-line shadow-card rounded-xl border bg-white'>
         <header className='flex flex-wrap items-center gap-2.5 px-4 py-3'>
            <button
               type='button'
               aria-label={t('Предыдущий месяц')}
               className={ARROW}
               onClick={() => setMonth(shiftMonth(month, -1))}
            >
               <ChevronLeft aria-hidden className='size-4' />
            </button>
            <h2 className='min-w-40 text-base font-bold'>
               {capitalize(dayjs(month).format('MMMM YYYY'))}
            </h2>
            <button
               type='button'
               aria-label={t('Следующий месяц')}
               className={ARROW}
               onClick={() => setMonth(shiftMonth(month, 1))}
            >
               <ChevronRight aria-hidden className='size-4' />
            </button>
            <Button
               size='sm'
               variant='ghost'
               onClick={() => setMonth(monthOf(today))}
            >
               {t('Сегодня')}
            </Button>
            <span className='text-ink-faint ml-auto text-xs'>
               {t('Дважды нажмите на день, чтобы создать задачу')}
            </span>
         </header>
         <div className='overflow-x-auto'>
            <div className='border-line grid min-w-180 grid-cols-7 border-t'>
               {WEEKDAYS.map((day) => (
                  <div
                     key={day}
                     className='border-line text-ink-faint border-b px-2 py-2 text-[11px]'
                  >
                     {capitalize(dayjs().day(day).format('dd'))}
                  </div>
               ))}
               {monthCells(month).map((date, index) => {
                  const due = date
                     ? tasks.filter(({ dueDate }) => dueDate === date)
                     : [];
                  return (
                     <div
                        key={date ?? `lead-${index}`}
                        className={clsx(
                           'border-line text-ink-faint min-h-24 min-w-0 overflow-hidden border-r border-b p-1.5 text-xs [&:nth-child(7n)]:border-r-0',
                           !date && 'bg-ground',
                           date === today && 'bg-accent-tint',
                        )}
                        onDoubleClick={() =>
                           date && openNewTask({ dueDate: date })
                        }
                     >
                        {date && (
                           <b className='text-ink'>{dayjs(date).date()}</b>
                        )}
                        {due.slice(0, CALENDAR_SHOWN).map((task) => {
                           const color = TONE_COLORS[statusTone(task.status)];
                           return (
                              <button
                                 key={task.id}
                                 type='button'
                                 className='text-ink mt-1 block w-full truncate rounded-sm border-l-2 px-1.5 py-0.5 text-left text-[11px]'
                                 style={{
                                    borderLeftColor: color,
                                    background: `color-mix(in srgb, ${color} 22%, transparent)`,
                                 }}
                                 title={task.title}
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
                     </div>
                  );
               })}
            </div>
         </div>
      </section>
   );
};

export default TaskCalendar;

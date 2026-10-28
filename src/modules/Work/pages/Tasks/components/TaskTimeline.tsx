import {
   isDone,
   isOverdue,
   statusName,
   statusTone,
   taskKey,
   todayISO,
} from '@modules/Work/helpers';
import { openTask } from '@modules/Work/hooks';
import { Button, Segmented, TONE_COLORS } from '@shared/components';
import { formatNumericDate } from '@shared/helpers';
import type { Task } from '@shared/types/work.types';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
   TIMELINE_SCALE_LABELS,
   TIMELINE_SCALES,
   type TimelineScale,
} from '../constants';
import { shiftTimeline, timelineGrid, timelineStart } from '../helpers';

interface TaskTimelineProps {
   tasks: Task[];
}

const ARROW =
   'text-ink-soft hover:bg-hover hover:text-ink grid size-8 place-items-center rounded-lg';

const ROW = 'border-line grid grid-cols-[17.5rem_minmax(0,1fr)] border-b';

// A share of the window as a CSS length: 3 days of 28 → 10.714%.
const share = (days: number, total: number) =>
   `${((Math.max(0, Math.min(total, days)) / total) * 100).toFixed(3)}%`;

/* «Таймлайн»: each task as a bar from the day it was made to its deadline,
   in red once it is late, over four weeks of days, sixteen weeks or a year
   of months. A task without a deadline has no bar. */
const TaskTimeline = ({ tasks }: TaskTimelineProps) => {
   const { t } = useTranslation('work');
   const today = todayISO();
   const [scale, setScale] = useState<TimelineScale>('day');
   const [from, setFrom] = useState(() => timelineStart('day', today));
   const grid = timelineGrid(scale, from, today);
   const now = grid.index(today);

   // the column lines, at the start of each column after the first
   let passed = 0;
   const lines = grid.columns.slice(0, -1).map(({ days }) => {
      passed += days;
      return share(passed, grid.total);
   });

   const rows = tasks.flatMap((task) => {
      if (!task.dueDate) return [];
      const start =
         task.createdAt && task.createdAt < task.dueDate
            ? task.createdAt
            : task.dueDate;
      const first = Math.max(0, grid.index(start));
      const last = Math.min(grid.total - 1, grid.index(task.dueDate));
      if (grid.index(task.dueDate) < 0 || grid.index(start) >= grid.total)
         return [];
      return [{ task, start, first, last: Math.max(first, last) }];
   });

   const changeScale = (next: TimelineScale) => {
      setScale(next);
      setFrom(timelineStart(next, today));
   };

   return (
      <section className='border-line shadow-card rounded-xl border bg-white'>
         <header className='flex flex-wrap items-center gap-2.5 px-4 py-3'>
            <button
               type='button'
               aria-label={t('Раньше')}
               className={ARROW}
               onClick={() => setFrom(shiftTimeline(scale, from, -1))}
            >
               <ChevronLeft aria-hidden className='size-4' />
            </button>
            <h2 className='text-base font-bold tabular-nums'>
               {formatNumericDate(grid.from)} – {formatNumericDate(grid.end)}
            </h2>
            <button
               type='button'
               aria-label={t('Позже')}
               className={ARROW}
               onClick={() => setFrom(shiftTimeline(scale, from, 1))}
            >
               <ChevronRight aria-hidden className='size-4' />
            </button>
            <Button
               size='sm'
               variant='ghost'
               onClick={() => setFrom(timelineStart(scale, today))}
            >
               {t('Сегодня')}
            </Button>
            <span className='text-ink-faint ml-auto text-xs'>
               {t('Полоса: от даты создания до дедлайна')}
            </span>
            <Segmented
               items={TIMELINE_SCALES.map((id) => ({
                  id,
                  label: t(TIMELINE_SCALE_LABELS[id]),
               }))}
               label={t('Масштаб')}
               value={scale}
               onChange={changeScale}
            />
         </header>
         <div className='overflow-x-auto'>
            <div className='min-w-245'>
               <div className={clsx(ROW, 'border-t')}>
                  <div className='text-ink-faint px-3.5 py-2 text-xs'>
                     {t('Задача')}
                  </div>
                  <div
                     className='text-ink-faint grid text-center text-[11px]'
                     style={{
                        gridTemplateColumns: grid.columns
                           .map(({ days }) => `${days}fr`)
                           .join(' '),
                     }}
                  >
                     {grid.columns.map((column) => (
                        <span
                           key={column.from}
                           className={clsx(
                              'truncate py-2',
                              column.weekend && 'bg-ground',
                              column.today &&
                                 'bg-accent rounded font-bold text-white',
                           )}
                        >
                           {column.strong && <b>{column.strong} </b>}
                           {column.label}
                        </span>
                     ))}
                  </div>
               </div>
               {rows.length ? (
                  rows.map(({ task, start, first, last }) => {
                     const color = isOverdue(task)
                        ? TONE_COLORS.danger
                        : TONE_COLORS[statusTone(task.status)];
                     return (
                        <div key={task.id} className={clsx(ROW, 'items-center')}>
                           <div
                              className={clsx(
                                 'text-meta truncate px-3.5 py-2.25 font-medium',
                                 isDone(task) && 'text-ink-faint line-through',
                              )}
                              title={task.title}
                           >
                              <span className='text-ink-faint text-xs tabular-nums'>
                                 {taskKey(task)}
                              </span>{' '}
                              {task.title}
                           </div>
                           <div className='relative h-9'>
                              {lines.map((left) => (
                                 <i
                                    key={left}
                                    aria-hidden
                                    className='bg-line absolute inset-y-0 w-px'
                                    style={{ left }}
                                 />
                              ))}
                              {now >= 0 && now < grid.total && (
                                 <i
                                    aria-hidden
                                    className='bg-accent absolute inset-y-0 w-0.5 opacity-50'
                                    style={{
                                       left: share(now + 0.5, grid.total),
                                    }}
                                 />
                              )}
                              <button
                                 type='button'
                                 aria-label={task.title}
                                 className='absolute top-2.25 h-4.5 rounded-full opacity-85 hover:opacity-100'
                                 style={{
                                    background: color,
                                    left: `calc(${share(first, grid.total)} + 2px)`,
                                    width: `max(6px, calc(${share(last - first + 1, grid.total)} - 4px))`,
                                 }}
                                 title={`${task.title} · ${formatNumericDate(start)} – ${formatNumericDate(task.dueDate)} · ${statusName(t, task.status)}`}
                                 onClick={() => openTask(task.id)}
                              />
                           </div>
                        </div>
                     );
                  })
               ) : (
                  <div className={ROW}>
                     <div className='text-ink-faint px-3.5 py-2.25'>
                        {t('Нет задач в этом периоде')}
                     </div>
                  </div>
               )}
            </div>
         </div>
      </section>
   );
};

export default TaskTimeline;

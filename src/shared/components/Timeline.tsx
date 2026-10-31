import {
   formatNumericDate,
   shiftTimeline,
   type TimelineGrid,
   type TimelineScale,
   timelineGrid,
   timelineShare,
   timelineStart,
   todayISO,
} from '@shared/helpers';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import Segmented from './Segmented';

export interface TimelineRow {
   id: string;
   name: ReactNode; // the first column
   bars: ReactNode; // placed in the row's track with timelineShare
}

interface TimelineProps {
   scales: TimelineScale[]; // the first one opens
   weeksBack?: number; // how far back a scale of days or weeks opens
   hint: string; // what a bar is, beside the scale
   nameLabel: string; // the first column's heading
   empty: string; // a window with no rows
   rows: (grid: TimelineGrid) => TimelineRow[];
   legend?: ReactNode; // under the rows
}

const ARROW =
   'text-ink-soft hover:bg-hover hover:text-ink grid size-8 place-items-center rounded-lg';

const ROW = 'border-line grid grid-cols-[17.5rem_minmax(0,1fr)] border-b';

const SCALE_LABELS = {
   day: 'День',
   week: 'Неделя',
   month: 'Месяц',
} as const satisfies Record<TimelineScale, string>;

/* A time axis of days, weeks or months with a row per item: «‹ ›» move it,
   «Сегодня» brings it back, and a line marks today. Each page draws its own
   bars in the rows' tracks. */
const Timeline = ({
   scales,
   weeksBack = 1,
   hint,
   nameLabel,
   empty,
   rows,
   legend,
}: TimelineProps) => {
   const { t } = useTranslation('components');
   const today = todayISO();
   const [scale, setScale] = useState(scales[0]);
   const [from, setFrom] = useState(() =>
      timelineStart(scales[0], today, weeksBack),
   );
   const grid = timelineGrid(scale, from, today);
   const now = grid.index(today);
   const shown = rows(grid);

   // the column lines, at the start of each column after the first
   let passed = 0;
   const lines = grid.columns.slice(0, -1).map(({ days }) => {
      passed += days;
      return timelineShare(passed, grid.total);
   });

   return (
      <section className='border-line shadow-card rounded-xl border bg-white'>
         <header className='flex flex-wrap items-center gap-2.5 px-4 py-3'>
            <button
               type='button'
               aria-label={t('Раньше')}
               className={ARROW}
               data-hint={t('Показать более ранний период')}
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
               data-hint={t('Показать более поздний период')}
               onClick={() => setFrom(shiftTimeline(scale, from, 1))}
            >
               <ChevronRight aria-hidden className='size-4' />
            </button>
            <Button
               hint={t('Вернуться к сегодняшнему дню')}
               size='sm'
               variant='ghost'
               onClick={() => setFrom(timelineStart(scale, today, weeksBack))}
            >
               {t('Сегодня')}
            </Button>
            <span className='text-ink-faint ml-auto text-xs'>{hint}</span>
            {scales.length > 1 && (
               <Segmented
                  items={scales.map((id) => ({
                     id,
                     label: t(SCALE_LABELS[id]),
                  }))}
                  label={t('Масштаб')}
                  value={scale}
                  onChange={(next) => {
                     setScale(next);
                     setFrom(timelineStart(next, today, weeksBack));
                  }}
               />
            )}
         </header>
         <div className='overflow-x-auto'>
            <div className='min-w-245'>
               <div className={clsx(ROW, 'border-t')}>
                  <div className='text-ink-faint px-3.5 py-2 text-xs'>
                     {nameLabel}
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
               {shown.length ? (
                  shown.map((row) => (
                     <div key={row.id} className={clsx(ROW, 'items-center')}>
                        <div className='min-w-0 px-3.5 py-2'>{row.name}</div>
                        <div className='relative min-h-9 self-stretch'>
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
                                    left: timelineShare(now + 0.5, grid.total),
                                 }}
                              />
                           )}
                           {row.bars}
                        </div>
                     </div>
                  ))
               ) : (
                  <div className={ROW}>
                     <div className='text-ink-faint px-3.5 py-2.25'>
                        {empty}
                     </div>
                  </div>
               )}
            </div>
         </div>
         {legend && (
            <div className='border-line text-ink-soft flex flex-wrap gap-x-4 gap-y-1.5 border-t px-4.5 py-2.5 text-xs'>
               {legend}
            </div>
         )}
      </section>
   );
};

export default Timeline;

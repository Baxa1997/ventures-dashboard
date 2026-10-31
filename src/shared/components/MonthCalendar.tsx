import {
   capitalize,
   monthCells,
   monthOf,
   shiftMonth,
   todayISO,
} from '@shared/helpers';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button';

interface MonthCalendarProps {
   renderDay: (date: string) => ReactNode; // what a day holds under its number
   start?: string; // a day of the month shown first; today's month if not given
   hint?: ReactNode; // a note on the right of the month's name
   onDayDoubleClick?: (date: string) => void;
}

const ARROW =
   'text-ink-soft hover:bg-hover hover:text-ink grid size-8 place-items-center rounded-lg';

// Пн … Вс in the interface language
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

/* A month as a calendar card, Monday first: arrows and «Сегодня» move it,
   today is tinted, and each day shows what renderDay gives it. */
const MonthCalendar = ({
   renderDay,
   start,
   hint,
   onDayDoubleClick,
}: MonthCalendarProps) => {
   const { t } = useTranslation('components');
   const today = todayISO();
   const [month, setMonth] = useState(() => monthOf(start || today));

   return (
      <section className='border-line shadow-card rounded-xl border bg-white'>
         <header className='flex flex-wrap items-center gap-2.5 px-4 py-3'>
            <button
               type='button'
               aria-label={t('Предыдущий месяц')}
               className={ARROW}
               data-hint={t('Показать предыдущий месяц')}
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
               data-hint={t('Показать следующий месяц')}
               onClick={() => setMonth(shiftMonth(month, 1))}
            >
               <ChevronRight aria-hidden className='size-4' />
            </button>
            <Button
               hint={t('Вернуться к текущему месяцу')}
               size='sm'
               variant='ghost'
               onClick={() => setMonth(monthOf(today))}
            >
               {t('Сегодня')}
            </Button>
            {hint && (
               <span className='text-ink-faint ml-auto text-xs'>{hint}</span>
            )}
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
               {monthCells(month).map((date, index) => (
                  <div
                     key={date ?? `lead-${index}`}
                     className={clsx(
                        'border-line text-ink-faint min-h-24 min-w-0 overflow-hidden border-r border-b p-1.5 text-xs [&:nth-child(7n)]:border-r-0',
                        !date && 'bg-ground',
                        date === today && 'bg-accent-tint',
                     )}
                     onDoubleClick={
                        date && onDayDoubleClick
                           ? () => onDayDoubleClick(date)
                           : undefined
                     }
                  >
                     {date && (
                        <>
                           <b className='text-ink'>{dayjs(date).date()}</b>
                           {renderDay(date)}
                        </>
                     )}
                  </div>
               ))}
            </div>
         </div>
      </section>
   );
};

export default MonthCalendar;

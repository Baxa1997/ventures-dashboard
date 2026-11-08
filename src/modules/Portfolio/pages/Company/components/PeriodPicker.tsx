import { buttonClass } from '@shared/components';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type PickerKind = 'month' | 'quarter';

interface GridProps {
   kind: PickerKind;
   value: string; // 2026-09 or 2026-Q3
   min: string; // the earliest that can be picked
   max: string; // the latest
   marked?: (at: string) => boolean; // a dot: the period has figures
   onChange: (at: string) => void;
}

const yearOf = (at: string) => Number(at.slice(0, 4));
const periodOf = (kind: PickerKind, year: number, index: number) =>
   kind === 'month'
      ? `${year}-${String(index + 1).padStart(2, '0')}`
      : `${year}-Q${index + 1}`;

/* A month or a quarter picked as on a calendar: a year with arrows, and its
   twelve months or four quarters. Short, where a list of five years of
   months would fill the screen. */
export const PeriodGrid = ({
   kind,
   value,
   min,
   max,
   marked,
   onChange,
}: GridProps) => {
   const { t } = useTranslation('portfolio');
   const [year, setYear] = useState(yearOf(value));
   const first = yearOf(min);
   const last = yearOf(max);
   const cells = kind === 'month' ? 12 : 4;

   return (
      <div className='grid gap-2'>
         <div className='flex items-center justify-between'>
            <button
               type='button'
               aria-label={t('Предыдущий год')}
               className='text-ink-soft hover:bg-ground grid size-8 place-items-center rounded-md disabled:opacity-30'
               data-hint={t('Предыдущий год')}
               disabled={year <= first}
               onClick={() => setYear(year - 1)}
            >
               <ChevronLeft aria-hidden className='size-4' />
            </button>
            <span className='text-ink-strong font-semibold tabular-nums'>
               {year}
            </span>
            <button
               type='button'
               aria-label={t('Следующий год')}
               className='text-ink-soft hover:bg-ground grid size-8 place-items-center rounded-md disabled:opacity-30'
               data-hint={t('Следующий год')}
               disabled={year >= last}
               onClick={() => setYear(year + 1)}
            >
               <ChevronRight aria-hidden className='size-4' />
            </button>
         </div>
         <div className='grid grid-cols-4 gap-1'>
            {Array.from({ length: cells }, (_, index) => {
               const at = periodOf(kind, year, index);
               const on = at === value;
               const off = at < min || at > max;
               const label =
                  kind === 'month'
                     ? dayjs(`${at}-01`).format('MMM')
                     : `Q${index + 1}`;
               return (
                  <button
                     key={at}
                     type='button'
                     aria-pressed={on}
                     className={clsx(
                        'text-meta relative h-9 rounded-md font-medium capitalize transition-colors',
                        on
                           ? 'bg-accent text-white'
                           : off
                             ? 'text-ink-faint cursor-not-allowed opacity-40'
                             : 'text-ink hover:bg-accent-tint',
                     )}
                     data-hint={
                        kind === 'month'
                           ? dayjs(`${at}-01`).format('MMMM YYYY')
                           : t('{{quarter}} квартал {{year}}', {
                                quarter: ['I', 'II', 'III', 'IV'][index],
                                year,
                             })
                     }
                     disabled={off}
                     onClick={() => onChange(at)}
                  >
                     {label}
                     {marked?.(at) && (
                        <span
                           aria-hidden
                           className={clsx(
                              'absolute top-1 right-1.5 size-1.5 rounded-full',
                              on ? 'bg-white' : 'bg-success',
                           )}
                        />
                     )}
                  </button>
               );
            })}
         </div>
      </div>
   );
};

interface SelectProps extends GridProps {
   label: string; // for screen readers and the hint
   text: string; // the value as written on the button
}

// The same, opened from a button: for the toolbar's «с … по …».
export const PeriodSelect = ({
   label,
   text,
   onChange,
   ...grid
}: SelectProps) => {
   const [open, setOpen] = useState(false);
   const box = useRef<HTMLDivElement>(null);

   useEffect(() => {
      if (!open) return;
      const away = (event: MouseEvent) => {
         if (!box.current?.contains(event.target as Node)) setOpen(false);
      };
      const escape = (event: KeyboardEvent) => {
         if (event.key === 'Escape') setOpen(false);
      };
      document.addEventListener('mousedown', away);
      document.addEventListener('keydown', escape);
      return () => {
         document.removeEventListener('mousedown', away);
         document.removeEventListener('keydown', escape);
      };
   }, [open]);

   return (
      <div ref={box} className='relative'>
         <button
            type='button'
            aria-expanded={open}
            aria-label={label}
            className={clsx(buttonClass('ghost'), 'h-9 font-medium')}
            data-hint={label}
            onClick={() => setOpen(!open)}
         >
            {text}
            <ChevronDown aria-hidden />
         </button>
         {open && (
            <div className='border-line shadow-raised absolute top-full left-0 z-30 mt-1 w-72 rounded-xl border bg-white p-3'>
               <PeriodGrid
                  {...grid}
                  onChange={(at) => {
                     onChange(at);
                     setOpen(false);
                  }}
               />
            </div>
         )}
      </div>
   );
};

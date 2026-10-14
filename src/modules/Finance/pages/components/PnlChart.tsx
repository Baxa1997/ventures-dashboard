import { formatMillions } from '@modules/Finance/helpers';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PnlChartProps {
   months: { month: string; income: number; expense: number }[];
   unit: string; // what the figures are in, for the tooltip
   format: (value: number) => number; // млн сум → the chosen currency
}

const STEP = 100;

/* Income and expenses month by month as pairs of thin bars on one axis.
   Hovering a month shows both figures; the table under the chart holds the
   same figures for reading. The highest bar carries its value. */
const PnlChart = ({ months, unit, format }: PnlChartProps) => {
   const { t, i18n } = useTranslation('finance');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const [hover, setHover] = useState<number | null>(null);
   const values = months.map(({ income, expense }) => ({
      income: format(income),
      expense: format(expense),
   }));
   const peak = Math.max(
      ...values.flatMap(({ income, expense }) => [income, expense]),
      1,
   );
   const step =
      peak > 400
         ? Math.ceil(peak / 4 / STEP) * STEP
         : peak > 40
           ? STEP
           : peak > 4
             ? 10
             : 1;
   const top = Math.ceil((peak * 1.08) / step) * step;
   const ticks = Array.from(
      { length: Math.floor(top / step) + 1 },
      (_, index) => index * step,
   );
   const peakIndex = values.findIndex(({ expense }) => expense === peak);

   return (
      <div>
         <div className='flex flex-wrap items-center justify-between gap-3'>
            <ul className='text-meta flex gap-5'>
               <li className='flex items-center gap-2'>
                  <span
                     aria-hidden
                     className='bg-accent size-2.5 rounded-[3px]'
                  />
                  {t('Доходы')}
               </li>
               <li className='flex items-center gap-2'>
                  <span
                     aria-hidden
                     className='bg-accent-soft size-2.5 rounded-[3px]'
                  />
                  {t('Расходы')}
               </li>
            </ul>
            <p className='text-ink-soft text-xs'>
               {t('Пики расходов — хакатоны в апреле и мае')}
            </p>
         </div>
         <div
            role='img'
            aria-label={t('Доходы и расходы по месяцам')}
            className='relative mt-4 h-52 pl-9'
         >
            {ticks.map((tick) => (
               <div
                  key={tick}
                  aria-hidden
                  className='border-line text-ink-soft absolute right-0 left-9 border-t'
                  style={{ bottom: `${(tick / top) * 100}%` }}
               >
                  <span className='absolute -top-2 -left-9 w-7 text-right text-[11px] tabular-nums'>
                     {formatMillions(tick, language)}
                  </span>
               </div>
            ))}
            <div className='relative flex h-full items-end'>
               {months.map(({ month }, index) => (
                  <div
                     key={month}
                     className='relative flex h-full flex-1 items-end justify-center gap-1'
                     onMouseEnter={() => setHover(index)}
                     onMouseLeave={() => setHover(null)}
                  >
                     {hover === index && (
                        <div
                           className='bg-ground absolute inset-y-0 inset-x-1 rounded-md'
                           aria-hidden
                        />
                     )}
                     <span
                        className='bg-accent animate-grow relative w-[22%] max-w-4 origin-bottom rounded-t'
                        style={{
                           height: `${(values[index].income / top) * 100}%`,
                           animationDelay: `${index * 45}ms`,
                        }}
                     />
                     <span
                        className='bg-accent-soft animate-grow relative w-[22%] max-w-4 origin-bottom rounded-t'
                        style={{
                           height: `${(values[index].expense / top) * 100}%`,
                           animationDelay: `${index * 45 + 25}ms`,
                        }}
                     />
                     {index === peakIndex && (
                        // outside the bar, so it does not stretch while the bar grows
                        <span
                           className='text-ink-soft animate-fade absolute left-1/2 mb-1 text-[11px] tabular-nums'
                           style={{
                              bottom: `${(values[index].expense / top) * 100}%`,
                              translate: 'calc(-50% + 0.625rem) 0',
                              animationDelay: '600ms',
                           }}
                        >
                           {formatMillions(values[index].expense, language)}
                        </span>
                     )}
                     {hover === index && (
                        <div
                           className={clsx(
                              'shadow-popup border-line text-meta absolute bottom-full z-10 mb-1 rounded-md border bg-white px-3 py-2 whitespace-nowrap',
                              index > months.length / 2 ? 'right-0' : 'left-0',
                           )}
                        >
                           <div className='font-semibold capitalize'>
                              {dayjs(`${month}-01`).format('MMMM')}
                           </div>
                           <div>
                              {t('Доходы')}:{' '}
                              {formatMillions(values[index].income, language)}{' '}
                              {unit}
                           </div>
                           <div>
                              {t('Расходы')}:{' '}
                              {formatMillions(values[index].expense, language)}{' '}
                              {unit}
                           </div>
                        </div>
                     )}
                  </div>
               ))}
            </div>
         </div>
         <div
            aria-hidden
            className='text-ink-soft mt-1.5 flex pl-9 text-[11px]'
         >
            {months.map(({ month }) => (
               <span key={month} className='flex-1 text-center'>
                  {dayjs(`${month}-01`).format('MMM')}
               </span>
            ))}
         </div>
      </div>
   );
};

export default PnlChart;

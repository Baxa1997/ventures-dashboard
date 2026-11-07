import { ChartTooltip, useChartHover } from '@shared/components';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

export interface ChartSeries {
   label: string;
   color: string; // a CSS colour, e.g. var(--color-sky)
   values: number[]; // one a column
   // each value's own colour, e.g. red where a flow is negative
   colorOf?: (value: number) => string;
}

interface FlowChartProps {
   labels: string[]; // the columns: months or quarters
   bars: ChartSeries[];
   line?: ChartSeries; // drawn over the bars, a dot a column
   format: (value: number) => string; // the axis and the note: $150K
   label: string; // what the chart shows, for screen readers
}

// Round steps for an axis from `min` (zero or less) to `max`.
const ticksOf = (min: number, max: number) => {
   const low = Math.min(0, min);
   const high = Math.max(0, max, low === 0 ? 1 : 0);
   const rough = (high - low) / 4 || 1;
   const power = 10 ** Math.floor(Math.log10(rough));
   const step =
      [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough) ??
      10 * power;
   const ticks: number[] = [];
   for (
      let at = Math.floor(low / step) * step;
      at <= high + step / 2;
      at += step
   )
      ticks.push(Math.round(at * 100) / 100);
   if (ticks[ticks.length - 1] < high)
      ticks.push(ticks[ticks.length - 1] + step);
   return ticks;
};

/* Columns of bars from a zero line, months or quarters, with a line over
   them: P&L's income, expenses and profit, Cash Flow's net flow and the
   balance. Pointing at a column (or reaching it with the keyboard) shows its
   figures in a note; the figures are in the chart's text for screen readers
   too. */
const FlowChart = ({ labels, bars, line, format, label }: FlowChartProps) => {
   const { t } = useTranslation('finance');
   const { box, hover, track, focus, leave } = useChartHover<number>();
   const all = [...bars, ...(line ? [line] : [])].flatMap(
      ({ values }) => values,
   );
   const ticks = ticksOf(Math.min(0, ...all), Math.max(0, ...all));
   const top = ticks[ticks.length - 1];
   const bottom = ticks[0];
   const y = (value: number) => ((top - value) / (top - bottom || 1)) * 100;
   const columns = labels.length;
   const seriesOf = [...bars, ...(line ? [line] : [])];

   if (!columns)
      return (
         <p className='text-ink-soft px-4.5 py-10 text-center text-sm'>
            {t('В этом году ещё нет месяцев')}
         </p>
      );

   return (
      <div
         ref={box}
         className='relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 px-4 pt-4 pb-3'
         onPointerLeave={leave}
      >
         <p className='sr-only'>
            {label}:{' '}
            {labels
               .map(
                  (column, index) =>
                     `${column} — ${seriesOf
                        .map(
                           (series) =>
                              `${series.label} ${format(series.values[index] ?? 0)}`,
                        )
                        .join(', ')}`,
               )
               .join('; ')}
         </p>
         {/* the axis */}
         <div aria-hidden className='relative h-56 w-14'>
            {ticks.map((tick) => (
               <span
                  key={tick}
                  className='text-ink-faint absolute right-0 -translate-y-1/2 text-[10px] tabular-nums'
                  style={{ top: `${y(tick)}%` }}
               >
                  {format(tick)}
               </span>
            ))}
         </div>
         <div aria-hidden className='relative h-56'>
            {ticks.map((tick) => (
               <span
                  key={tick}
                  className={clsx(
                     'absolute inset-x-0 h-px',
                     tick === 0 ? 'bg-line-strong' : 'bg-line',
                  )}
                  style={{ top: `${y(tick)}%` }}
               />
            ))}
            <div className='absolute inset-0 flex'>
               {labels.map((column, index) => {
                  const dim = hover !== null && hover.item !== index;
                  return (
                     <div
                        key={column}
                        className='relative flex-1 outline-none'
                        tabIndex={0}
                        onBlur={leave}
                        onFocus={focus(index)}
                        onPointerMove={track(index)}
                     >
                        <div className='absolute inset-y-0 left-1/2 flex w-[min(70%,3.25rem)] -translate-x-1/2 gap-0.5'>
                           {bars.map((series) => {
                              const value = series.values[index] ?? 0;
                              return (
                                 <div
                                    key={series.label}
                                    className='relative flex-1'
                                 >
                                    <span
                                       className={clsx(
                                          'absolute inset-x-0 rounded-[3px] transition-opacity',
                                          dim && 'opacity-45',
                                       )}
                                       style={{
                                          top: `${y(Math.max(value, 0))}%`,
                                          height: `${Math.abs(y(value) - y(0))}%`,
                                          background:
                                             series.colorOf?.(value) ??
                                             series.color,
                                       }}
                                    />
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  );
               })}
            </div>
            {line && (
               <svg
                  className='pointer-events-none absolute inset-0 size-full overflow-visible'
                  preserveAspectRatio='none'
                  viewBox='0 0 100 100'
               >
                  <polyline
                     fill='none'
                     points={line.values
                        .map(
                           (value, index) =>
                              `${((index + 0.5) / columns) * 100},${y(value)}`,
                        )
                        .join(' ')}
                     stroke={line.color}
                     strokeLinejoin='round'
                     strokeWidth='2'
                     vectorEffect='non-scaling-stroke'
                  />
               </svg>
            )}
            {line?.values.map((value, index) => (
               <span
                  key={index}
                  className='pointer-events-none absolute size-2 -translate-1/2 rounded-full border-2 border-white'
                  style={{
                     left: `${((index + 0.5) / columns) * 100}%`,
                     top: `${y(value)}%`,
                     background: line.color,
                  }}
               />
            ))}
         </div>
         <div />
         <div aria-hidden className='mt-1.5 flex'>
            {labels.map((column) => (
               <span
                  key={column}
                  className='text-ink-soft flex-1 text-center text-[11px]'
               >
                  {column}
               </span>
            ))}
         </div>
         <div
            aria-hidden
            className='col-span-2 mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs'
         >
            {seriesOf.map((series) => (
               <span
                  key={series.label}
                  className='text-ink-soft inline-flex items-center gap-1.5'
               >
                  <span
                     className={clsx(
                        'shrink-0',
                        series === line
                           ? 'h-0.5 w-3.5 rounded-full'
                           : 'size-2.5 rounded-sm',
                     )}
                     style={{ background: series.color }}
                  />
                  {series.label}
               </span>
            ))}
         </div>
         {hover && (
            <ChartTooltip
               rows={seriesOf.map((series) => ({
                  color:
                     series.colorOf?.(series.values[hover.item] ?? 0) ??
                     series.color,
                  label: series.label,
                  value: format(series.values[hover.item] ?? 0),
               }))}
               title={labels[hover.item]}
               width={hover.width}
               x={hover.x}
               y={hover.y}
            />
         )}
      </div>
   );
};

export default FlowChart;

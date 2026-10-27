import type { FunnelBar } from '@shared/types/work.types';
import clsx from 'clsx';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { FUNNEL_BARS } from '../constants';
import { axisTicks } from '../helpers';

interface FunnelChartProps {
   bars: FunnelBar[];
}

/* The deals by group as horizontal bars over a count axis with its
   gridlines, each group in its own colour. A bar's count is on its row's
   title and on the axis under it. */
const FunnelChart = ({ bars }: FunnelChartProps) => {
   const { t } = useTranslation('work');
   const ticks = axisTicks(Math.max(...bars.map(({ count }) => count)));
   const top = ticks[ticks.length - 1];
   const at = (value: number) => `${(value / top) * 100}%`;

   return (
      <div
         className='grid h-65 grid-cols-[auto_minmax(0,1fr)] p-3.5 pr-5'
         style={{
            gridTemplateRows: `repeat(${bars.length}, minmax(0, 1fr)) auto`,
         }}
      >
         {/* the axes and the gridlines, under the bars */}
         <div
            aria-hidden
            className='border-line relative col-start-2 border-b border-l'
            style={{ gridRow: `1 / span ${bars.length}` }}
         >
            {ticks.slice(1).map((tick) => (
               <span
                  key={tick}
                  className='bg-line absolute inset-y-0 w-px'
                  style={{ left: at(tick) }}
               />
            ))}
         </div>
         {bars.map(({ group, count }, index) => {
            const label = t(FUNNEL_BARS[group].label);
            return (
               <Fragment key={group}>
                  <span
                     className='text-ink-soft col-start-1 flex items-center justify-end pr-2.5 text-xs whitespace-nowrap'
                     style={{ gridRow: index + 1 }}
                  >
                     {label}
                  </span>
                  <span
                     className='col-start-2 flex items-center'
                     style={{ gridRow: index + 1 }}
                     title={`${label}: ${count}`}
                  >
                     <span className='sr-only'>{count}</span>
                     {count > 0 && (
                        <span
                           className={clsx(
                              'animate-fill h-[72%] max-h-7 rounded-r',
                              FUNNEL_BARS[group].fill,
                           )}
                           style={{ width: at(count) }}
                        />
                     )}
                  </span>
               </Fragment>
            );
         })}
         <div
            aria-hidden
            className='text-ink-soft relative col-start-2 h-6 text-xs tabular-nums'
         >
            {ticks.map((tick) => (
               <span
                  key={tick}
                  className='absolute top-1.5 -translate-x-1/2'
                  style={{ left: at(tick) }}
               >
                  {tick}
               </span>
            ))}
         </div>
      </div>
   );
};

export default FunnelChart;

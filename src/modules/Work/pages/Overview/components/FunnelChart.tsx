import { ChartTooltip, useChartHover } from '@shared/components';
import type { FunnelBar, FunnelGroup } from '@shared/types/work.types';
import clsx from 'clsx';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { FUNNEL_BARS } from '../constants';
import { axisTicks } from '../helpers';

interface FunnelChartProps {
   bars: FunnelBar[];
}

/* The deals by group as horizontal bars over a count axis with its
   gridlines, each group in its own colour. Pointing at a row (or reaching
   it with the keyboard) brings its bar forward and shows its count and its
   share of all the deals in a note beside the pointer. */
const FunnelChart = ({ bars }: FunnelChartProps) => {
   const { t } = useTranslation('work');
   const { box, hover, track, focus, leave } = useChartHover<FunnelGroup>();
   const ticks = axisTicks(Math.max(...bars.map(({ count }) => count)));
   const top = ticks[ticks.length - 1];
   const total = bars.reduce((sum, { count }) => sum + count, 0);
   const at = (value: number) => `${(value / top) * 100}%`;
   const shown = hover && bars.find(({ group }) => group === hover.item);

   // its count, and its part of the whole funnel
   const valueOf = (count: number) =>
      [
         t('{{count}} сделка', { count }),
         total ? `${Math.round((count / total) * 100)}%` : '',
      ]
         .filter(Boolean)
         .join(' · ');

   return (
      <div
         ref={box}
         className='relative grid h-65 grid-cols-[auto_minmax(0,1fr)] p-3.5 pr-5'
         style={{
            gridTemplateRows: `repeat(${bars.length}, minmax(0, 1fr)) auto`,
         }}
         onPointerLeave={leave}
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
            const dim = hover !== null && hover.item !== group;
            return (
               <Fragment key={group}>
                  <span
                     className={clsx(
                        'col-start-1 flex items-center justify-end pr-2.5 text-xs whitespace-nowrap',
                        hover?.item === group
                           ? 'text-ink font-semibold'
                           : 'text-ink-soft',
                     )}
                     style={{ gridRow: index + 1 }}
                  >
                     {label}
                  </span>
                  {/* the whole row answers the pointer, not just the bar */}
                  <span
                     aria-label={`${label}: ${valueOf(count)}`}
                     className='col-start-2 flex cursor-default items-center rounded-sm'
                     role='img'
                     style={{ gridRow: index + 1 }}
                     tabIndex={0}
                     onBlur={leave}
                     onFocus={focus(group)}
                     onPointerMove={track(group)}
                  >
                     {count > 0 && (
                        <span
                           className={clsx(
                              'animate-fill h-[72%] max-h-7 rounded-r transition-opacity',
                              FUNNEL_BARS[group].fill,
                              dim && 'opacity-45',
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
         {hover && shown && (
            <ChartTooltip
               rows={[
                  {
                     color: FUNNEL_BARS[shown.group].color,
                     value: valueOf(shown.count),
                  },
               ]}
               title={t(FUNNEL_BARS[shown.group].label)}
               width={hover.width}
               x={hover.x}
               y={hover.y}
            />
         )}
      </div>
   );
};

export default FunnelChart;

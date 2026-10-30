import { mrrByQuarter, quarterLabel } from '@modules/Portfolio/helpers';
import { Card, NoData } from '@shared/components';
import { axisTicks, formatMoneyShort, formatUsd } from '@shared/helpers';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface MrrChartProps {
   companies: PortfolioCompany[];
}

const HEIGHT = 220;
const PAD = { top: 12, right: 16, bottom: 26, left: 56 };
const LINE = 'var(--color-sky)';

/* «Совокупный MRR активного портфеля», as the design draws it: the MRR the
   active companies reported, added up by quarter, as an area under a line.
   Hovering a quarter shows its sum. */
const MrrChart = ({ companies }: MrrChartProps) => {
   const { t, i18n } = useTranslation('portfolio');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const box = useRef<HTMLDivElement>(null);
   const [width, setWidth] = useState(0);
   const [hover, setHover] = useState<number | null>(null);
   const points = mrrByQuarter(companies);
   const charted = points.length > 0;

   useEffect(() => {
      const element = box.current;
      if (!element) return;
      const observer = new ResizeObserver(([entry]) =>
         setWidth(entry.contentRect.width),
      );
      observer.observe(element);
      return () => observer.disconnect();
   }, [charted]);

   const ticks = axisTicks(Math.max(...points.map(({ value }) => value), 0));
   const top = ticks.at(-1) || 1;
   const plot = {
      width: Math.max(0, width - PAD.left - PAD.right),
      height: HEIGHT - PAD.top - PAD.bottom,
   };
   const step = points.length > 1 ? plot.width / (points.length - 1) : 0;
   const x = (index: number) =>
      PAD.left + (points.length > 1 ? index * step : plot.width / 2);
   const y = (value: number) => PAD.top + plot.height * (1 - value / top);
   const line = points
      .map(({ value }, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(value)}`)
      .join(' ');
   const area = `${line} L ${x(points.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
   // every quarter is named while they fit, every other one after that
   const every = points.length > 8 ? 2 : 1;
   const shown = hover === null ? null : points[hover];

   return (
      <Card
         hint={t('по отчётам компаний')}
         title={t('Совокупный MRR активного портфеля')}
      >
         {charted ? (
            <div ref={box} className='relative px-2 pt-2 pb-1'>
               {width > 0 && (
                  <svg
                     aria-label={t('MRR активных компаний по кварталам')}
                     height={HEIGHT}
                     role='img'
                     width={width}
                     onMouseLeave={() => setHover(null)}
                  >
                     {ticks.map((tick) => (
                        <g key={tick}>
                           <line
                              stroke='var(--color-line)'
                              x1={PAD.left}
                              x2={width - PAD.right}
                              y1={y(tick)}
                              y2={y(tick)}
                           />
                           <text
                              className='fill-ink-faint text-[11px] tabular-nums'
                              dominantBaseline='middle'
                              textAnchor='end'
                              x={PAD.left - 8}
                              y={y(tick)}
                           >
                              {formatMoneyShort(tick)}
                           </text>
                        </g>
                     ))}
                     {points.length > 1 && (
                        <>
                           <path
                              d={area}
                              fill={`color-mix(in srgb, ${LINE} 14%, transparent)`}
                           />
                           <path
                              d={line}
                              fill='none'
                              stroke={LINE}
                              strokeLinejoin='round'
                              strokeWidth={2}
                           />
                        </>
                     )}
                     {points.map(({ quarter, value }, index) => (
                        <g key={quarter}>
                           {index % every === 0 && (
                              <text
                                 className='fill-ink-faint text-[11px]'
                                 textAnchor='middle'
                                 x={x(index)}
                                 y={HEIGHT - 6}
                              >
                                 {quarterLabel(t, quarter)}
                              </text>
                           )}
                           {(points.length === 1 || hover === index) && (
                              <>
                                 {hover === index && (
                                    <line
                                       stroke='var(--color-line-strong)'
                                       x1={x(index)}
                                       x2={x(index)}
                                       y1={PAD.top}
                                       y2={y(0)}
                                    />
                                 )}
                                 <circle
                                    cx={x(index)}
                                    cy={y(value)}
                                    fill={LINE}
                                    r={4.5}
                                    stroke='#fff'
                                    strokeWidth={2}
                                 />
                              </>
                           )}
                           {/* the quarter's band, for hovering */}
                           <rect
                              fill='transparent'
                              height={plot.height}
                              width={Math.max(step, 24)}
                              x={x(index) - Math.max(step, 24) / 2}
                              y={PAD.top}
                              onMouseEnter={() => setHover(index)}
                           />
                        </g>
                     ))}
                  </svg>
               )}
               {shown && hover !== null && (
                  <div
                     className='border-line shadow-raised pointer-events-none absolute top-2 rounded-lg border bg-white px-2.5 py-1.5 text-xs whitespace-nowrap'
                     style={{
                        left: Math.min(x(hover) + 12, Math.max(0, width - 150)),
                     }}
                  >
                     <div className='text-ink-soft'>
                        {quarterLabel(t, shown.quarter)}
                     </div>
                     <b className='tabular-nums'>
                        {formatUsd(shown.value, language)}
                     </b>
                  </div>
               )}
            </div>
         ) : (
            <NoData>
               {t('Компании ещё не присылали MRR в квартальных отчётах.')}
            </NoData>
         )}
      </Card>
   );
};

export default MrrChart;

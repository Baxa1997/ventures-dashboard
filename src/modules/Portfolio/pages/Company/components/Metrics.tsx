import MetricsDialog from '@modules/Portfolio/components/MetricsDialog';
import {
   firstReportNote,
   formatMetric,
   metricName,
   metricUnit,
   monthLabel,
   monthsBetween,
   owesReport,
   parseMetric,
   quarterLabel,
   quarterOfDay,
   quartersBetween,
   receivedCount,
   recentMonths,
   recentQuarters,
   reportDocs,
} from '@modules/Portfolio/helpers';
import type { PortfolioData } from '@modules/Portfolio/hooks';
import portfolio from '@modules/Portfolio/services';
import {
   Badge,
   Button,
   Card,
   ChartTooltip,
   ConfirmDialog,
   InlineField,
   ItemActions,
   NoData,
   Segmented,
   Table,
   TD,
   TH,
   useChartHover,
} from '@shared/components';
import { SETTINGS_PATH } from '@shared/constants';
import {
   axisTicks,
   formatDate,
   formatDay,
   formatMoneyShort,
   formatNumber,
   todayISO,
} from '@shared/helpers';
import { readPref, writePref } from '@shared/services/prefs';
import type {
   Metric,
   MetricKey,
   PortfolioCompany,
} from '@shared/types/portfolio.types';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import PeriodDialog, { type PeriodTarget, periodLabel } from './PeriodDialog';
import { PeriodSelect } from './PeriodPicker';

interface MetricsProps {
   company: PortfolioCompany;
   cycle: PortfolioData['cycle'];
}

type Period = 'month' | 'quarter';

// The columns a view starts with, and the most it shows.
const COLUMNS: Record<Period, number> = { month: 12, quarter: 8 };
const MOST: Record<Period, number> = { month: 36, quarter: 16 };
// How far back the range can start: five years of months or quarters.
const BACK: Record<Period, number> = { month: 60, quarter: 24 };

interface Range {
   from: string; // 2025-11 or 2024-Q4
   to: string;
}

// The range a person last picked for a view, kept with them (prefs).
const rangeKey = (period: Period) => `sqbv_metrics_range_${period}`;

// A quarter is 2026-Q3, a month 2026-09.
const isQuarter = (period: string) => period.includes('-Q');

// The figures by period of the view: the quarters reported, or the months.
const valuesOf = (metric: Metric, period: Period) =>
   period === 'quarter' ? metric.values : metric.months;

/* «Показатели», as the design draws them: by month or by quarter (the
   address keeps it, ?period=month), a row for each metric with its unit and
   a column for each period, the newest on the right. The months or quarters
   shown are picked «с … по …» (kept with the person), and one more is added
   on the left with «+». Every cell is changed where it stands: a figure
   typed is saved as it is left, an emptied cell deletes it. A row pressed
   draws its metric under the table. Under it, each quarter's report: how
   many of its documents came and whether the figures the fund's template
   brought in are confirmed. */
const Metrics = ({ company, cycle }: MetricsProps) => {
   const { t, i18n } = useTranslation('portfolio');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const [params, setParams] = useSearchParams();
   const period: Period =
      params.get('period') === 'month' ? 'month' : 'quarter';

   // the months up to this one, the quarters up to this one
   const thisMonth = todayISO().slice(0, 7);
   const thisQuarter = quarterOfDay(todayISO());
   const choices =
      period === 'month'
         ? monthsBetween(
              dayjs(`${thisMonth}-01`)
                 .subtract(BACK.month - 1, 'month')
                 .format('YYYY-MM'),
              thisMonth,
           )
         : recentQuarters(thisQuarter, BACK.quarter);
   const initialOf = (kind: Period): Range => {
      const shown =
         kind === 'quarter'
            ? recentQuarters(cycle.quarter, COLUMNS.quarter)
            : recentMonths(COLUMNS.month);
      return { from: shown[0], to: shown[shown.length - 1] };
   };
   const initial = () => initialOf(period);
   const [ranges, setRanges] = useState<Partial<Record<Period, Range>>>(() => ({
      month: readPref<Range | undefined>(rangeKey('month'), undefined),
      quarter: readPref<Range | undefined>(rangeKey('quarter'), undefined),
   }));
   const range = ranges[period] ?? initial();
   const between = period === 'month' ? monthsBetween : quartersBetween;
   const periods = between(range.from, range.to);

   // a range picked: the ends in order, at most MOST columns, kept for next time
   const pick = (next: Range | null) => {
      if (!next) {
         setRanges((prev) => ({ ...prev, [period]: undefined }));
         writePref(rangeKey(period), null);
         return;
      }
      let { from, to } =
         next.from <= next.to ? next : { from: next.to, to: next.from };
      const all = between(from, to);
      if (all.length > MOST[period]) from = all[all.length - MOST[period]];
      setRanges((prev) => ({ ...prev, [period]: { from, to } }));
      writePref(rangeKey(period), { from, to });
   };
   const custom = !!ranges[period];

   // a period saved outside the range shown: the range widens to it
   const include = (kind: Period, at: string) => {
      const current = ranges[kind] ?? initialOf(kind);
      if (at >= current.from && at <= current.to) return;
      const all = (kind === 'month' ? monthsBetween : quartersBetween)(
         at < current.from ? at : current.from,
         at > current.to ? at : current.to,
      );
      const next =
         all.length <= MOST[kind]
            ? { from: all[0], to: all[all.length - 1] }
            : at < current.from
              ? { from: all[0], to: all[MOST[kind] - 1] }
              : { from: all[all.length - MOST[kind]], to: all[all.length - 1] };
      setRanges((prev) => ({ ...prev, [kind]: next }));
      writePref(rangeKey(kind), next);
   };

   // «Добавить показатели», or a period's figures changed or deleted
   const [target, setTarget] = useState<PeriodTarget | null>(null);
   const [removing, setRemoving] = useState<PeriodTarget | null>(null);

   const label = (at: string) =>
      isQuarter(at) ? quarterLabel(t, at) : monthLabel(at, true);
   const [chosen, setChosen] = useState(company.metrics[0]?.key ?? '');
   const metric = company.metrics.find(({ key }) => key === chosen);
   // the quarter whose figures from the template are being checked
   const [checking, setChecking] = useState<string | null>(null);

   const latest = [...periods]
      .reverse()
      .find((at) =>
         company.metrics.some((row) => valuesOf(row, period)[at] != null),
      );
   const note =
      period === 'quarter'
         ? latest
            ? t(
                 'Последний отчёт: {{period}}. Квартальные показатели компания присылает из кабинета основателя.',
                 { period: quarterLabel(t, latest, true) },
              )
            : t(
                 'Отчётов с цифрами ещё нет. Квартальные показатели компания присылает из кабинета основателя.',
              )
         : latest
           ? t(
                'Последние цифры: {{period}}. Помесячные показатели вносит фонд.',
                { period: monthLabel(latest, true) },
             )
           : t(
                'Помесячных цифр пока нет: их вносит фонд — кнопкой «Добавить показатели».',
             );

   const show = (next: Period) =>
      setParams(
         (prev) => {
            const query = new URLSearchParams(prev);
            if (next === 'month') query.set('period', 'month');
            else query.delete('period');
            return query;
         },
         { replace: true },
      );

   // an end of the range, picked on a small calendar of months or quarters
   const bound = (end: 'from' | 'to') => (
      <PeriodSelect
         kind={period}
         label={
            end === 'from'
               ? t('С какого месяца или квартала показывать')
               : t('По какой месяц или квартал показывать')
         }
         marked={(at) =>
            company.metrics.some((row) => valuesOf(row, period)[at] != null)
         }
         max={choices[choices.length - 1]}
         min={range[end] < choices[0] ? range[end] : choices[0]}
         text={label(range[end])}
         value={range[end]}
         onChange={(at) => pick({ ...range, [end]: at })}
      />
   );

   return (
      <div className='gap-section flex flex-1 flex-col'>
         <div className='flex flex-wrap items-center gap-x-3.5 gap-y-2'>
            <Segmented
               items={[
                  { id: 'month', label: t('Месяц') },
                  { id: 'quarter', label: t('Квартал') },
               ]}
               label={t('Период')}
               value={period}
               onChange={show}
            />
            <span className='text-meta flex flex-wrap items-center gap-2'>
               <span className='text-ink-soft'>{t('с')}</span>
               {bound('from')}
               <span className='text-ink-soft'>{t('по')}</span>
               {bound('to')}
               {custom && (
                  <button
                     type='button'
                     className='link'
                     data-hint={t(
                        'Вернуть последние 12 месяцев или 8 кварталов',
                     )}
                     onClick={() => pick(null)}
                  >
                     {t('Сбросить')}
                  </button>
               )}
            </span>
            <Button
               className='ml-auto'
               disabled={!company.metrics.length}
               hint={t('Внести цифры компании за месяц или квартал')}
               onClick={() => setTarget({ kind: period, at: null })}
            >
               <Plus aria-hidden />
               {t('Добавить показатели')}
            </Button>
            <p className='text-ink-soft text-meta min-w-0 flex-[1_1_100%]'>
               {note}
            </p>
         </div>
         <Card>
            {company.metrics.length ? (
               <Table
                  className={
                     periods.length <= 8
                        ? 'min-w-3xl'
                        : periods.length <= 12
                          ? 'min-w-5xl'
                          : periods.length <= 18
                            ? 'min-w-7xl'
                            : 'min-w-[110rem]'
                  }
                  head={
                     <>
                        <th className={TH}>{t('Показатель')}</th>
                        {periods.map((at) => (
                           <th
                              key={at}
                              className={clsx(
                                 TH,
                                 'group/col text-right leading-tight',
                              )}
                           >
                              {isQuarter(at) ? (
                                 quarterLabel(t, at)
                              ) : (
                                 // the month's name over its year, so it never reads as a day
                                 <>
                                    <span className='block'>
                                       {dayjs(`${at}-01`).format('MMM')}
                                    </span>
                                    <span className='text-ink-faint block font-normal'>
                                       {at.slice(0, 4)}
                                    </span>
                                 </>
                              )}
                              {/* the period's figures, in the window or deleted */}
                              <span className='mt-1 flex justify-end opacity-0 transition-opacity group-hover/col:opacity-100 focus-within:opacity-100'>
                                 <ItemActions
                                    icons
                                    name={periodLabel(t, period, at)}
                                    onDelete={
                                       company.metrics.some(
                                          (row) =>
                                             valuesOf(row, period)[at] != null,
                                       )
                                          ? () =>
                                               setRemoving({ kind: period, at })
                                          : undefined
                                    }
                                    onEdit={() =>
                                       setTarget({ kind: period, at })
                                    }
                                 />
                              </span>
                           </th>
                        ))}
                     </>
                  }
               >
                  {company.metrics.map((row) => {
                     const on = row.key === chosen;
                     const unit = metricUnit(t, row);
                     const name = metricName(t, row.key);
                     return (
                        <tr
                           key={row.key}
                           aria-selected={on}
                           className={clsx(
                              'cursor-pointer',
                              on ? 'bg-accent-tint' : 'hover:bg-hover',
                           )}
                           onClick={() => setChosen(row.key)}
                        >
                           <td className={clsx(TD, 'whitespace-nowrap')}>
                              <span className='font-semibold'>{name}</span>
                              {unit && (
                                 <span className='text-ink-faint ml-1.5 text-xs'>
                                    {unit}
                                 </span>
                              )}
                           </td>
                           {periods.map((at) => {
                              const value = valuesOf(row, period)[at] ?? null;
                              return (
                                 <td
                                    key={at}
                                    className={clsx(
                                       TD,
                                       'py-1.5 whitespace-nowrap',
                                    )}
                                 >
                                    <InlineField
                                       className={clsx(
                                          'text-right tabular-nums',
                                          on && 'hover:bg-white',
                                       )}
                                       format={(text) =>
                                          formatMetric(
                                             t,
                                             row,
                                             Number(text),
                                             language,
                                          )
                                       }
                                       inputMode='decimal'
                                       label={`${name}, ${label(at)}`}
                                       maxLength={16}
                                       placeholder={
                                          at === cycle.quarter
                                             ? t('ждём до {{date}}', {
                                                  date: formatDay(cycle.due),
                                               })
                                             : '—'
                                       }
                                       validate={(text) =>
                                          Number.isNaN(
                                             parseMetric(text, row.format),
                                          )
                                             ? t('Нужно число')
                                             : undefined
                                       }
                                       value={
                                          value === null ? '' : String(value)
                                       }
                                       onSave={(text) =>
                                          portfolio.saveMetrics(company.id, {
                                             [at]: {
                                                [row.key]: parseMetric(
                                                   text,
                                                   row.format,
                                                ),
                                             },
                                          } as Record<
                                             string,
                                             Record<MetricKey, number | null>
                                          >)
                                       }
                                    />
                                 </td>
                              );
                           })}
                        </tr>
                     );
                  })}
               </Table>
            ) : (
               <NoData>
                  {t(
                     'Показателей ещё нет: добавьте их в «Настройки → Портфель → Показатели».',
                  )}
               </NoData>
            )}
            <footer className='border-line text-ink-soft flex flex-wrap justify-between gap-x-4 gap-y-1 border-t px-4.5 py-2.5 text-xs'>
               <span>
                  {t(
                     'Цифры за период — «Добавить показатели» или карандаш над его столбцом; одну цифру можно поправить прямо в ячейке. Нажмите на показатель, чтобы построить график.',
                  )}
               </span>
               <Link
                  className='hover:text-ink'
                  data-hint={t('Открыть набор показателей в настройках')}
                  to={`${SETTINGS_PATH}/metrics`}
               >
                  {t('Набор показателей: «Настройки → Портфель → Показатели»')}
               </Link>
            </footer>
         </Card>
         {metric && (
            <Card
               title={t('{{metric}} · {{company}}', {
                  metric: metricName(t, metric.key),
                  company: company.name,
               })}
            >
               <MetricChart
                  metric={metric}
                  points={periods.map((at) => ({
                     label: isQuarter(at)
                        ? quarterLabel(t, at)
                        : monthLabel(at),
                     value: valuesOf(metric, period)[at] ?? null,
                  }))}
               />
            </Card>
         )}
         <QuarterReports
            company={company}
            cycle={cycle}
            onCheck={setChecking}
         />
         <PeriodDialog
            company={company}
            target={target}
            onClose={() => setTarget(null)}
            onDelete={(kind, at) => {
               setTarget(null);
               setRemoving({ kind, at });
            }}
            onSaved={(kind, at) => {
               setTarget(null);
               if (kind !== period) show(kind);
               include(kind, at);
            }}
         />
         <ConfirmDialog
            open={removing !== null}
            subtitle={company.name}
            success={t('Цифры за период удалены')}
            title={
               removing?.at
                  ? t('Удалить цифры за {{period}}?', {
                       period: periodLabel(t, removing.kind, removing.at),
                    })
                  : ''
            }
            onClose={() => setRemoving(null)}
            onConfirm={() =>
               removing?.at &&
               portfolio.saveMetrics(company.id, {
                  [removing.at]: Object.fromEntries(
                     company.metrics.map(({ key }) => [key, null]),
                  ),
               } as Record<string, Record<MetricKey, number | null>>)
            }
         >
            <p>
               {t(
                  'Все цифры компании за этот период пропадут из таблицы и графиков.',
               )}
            </p>
         </ConfirmDialog>
         <MetricsDialog
            company={checking ? company : null}
            quarter={checking ?? cycle.quarter}
            onClose={() => setChecking(null)}
         />
      </div>
   );
};

interface QuarterReportsProps {
   company: PortfolioCompany;
   cycle: PortfolioData['cycle'];
   onCheck: (quarter: string) => void;
}

// Each quarter's report, the newest first: its documents received out of
// those the fund asks for, and its figures to check or confirmed.
const QuarterReports = ({ company, cycle, onCheck }: QuarterReportsProps) => {
   const { t } = useTranslation('portfolio');
   const total = reportDocs().length;
   const late = todayISO() > cycle.due;
   const quarters = recentQuarters(cycle.quarter)
      .reverse()
      .filter((quarter) => owesReport(company, quarter));

   if (!quarters.length)
      return (
         <Card title={t('Квартальные отчёты')}>
            <NoData>{firstReportNote(t, company)}</NoData>
         </Card>
      );

   return (
      <Card title={t('Квартальные отчёты')}>
         <Table
            className='min-w-xl'
            head={
               <>
                  <th className={TH}>{t('Квартал')}</th>
                  <th className={TH}>{t('Документы')}</th>
                  <th className={TH}>{t('Показатели в дашборде')}</th>
               </>
            }
         >
            {quarters.map((quarter) => {
               const report = company.reports[quarter];
               const count = receivedCount(company, quarter);
               const open = quarter === cycle.quarter;
               return (
                  <tr key={quarter}>
                     <td className={TD}>
                        <div className='font-semibold'>
                           {quarterLabel(t, quarter)}
                        </div>
                        {open && (
                           <div className='text-ink-soft text-xs'>
                              {t('срок сдачи {{date}}', {
                                 date: formatDate(cycle.due),
                              })}
                           </div>
                        )}
                     </td>
                     <td className={TD}>
                        <Badge
                           tone={
                              count === total
                                 ? 'success'
                                 : !open || late
                                   ? 'danger'
                                   : count
                                     ? 'warning'
                                     : 'neutral'
                           }
                        >
                           {t('{{count}} из {{total}}', { count, total })}
                        </Badge>
                     </td>
                     <td className={TD}>
                        {report?.metrics === 'check' ? (
                           <span className='flex flex-wrap items-center gap-x-2.5 gap-y-1'>
                              <button
                                 type='button'
                                 className='rounded-md'
                                 data-hint={t(
                                    'Открыть показатели из шаблона и проверить их',
                                 )}
                                 onClick={() => onCheck(quarter)}
                              >
                                 <Badge tone='warning'>{t('Проверить')}</Badge>
                              </button>
                              {report.filledAt && (
                                 <span className='text-ink-soft text-xs'>
                                    {t('Заполнено из шаблона {{date}}', {
                                       date: formatDate(report.filledAt),
                                    })}
                                 </span>
                              )}
                           </span>
                        ) : report?.metrics === 'confirmed' ? (
                           <Badge tone='success'>{t('Подтверждены')}</Badge>
                        ) : (
                           <span className='text-ink-faint'>—</span>
                        )}
                     </td>
                  </tr>
               );
            })}
         </Table>
         <p className='border-line text-ink-soft border-t px-4.5 py-2.5 text-xs'>
            {t(
               'Компания отправляет документы и показатели из кабинета основателя; документы — во вкладке «Документы Data Room».',
            )}
         </p>
      </Card>
   );
};

interface MetricChartProps {
   metric: Metric;
   points: { label: string; value: number | null }[]; // oldest first
}

const HEIGHT = 240;
const PAD = { top: 12, right: 16, bottom: 26, left: 64 };
const LINE = 'var(--color-sky)';

/* A metric over the table's periods, as the design draws it: a line over a
   light area, a point on each figure; the line breaks where a period has
   none. Pointing at a period shows its figure in a note. */
const MetricChart = ({ metric, points }: MetricChartProps) => {
   const { t, i18n } = useTranslation('portfolio');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const { box, hover, track, leave } = useChartHover<number>();
   const [width, setWidth] = useState(0);
   const figures = points.flatMap(({ value }) => (value === null ? [] : value));
   const charted = figures.length > 0;

   useEffect(() => {
      const element = box.current;
      if (!element) return;
      const observer = new ResizeObserver(([entry]) =>
         setWidth(entry.contentRect.width),
      );
      observer.observe(element);
      return () => observer.disconnect();
   }, [box, charted]);

   if (!charted)
      return (
         <p className='text-ink-soft px-4.5 py-3.5'>
            {t('Цифр по этому показателю за эти периоды нет.')}
         </p>
      );

   // round steps from below the lowest figure (or zero) to above the highest
   const low = Math.min(0, ...figures);
   const high = Math.max(0, ...figures);
   const step = axisTicks(high - low)[1] || 1;
   const from = Math.floor(low / step) * step;
   const to = Math.max(Math.ceil(high / step) * step, from + step);
   const ticks = Array.from(
      { length: Math.round((to - from) / step) + 1 },
      (_, index) => Number((from + index * step).toFixed(6)),
   );
   const plot = {
      width: Math.max(0, width - PAD.left - PAD.right),
      height: HEIGHT - PAD.top - PAD.bottom,
   };
   const gap = points.length > 1 ? plot.width / (points.length - 1) : 0;
   const x = (index: number) =>
      PAD.left + (points.length > 1 ? index * gap : plot.width / 2);
   const y = (value: number) =>
      PAD.top + plot.height * (1 - (value - from) / (to - from));
   // the runs of periods next to each other that have a figure
   const runs: number[][] = [];
   points.forEach(({ value }, index) => {
      if (value === null) return;
      const last = runs.at(-1);
      if (last && last.at(-1) === index - 1) last.push(index);
      else runs.push([index]);
   });
   const lineOf = (run: number[]) =>
      run
         .map(
            (index, at) =>
               `${at ? 'L' : 'M'} ${x(index)} ${y(points[index].value ?? 0)}`,
         )
         .join(' ');
   const areaOf = (run: number[]) =>
      `${lineOf(run)} L ${x(run[run.length - 1])} ${y(0)} L ${x(run[0])} ${y(0)} Z`;
   // every period is named while they fit, every other one after that
   const every = gap && gap < 48 ? 2 : 1;
   const axis = (value: number) =>
      metric.format === 'usd'
         ? `${value < 0 ? '−' : ''}${formatMoneyShort(Math.abs(value))}`
         : `${formatNumber(value, language, Number.isInteger(value) ? 0 : 1)}${metric.format === 'percent' ? '%' : ''}`;
   const shown = hover === null ? null : points[hover.item];

   return (
      <div ref={box} className='relative px-2 pt-2 pb-1' onPointerLeave={leave}>
         {width > 0 && (
            <svg
               aria-label={t('{{metric}} по периодам', {
                  metric: metricName(t, metric.key),
               })}
               height={HEIGHT}
               role='img'
               width={width}
            >
               {ticks.map((tick) => (
                  <g key={tick}>
                     <line
                        stroke={
                           tick === 0 && from < 0
                              ? 'var(--color-line-strong)'
                              : 'var(--color-line)'
                        }
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
                        {axis(tick)}
                     </text>
                  </g>
               ))}
               {runs.map((run) => (
                  <g key={run[0]}>
                     {run.length > 1 && (
                        <>
                           <path
                              d={areaOf(run)}
                              fill={`color-mix(in srgb, ${LINE} 14%, transparent)`}
                           />
                           <path
                              d={lineOf(run)}
                              fill='none'
                              stroke={LINE}
                              strokeLinejoin='round'
                              strokeWidth={2}
                           />
                        </>
                     )}
                  </g>
               ))}
               {points.map(({ label, value }, index) => (
                  <g key={label}>
                     {index % every === 0 && (
                        <text
                           className='fill-ink-faint text-[11px]'
                           textAnchor='middle'
                           x={x(index)}
                           y={HEIGHT - 6}
                        >
                           {label}
                        </text>
                     )}
                     {hover?.item === index && (
                        <line
                           stroke='var(--color-line-strong)'
                           x1={x(index)}
                           x2={x(index)}
                           y1={PAD.top}
                           y2={PAD.top + plot.height}
                        />
                     )}
                     {value !== null && (
                        <circle
                           cx={x(index)}
                           cy={y(value)}
                           fill={LINE}
                           r={hover?.item === index ? 5 : 4}
                           stroke='#fff'
                           strokeWidth={2}
                        />
                     )}
                     {/* the period's band, for pointing at */}
                     <rect
                        fill='transparent'
                        height={plot.height}
                        width={Math.max(gap, 24)}
                        x={x(index) - Math.max(gap, 24) / 2}
                        y={PAD.top}
                        onPointerMove={track(index)}
                     />
                  </g>
               ))}
            </svg>
         )}
         {hover && shown && (
            <ChartTooltip
               rows={[
                  {
                     color: LINE,
                     value:
                        shown.value === null
                           ? '—'
                           : formatMetric(t, metric, shown.value, language),
                  },
               ]}
               title={`${metricName(t, metric.key)} · ${shown.label}`}
               width={hover.width}
               x={hover.x}
               y={hover.y}
            />
         )}
      </div>
   );
};

export default Metrics;

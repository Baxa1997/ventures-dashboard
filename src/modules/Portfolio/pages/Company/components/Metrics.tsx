import MetricsDialog from '@modules/Portfolio/components/MetricsDialog';
import {
   firstReportNote,
   formatMetric,
   metricName,
   metricUnit,
   monthLabel,
   owesReport,
   parseMetric,
   quarterLabel,
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
import { useAction } from '@shared/hooks';
import type { Metric, PortfolioCompany } from '@shared/types/portfolio.types';
import clsx from 'clsx';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

interface MetricsProps {
   company: PortfolioCompany;
   cycle: PortfolioData['cycle'];
}

type Period = 'month' | 'quarter';

// How far back the table and the chart go.
const COLUMNS: Record<Period, number> = { month: 12, quarter: 8 };

// A quarter is 2026-Q3, a month 2026-09.
const isQuarter = (period: string) => period.includes('-Q');

// The figures by period of the view: the quarters reported, or the months.
const valuesOf = (metric: Metric, period: Period) =>
   period === 'quarter' ? metric.values : metric.months;

// The figure of a cell, as its input starts.
const cellText = (value: number | null | undefined) =>
   value == null ? '' : String(value);

/* «Показатели», as the design draws them: by month or by quarter (the
   address keeps it, ?period=month), a row for each metric with its unit and
   a column for each period, the newest on the right. «Изменить» turns every
   cell into a field: the figures are typed in the table itself and saved at
   once; an emptied cell deletes its figure. A row pressed draws its metric
   under the table. Under it, each quarter's report: how many of its
   documents came and whether the figures the fund's template brought in are
   confirmed. */
const Metrics = ({ company, cycle }: MetricsProps) => {
   const { t, i18n } = useTranslation('portfolio');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const [params, setParams] = useSearchParams();
   const period: Period =
      params.get('period') === 'month' ? 'month' : 'quarter';
   const periods =
      period === 'quarter'
         ? recentQuarters(cycle.quarter, COLUMNS.quarter)
         : recentMonths(COLUMNS.month);
   const label = (at: string) =>
      isQuarter(at) ? quarterLabel(t, at) : monthLabel(at);
   const [chosen, setChosen] = useState(company.metrics[0]?.key ?? '');
   const metric = company.metrics.find(({ key }) => key === chosen);
   // the quarter whose figures from the template are being checked
   const [checking, setChecking] = useState<string | null>(null);
   // the cells as typed while the table is changed, by `period|metric`;
   // null while it is only shown
   const [draft, setDraft] = useState<Record<string, string> | null>(null);
   const [invalid, setInvalid] = useState<string[]>([]);
   const saving = useAction(
      (changes: Record<string, Record<string, number | null>>) =>
         portfolio.saveMetrics(company.id, changes),
      { success: t('Показатели сохранены') },
   );

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
           : t('Помесячных цифр пока нет: их вносит фонд, нажмите «Изменить».');

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

   const cancel = () => {
      setDraft(null);
      setInvalid([]);
   };

   // the typed figures that differ from those kept, by period and metric;
   // a cell that is not a number is marked and nothing is written
   const save = async () => {
      if (!draft) return;
      const changes: Record<string, Record<string, number | null>> = {};
      const wrong: string[] = [];
      for (const [key, text] of Object.entries(draft)) {
         const [at, metricKey] = key.split('|');
         const row = company.metrics.find(({ key: one }) => one === metricKey);
         if (!row) continue;
         const value = parseMetric(text, row.format);
         if (Number.isNaN(value)) {
            wrong.push(key);
            continue;
         }
         const kept = (isQuarter(at) ? row.values : row.months)[at] ?? null;
         if (value !== kept)
            changes[at] = { ...changes[at], [metricKey]: value };
      }
      setInvalid(wrong);
      if (wrong.length) return;
      if (!Object.keys(changes).length) return cancel();
      if (await saving.run(changes)) cancel();
   };

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
            <p className='text-ink-soft text-meta min-w-0 flex-[1_1_18rem]'>
               {note}
            </p>
            {company.metrics.length > 0 && (
               <div className='ml-auto flex gap-2'>
                  {draft ? (
                     <>
                        <Button
                           disabled={saving.pending}
                           hint={t('Выйти из правки, ничего не меняя')}
                           variant='ghost'
                           onClick={cancel}
                        >
                           {t('Отмена')}
                        </Button>
                        <Button
                           hint={t('Сохранить цифры, введённые в таблице')}
                           loading={saving.pending}
                           onClick={save}
                        >
                           {t('Сохранить')}
                        </Button>
                     </>
                  ) : (
                     <Button
                        hint={t(
                           'Править цифры прямо в таблице: каждая ячейка станет полем',
                        )}
                        variant='ghost'
                        onClick={() => setDraft({})}
                     >
                        <Pencil aria-hidden />
                        {t('Изменить')}
                     </Button>
                  )}
               </div>
            )}
         </div>
         <Card>
            {company.metrics.length ? (
               <Table
                  className={period === 'month' ? 'min-w-5xl' : 'min-w-3xl'}
                  head={
                     <>
                        <th className={TH}>{t('Показатель')}</th>
                        {periods.map((at) => (
                           <th key={at} className={clsx(TH, 'text-right')}>
                              {label(at)}
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
                              const key = `${at}|${row.key}`;
                              return (
                                 <td
                                    key={at}
                                    className={clsx(
                                       TD,
                                       'text-right whitespace-nowrap tabular-nums',
                                       draft && 'py-1.5',
                                       !draft &&
                                          value === null &&
                                          'text-ink-soft text-xs',
                                    )}
                                 >
                                    {draft ? (
                                       <input
                                          aria-invalid={invalid.includes(key)}
                                          aria-label={`${name}, ${label(at)}`}
                                          className='field-input h-8 w-24 px-2 text-right tabular-nums'
                                          inputMode='decimal'
                                          maxLength={16}
                                          value={draft[key] ?? cellText(value)}
                                          onChange={(event) => {
                                             const text = event.target.value;
                                             setDraft(
                                                (cells) =>
                                                   cells && {
                                                      ...cells,
                                                      [key]: text,
                                                   },
                                             );
                                          }}
                                          onKeyDown={(event) => {
                                             if (event.key === 'Enter')
                                                void save();
                                             if (event.key === 'Escape')
                                                cancel();
                                          }}
                                       />
                                    ) : value !== null ? (
                                       formatMetric(t, row, value, language)
                                    ) : at === cycle.quarter ? (
                                       t('ждём до {{date}}', {
                                          date: formatDay(cycle.due),
                                       })
                                    ) : (
                                       '—'
                                    )}
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
               <span className={clsx(invalid.length > 0 && 'text-danger')}>
                  {invalid.length
                     ? t('Нужно число: проверьте ячейки в красной рамке.')
                     : draft
                       ? t(
                            'Пустая ячейка удаляет цифру. Enter — сохранить, Esc — отменить.',
                         )
                       : t('Нажмите на показатель, чтобы построить график')}
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
                     label: label(at),
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

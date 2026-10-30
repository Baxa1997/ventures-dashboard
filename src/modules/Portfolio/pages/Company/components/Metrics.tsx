import {
   formatMetric,
   metricName,
   quarterLabel,
   recentQuarters,
} from '@modules/Portfolio/helpers';
import type { PortfolioData } from '@modules/Portfolio/hooks';
import { Card, ItemActions, Table, TD, TH } from '@shared/components';
import { formatDay } from '@shared/helpers';
import type { Metric, PortfolioCompany } from '@shared/types/portfolio.types';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface MetricsProps {
   company: PortfolioCompany;
   cycle: PortfolioData['cycle'];
   onEdit: (quarter: string) => void;
   onDelete: (quarter: string) => void;
}

// How many quarters the chart goes back.
const CHART_QUARTERS = 8;

/* «Показатели», as the design draws them: the figures by quarter, each
   quarter changed or its figures deleted (after asking); a quarter whose
   report has not come yet says until when the fund waits for it. A row
   pressed draws its metric under the table. */
const Metrics = ({ company, cycle, onEdit, onDelete }: MetricsProps) => {
   const { t, i18n } = useTranslation('portfolio');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const quarters = recentQuarters(cycle.quarter);
   const [chosen, setChosen] = useState(company.metrics[0]?.key ?? '');
   const metric = company.metrics.find(({ key }) => key === chosen);

   return (
      <div className='gap-section flex flex-1 flex-col'>
         <Card
            action={
               <button
                  type='button'
                  className='link'
                  onClick={() => onEdit(cycle.quarter)}
               >
                  {t('Внести показатели')}
               </button>
            }
            title={t('Показатели по кварталам')}
         >
            {company.metrics.length ? (
               <Table
                  className='min-w-xl'
                  head={
                     <>
                        <th className={TH}>{t('Показатель')}</th>
                        {quarters.map((quarter) => (
                           <th key={quarter} className={clsx(TH, 'text-right')}>
                              {quarterLabel(t, quarter)}
                           </th>
                        ))}
                     </>
                  }
               >
                  {company.metrics.map((row) => {
                     const latest = quarters
                        .filter((quarter) => row.values[quarter] != null)
                        .at(-1);
                     const on = row.key === chosen;
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
                           <td className={clsx(TD, 'font-semibold')}>
                              {metricName(t, row.key)}
                           </td>
                           {quarters.map((quarter) => {
                              const value = row.values[quarter] ?? null;
                              return (
                                 <td
                                    key={quarter}
                                    className={clsx(
                                       TD,
                                       'text-right whitespace-nowrap tabular-nums',
                                       quarter === latest && 'font-bold',
                                       value === null &&
                                          'text-ink-soft text-xs',
                                    )}
                                 >
                                    {value !== null
                                       ? formatMetric(t, row, value, language)
                                       : quarter === cycle.quarter
                                         ? t('ждём до {{date}}', {
                                              date: formatDay(cycle.due),
                                           })
                                         : '—'}
                                 </td>
                              );
                           })}
                        </tr>
                     );
                  })}
                  <tr>
                     <td className={clsx(TD, 'py-1')}>
                        <span className='sr-only'>{t('Действия')}</span>
                     </td>
                     {quarters.map((quarter) => (
                        <td key={quarter} className={clsx(TD, 'py-1')}>
                           <ItemActions
                              icons
                              name={quarterLabel(t, quarter)}
                              onDelete={
                                 company.metrics.some(
                                    ({ values }) => values[quarter] != null,
                                 )
                                    ? () => onDelete(quarter)
                                    : undefined
                              }
                              onEdit={() => onEdit(quarter)}
                           />
                        </td>
                     ))}
                  </tr>
               </Table>
            ) : (
               <p className='text-ink-soft px-4.5 py-3.5'>
                  {t('Показатели этой компании ещё не перенесены.')}
               </p>
            )}
            <p className='border-line text-ink-soft border-t px-4.5 py-2.5 text-xs'>
               {t(
                  'Нажмите на показатель, чтобы построить график. Показатели приходят из шаблона отчёта фонда; набор — «Настройки → Портфель → Показатели».',
               )}
            </p>
         </Card>
         {metric && (
            <Card
               title={t('{{metric}} · {{company}}', {
                  metric: metricName(t, metric.key),
                  company: company.name,
               })}
            >
               <MetricBars
                  metric={metric}
                  quarters={recentQuarters(cycle.quarter, CHART_QUARTERS)}
               />
            </Card>
         )}
      </div>
   );
};

interface MetricBarsProps {
   metric: Metric;
   quarters: string[]; // oldest first
}

// A metric by quarter as columns, each with its figure; a quarter without
// one is an empty place.
const MetricBars = ({ metric, quarters }: MetricBarsProps) => {
   const { t, i18n } = useTranslation('portfolio');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const values = quarters.map((quarter) => metric.values[quarter] ?? null);
   const top = Math.max(...values.map((value) => Math.abs(value ?? 0)), 0);

   if (!top)
      return (
         <p className='text-ink-soft px-4.5 py-3.5'>
            {t('Цифр по этому показателю ещё нет.')}
         </p>
      );

   return (
      <div className='overflow-x-auto px-4.5 pt-4 pb-3'>
         <div className='flex h-48 min-w-lg items-end gap-3'>
            {quarters.map((quarter, index) => {
               const value = values[index];
               return (
                  <div
                     key={quarter}
                     className='flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5'
                     title={
                        value === null
                           ? quarterLabel(t, quarter)
                           : `${quarterLabel(t, quarter)}: ${formatMetric(t, metric, value, language)}`
                     }
                  >
                     <span className='text-ink-soft text-[11px] whitespace-nowrap tabular-nums'>
                        {value === null
                           ? ''
                           : formatMetric(t, metric, value, language)}
                     </span>
                     <span
                        className={clsx(
                           'w-full max-w-10 rounded-t',
                           value !== null && value < 0
                              ? 'bg-danger'
                              : 'bg-sky',
                        )}
                        // the column's height less its figure's line above
                        style={{
                           height: `calc((100% - 1.5rem) * ${Math.abs(value ?? 0) / top})`,
                        }}
                     />
                  </div>
               );
            })}
         </div>
         <div className='border-line mt-1 flex min-w-lg gap-3 border-t pt-1.5'>
            {quarters.map((quarter) => (
               <span
                  key={quarter}
                  className='text-ink-faint min-w-0 flex-1 text-center text-[11px]'
               >
                  {quarterLabel(t, quarter)}
               </span>
            ))}
         </div>
      </div>
   );
};

export default Metrics;

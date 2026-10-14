import {
   MONTHS_PASSED,
   REPORT_PATH,
   REPORT_STATUSES,
} from '@modules/Finance/constants';
import {
   formatMillions,
   lineFact,
   unassignedCount,
} from '@modules/Finance/helpers';
import type { FinanceData } from '@modules/Finance/hooks';
import finance from '@modules/Finance/services';
import {
   Badge,
   Card,
   Person,
   Progress,
   Table,
   TD,
   TH,
} from '@shared/components';
import { DIRECTOR_ID, SECTION_PATHS } from '@shared/constants';
import { formatDate } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { FlowGroup } from '@shared/types/finance.types';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface BudgetProps {
   data: FinanceData;
   onActuals: () => void;
}

const IN_WORK = ['draft', 'review', 'director', 'approved'];

/* The month's financial reporting with its files and statuses, and the
   year's budget against the fact counted from the bank statements. A line
   that spends faster than the months passed is marked. */
const Budget = ({ data, onActuals }: BudgetProps) => {
   const { t, i18n } = useTranslation('finance');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const user = useCurrentUser();
   const norm = MONTHS_PASSED / 12;
   const inWork = data.reports.filter(({ status }) =>
      IN_WORK.includes(status),
   ).length;
   const groups: { group: FlowGroup; label: string }[] = [
      { group: 'income', label: t('Доходы') },
      { group: 'expense', label: t('Расходы') },
   ];
   // the reports of the month after the last statement
   const month = dayjs(data.statementDate).add(1, 'day').format('MMMM');

   return (
      <>
         <Card
            action={
               <Link className='link' to={SECTION_PATHS.documents}>
                  {t('Все финансовые документы')}
               </Link>
            }
            hint={t('{{count}} документ в работе', { count: inWork })}
            title={t('Отчётность — {{month}}', { month })}
         >
            <Table
               className='min-w-3xl'
               head={
                  <>
                     <th className={TH}>{t('Документ')}</th>
                     <th className={TH}>{t('Период')}</th>
                     <th className={TH}>{t('Срок')}</th>
                     <th className={TH}>{t('Статус')}</th>
                     <th className={TH}>{t('Ответственный')}</th>
                  </>
               }
            >
               {data.reports.map((report) => {
                  const status = REPORT_STATUSES[report.status];
                  return (
                     <tr key={report.id}>
                        <td className={TD}>
                           <div className='font-semibold'>{report.title}</div>
                           {report.authority && (
                              <div className='text-ink-soft mt-0.5 text-xs'>
                                 {report.authority}
                              </div>
                           )}
                           <div
                              className={clsx(
                                 'mt-0.5 text-xs',
                                 report.file ? 'text-accent' : 'text-ink-soft',
                              )}
                           >
                              {report.file
                                 ? t('Файл: {{name}}', { name: report.file })
                                 : t('Файл не прикреплён')}
                           </div>
                        </td>
                        <td className={clsx(TD, 'text-ink-soft')}>
                           {report.period}
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           {report.due}
                        </td>
                        <td className={TD}>
                           <Badge tone={status.tone}>{t(status.label)}</Badge>
                           {report.status === 'director' &&
                              user.id === DIRECTOR_ID && (
                                 <button
                                    type='button'
                                    className='link ml-3'
                                    onClick={() =>
                                       finance.setReportStatus(
                                          report.id,
                                          'approved',
                                       )
                                    }
                                 >
                                    {t('Согласовать')}
                                 </button>
                              )}
                        </td>
                        <td className={TD}>
                           <Person id={report.ownerId} />
                        </td>
                     </tr>
                  );
               })}
            </Table>
            <p className='border-line text-ink-soft border-t px-5 py-3 text-xs'>
               {t('Путь документа:')}{' '}
               {REPORT_PATH.map((step, index) => (
                  <Fragment key={step}>
                     {index > 0 && <span aria-hidden> → </span>}
                     <span className='text-ink'>{t(step)}</span>
                  </Fragment>
               ))}
            </p>
         </Card>

         <Card
            action={
               <button type='button' className='link' onClick={onActuals}>
                  {t('Операции по статьям')}
               </button>
            }
            className='mt-section'
            hint={[
               t('млн сум · факт из выписок по {{date}}', {
                  date: formatDate(data.statementDate),
               }),
               data.budgetFile &&
                  t('план: {{name}}', { name: data.budgetFile }),
            ]
               .filter(Boolean)
               .join(' · ')}
            title={t('Бюджет {{year}} — план и факт за {{count}} месяц', {
               year: data.plan.year,
               count: MONTHS_PASSED,
            })}
         >
            <Table
               className='min-w-2xl'
               head={
                  <>
                     <th className={TH}>{t('Статья')}</th>
                     <th className={clsx(TH, 'text-right')}>
                        {t('План на год')}
                     </th>
                     <th className={clsx(TH, 'text-right')}>
                        {t('Факт {{count}} мес.', { count: MONTHS_PASSED })}
                     </th>
                     <th className={clsx(TH, 'w-[30%]')}>{t('Исполнение')}</th>
                  </>
               }
            >
               {groups.map(({ group, label }) => (
                  <Fragment key={group}>
                     <tr className='bg-ground/70'>
                        <td
                           className={clsx(TD, 'py-2.5 font-semibold')}
                           colSpan={4}
                        >
                           {label}
                        </td>
                     </tr>
                     {data.budget
                        .filter((line) => line.group === group)
                        .map((line) => {
                           const fact = lineFact(data, line.id);
                           const share = line.plan ? fact / line.plan : 0;
                           const fast =
                              group === 'expense' && share > norm + 0.005;
                           return (
                              <tr key={line.id}>
                                 <td className={TD}>{line.title}</td>
                                 <td
                                    className={clsx(
                                       TD,
                                       'text-ink-soft text-right tabular-nums',
                                    )}
                                 >
                                    {formatMillions(line.plan, language)}
                                 </td>
                                 <td
                                    className={clsx(
                                       TD,
                                       'text-right font-semibold tabular-nums',
                                    )}
                                 >
                                    {formatMillions(fact, language)}
                                 </td>
                                 <td className={TD}>
                                    <span className='flex items-center gap-3'>
                                       <Progress
                                          className='h-1.5 flex-1'
                                          max={line.plan}
                                          tone={fast ? 'warning' : 'accent'}
                                          value={fact}
                                       />
                                       <span
                                          className={clsx(
                                             'w-9 text-right text-xs tabular-nums',
                                             fast
                                                ? 'text-warning-ink'
                                                : 'text-ink-soft',
                                          )}
                                       >
                                          {Math.round(share * 100)}%
                                       </span>
                                    </span>
                                 </td>
                              </tr>
                           );
                        })}
                  </Fragment>
               ))}
            </Table>
            <p className='border-line text-ink-soft border-t px-5 py-3 text-xs'>
               {t(
                  'Норма исполнения за {{months}} месяцев — {{norm}}%. Жёлтым — статьи, которые идут быстрее нормы. Факт считается автоматически из выписок SQB по статьям, которые привязаны к строкам бюджета на вкладке «Фактические данные → Статьи и правила».',
                  { months: MONTHS_PASSED, norm: Math.round(norm * 100) },
               )}{' '}
               {t('{{count}} операция без статьи в факт пока не вошла.', {
                  count: unassignedCount(data),
               })}{' '}
               {t('Суммы на макете примерные.')}
            </p>
         </Card>
      </>
   );
};

export default Budget;

import ReportDocTitle from '@modules/Portfolio/components/ReportDocTitle';
import MetricsDialog from '@modules/Portfolio/components/MetricsDialog';
import { TEMPLATE_BLOCKS } from '@modules/Portfolio/constants';
import {
   quarterLabel,
   receivedCount,
   recentQuarters,
   reportDocName,
   reportDocs,
} from '@modules/Portfolio/helpers';
import type { PortfolioData } from '@modules/Portfolio/hooks';
import {
   Avatar,
   Badge,
   Card,
   Progress,
   STACK,
   Table,
   TD,
   TH,
} from '@shared/components';
import { employeeOf } from '@shared/constants';
import { useAttachments } from '@shared/hooks';
import {
   formatDate,
   personName,
   todayISO,
   workingDaysBetween,
} from '@shared/helpers';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ReportsProps {
   data: PortfolioData;
}

interface ReportFilesProps {
   companyId: string;
   quarter: string;
   doc: string;
}

// The files a company sent for a document of the quarter from the startup
// cabinet (attachments, section `report`, item `<quarter>:<doc>`).
const ReportFiles = ({ companyId, quarter, doc }: ReportFilesProps) => {
   const files = useAttachments({
      companyId,
      section: 'report',
      itemId: `${quarter}:${doc}`,
   });
   if (!files.length) return null;
   return (
      <ul className='mt-1 flex max-w-40 flex-col gap-0.5'>
         {files.map((file) => (
            <li key={file.id} className='truncate'>
               <a
                  className='text-accent text-xs hover:underline'
                  href={file.url}
                  rel='noreferrer'
                  target='_blank'
                  title={file.title}
               >
                  {file.title}
               </a>
            </li>
         ))}
      </ul>
   );
};

/* The quarter's reporting: which of the four documents each company has sent,
   and whether the figures from the fund's template are confirmed. Companies
   upload in their cabinets; the figures move over by themselves. */
const Reports = ({ data }: ReportsProps) => {
   const { t } = useTranslation('portfolio');
   const { companies, cycle, flags } = data;
   const [quarter, setQuarter] = useState(cycle.quarter);
   const [checking, setChecking] = useState<PortfolioCompany | null>(null);
   const current = quarter === cycle.quarter;
   const total = companies.length * reportDocs().length;
   const received = companies.reduce(
      (sum, company) => sum + receivedCount(company, quarter),
      0,
   );
   const late = current && todayISO() > cycle.due;

   return (
      <>
         <div className='flex flex-wrap items-end gap-x-6 gap-y-3'>
            <div className='min-w-60 flex-1'>
               <p className='font-semibold'>
                  {t('Получено {{count}} документ из {{total}}', {
                     count: received,
                     total,
                  })}
               </p>
               <Progress className='mt-2 h-1.5' max={total} value={received} />
            </div>
            <p className='text-ink-soft text-meta'>
               {!current
                  ? t('квартал закрыт')
                  : late
                    ? t('срок прошёл {{date}}', { date: formatDate(cycle.due) })
                    : t('осталось {{count}} рабочий день', {
                         count: workingDaysBetween(todayISO(), cycle.due),
                      })}
            </p>
            <div role='group' aria-label={t('Квартал')} className='flex gap-2'>
               {recentQuarters(cycle.quarter).map((value) => (
                  <button
                     key={value}
                     type='button'
                     aria-pressed={value === quarter}
                     className={clsx(
                        'text-meta h-9 rounded-lg border px-3 font-medium',
                        value === quarter
                           ? 'border-accent bg-accent-tint text-accent'
                           : 'border-line-strong text-ink bg-white hover:bg-ground',
                     )}
                     onClick={() => setQuarter(value)}
                  >
                     {quarterLabel(t, value)}
                  </button>
               ))}
            </div>
         </div>

         <div className='mt-section gap-section grid flex-1 xl:grid-cols-[minmax(0,2.25fr)_minmax(0,1fr)]'>
            <Card className='overflow-hidden'>
               <Table
                  className='min-w-3xl'
                  head={
                     <>
                        <th className={TH}>{t('Компания')}</th>
                        {reportDocs().map((doc) => (
                           <th key={doc} className={TH}>
                              <ReportDocTitle doc={doc} />
                           </th>
                        ))}
                        <th className={TH}>{t('Показатели в дашборде')}</th>
                     </>
                  }
               >
                  {companies.map((company) => {
                     const report = company.reports[quarter];
                     const owner = employeeOf(company.ownerId);
                     return (
                        <tr key={company.id}>
                           <td className={TD}>
                              <span className='flex items-center gap-2.5'>
                                 {owner && <Avatar name={owner.name} />}
                                 <span>
                                    <span className='block text-sm font-semibold'>
                                       {company.name}
                                    </span>
                                    <span className='text-ink-soft block text-xs whitespace-nowrap'>
                                       {personName(company.ownerId)}
                                    </span>
                                 </span>
                              </span>
                           </td>
                           {reportDocs().map((doc) => (
                              <td key={doc} className={TD}>
                                 {report?.received[doc] ? (
                                    <Badge tone='success'>{t('Получен')}</Badge>
                                 ) : late ? (
                                    <Badge tone='danger'>
                                       {t('Просрочен')}
                                    </Badge>
                                 ) : (
                                    <Badge>{t('Ожидается')}</Badge>
                                 )}
                                 <ReportFiles
                                    companyId={company.id}
                                    doc={doc}
                                    quarter={quarter}
                                 />
                              </td>
                           ))}
                           <td className={TD}>
                              {report?.metrics === 'check' ? (
                                 <>
                                    <button
                                       type='button'
                                       className='rounded-md'
                                       onClick={() => setChecking(company)}
                                    >
                                       <Badge tone='warning'>
                                          {t('Проверить')}
                                       </Badge>
                                    </button>
                                    {report.filledAt && (
                                       <div className='text-ink-soft mt-1 text-xs'>
                                          {t('Заполнено из шаблона {{date}}', {
                                             date: formatDate(report.filledAt),
                                          })}
                                       </div>
                                    )}
                                 </>
                              ) : report?.metrics === 'confirmed' ? (
                                 <Badge tone='success'>
                                    {t('Подтверждены')}
                                 </Badge>
                              ) : (
                                 <Badge tone='neutral'>—</Badge>
                              )}
                           </td>
                        </tr>
                     );
                  })}
               </Table>
               <p className='border-line bg-ground/70 text-ink-soft border-t px-5 py-3 text-xs'>
                  {t(
                     'Компании отправляют документы и показатели из кабинета основателя; аналитик проверяет и подтверждает показатели или вносит их сам.',
                  )}
               </p>
            </Card>

            <div className={STACK}>
               <Card
                  hint={t('{{count}} блок', { count: TEMPLATE_BLOCKS.length })}
                  title={t('Шаблон отчёта фонда')}
               >
                  <ol className='divide-line divide-y px-5 py-1'>
                     {TEMPLATE_BLOCKS.map((block, index) => (
                        <li key={block} className='flex gap-4 py-2.5'>
                           <span className='text-ink-soft w-3 tabular-nums'>
                              {index + 1}
                           </span>
                           {t(block)}
                        </li>
                     ))}
                  </ol>
               </Card>
               <Card title={t('Флаги риска — автоматически')}>
                  <ul className='flex flex-col gap-2 px-5 pt-4'>
                     {[
                        t('Runway меньше {{count}} месяц', {
                           count: flags.runway,
                        }),
                        flags.revenue === 0
                           ? t('Выручка упала квартал к кварталу')
                           : t('Выручка кв/кв ниже {{value}}%', {
                                value: flags.revenue,
                             }),
                        t('Churn выше {{value}}% за квартал', {
                           value: flags.churn,
                        }),
                        t('Отчёт не сдан через {{count}} день после срока', {
                           count: flags.reportLate,
                        }),
                     ].map((text) => (
                        <li key={text} className='flex items-center gap-2.5'>
                           <span
                              aria-hidden
                              className='bg-danger size-1.5 shrink-0 rounded-full'
                           />
                           {text}
                        </li>
                     ))}
                  </ul>
                  <p className='text-ink-soft px-5 pt-3 pb-4 text-xs'>
                     {t(
                        'Пороги задаются в Настройках. Флаг попадает в «Требуют решения» у директора.',
                     )}
                  </p>
               </Card>
            </div>
         </div>
         <MetricsDialog
            company={checking}
            quarter={quarter}
            onClose={() => setChecking(null)}
         />
      </>
   );
};

export default Reports;

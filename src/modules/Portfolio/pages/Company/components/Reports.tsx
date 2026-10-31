import ReportDocTitle from '@modules/Portfolio/components/ReportDocTitle';
import ReportFiles from '@modules/Portfolio/components/ReportFiles';
import {
   quarterLabel,
   recentQuarters,
   reportDocs,
} from '@modules/Portfolio/helpers';
import type { PortfolioData } from '@modules/Portfolio/hooks';
import { Badge, Card, Table, TD, TH } from '@shared/components';
import { formatDate, todayISO } from '@shared/helpers';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface ReportsProps {
   company: PortfolioCompany;
   cycle: PortfolioData['cycle'];
}

/* The quarterly reports' documents, in the data room: each quarter's
   documents with the day each came from the company's cabinet and its
   files, the newest quarter first. A document of the open quarter not sent
   by the deadline is late. */
const Reports = ({ company, cycle }: ReportsProps) => {
   const { t } = useTranslation('portfolio');
   const late = todayISO() > cycle.due;

   return (
      <Card title={t('Квартальная отчётность')}>
         <Table
            className='min-w-2xl'
            head={
               <>
                  <th className={TH}>{t('Квартал')}</th>
                  {reportDocs().map((doc) => (
                     <th key={doc} className={TH}>
                        <ReportDocTitle doc={doc} />
                     </th>
                  ))}
               </>
            }
         >
            {recentQuarters(cycle.quarter)
               .reverse()
               .map((quarter) => (
                  <tr key={quarter}>
                     <td className={clsx(TD, 'font-semibold')}>
                        {quarterLabel(t, quarter)}
                     </td>
                     {reportDocs().map((doc) => {
                        const day = company.reports[quarter]?.received[doc];
                        return (
                           <td key={doc} className={TD}>
                              {day ? (
                                 <>
                                    <Badge tone='success'>{t('Получен')}</Badge>
                                    <div className='text-ink-soft mt-1 text-xs'>
                                       {formatDate(day)}
                                    </div>
                                 </>
                              ) : late && quarter === cycle.quarter ? (
                                 <Badge tone='danger'>{t('Просрочен')}</Badge>
                              ) : (
                                 <Badge>{t('Ожидается')}</Badge>
                              )}
                              <ReportFiles
                                 companyId={company.id}
                                 doc={doc}
                                 quarter={quarter}
                              />
                           </td>
                        );
                     })}
                  </tr>
               ))}
         </Table>
         <p className='border-line text-ink-soft border-t px-4.5 py-2.5 text-xs'>
            {t(
               'Компания загружает отчёты в кабинете основателя; срок сдачи — {{date}}. Шаблоны документов — «Настройки → Портфель → Отчётность».',
               { date: formatDate(cycle.due) },
            )}
         </p>
      </Card>
   );
};

export default Reports;

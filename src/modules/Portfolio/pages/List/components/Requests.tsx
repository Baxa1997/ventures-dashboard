import AnswerDialog from '@modules/Portfolio/components/AnswerDialog';
import { PORTFOLIO_PATH, REQUEST_STATUSES } from '@modules/Portfolio/constants';
import { isOverdue, waitingDays } from '@modules/Portfolio/helpers';
import type { PortfolioData } from '@modules/Portfolio/hooks';
import { Badge, Card, NoData, Person, Table, TD, TH } from '@shared/components';
import { formatDate } from '@shared/helpers';
import type { CompanyRequest } from '@shared/types/portfolio.types';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface RequestsProps {
   data: PortfolioData;
   companyId?: string; // only this company's requests, on its card
}

// What the companies asked the fund for; open ones first.
const Requests = ({ data, companyId }: RequestsProps) => {
   const { t } = useTranslation('portfolio');
   const [answering, setAnswering] = useState<CompanyRequest | null>(null);
   const rows = data.requests
      .filter((request) => !companyId || request.companyId === companyId)
      .sort(
         (a, b) =>
            Number(a.status === 'closed') - Number(b.status === 'closed') ||
            a.openedAt.localeCompare(b.openedAt),
      );

   return (
      <Card className='flex-1'>
         {rows.length ? (
            <Table
               className='min-w-3xl'
               head={
                  <>
                     {!companyId && <th className={TH}>{t('Компания')}</th>}
                     <th className={TH}>{t('Запрос')}</th>
                     <th className={TH}>{t('Открыт')}</th>
                     <th className={TH}>{t('Статус')}</th>
                     <th className={TH}>{t('Ответственный')}</th>
                     <th className={TH}>
                        <span className='sr-only'>{t('Действие')}</span>
                     </th>
                  </>
               }
            >
               {rows.map((request) => {
                  const company = data.companies.find(
                     ({ id }) => id === request.companyId,
                  );
                  const status = REQUEST_STATUSES[request.status];
                  const late = isOverdue(request);
                  return (
                     <tr key={request.id}>
                        {!companyId && (
                           <td className={TD}>
                              <Link
                                 className='text-sm font-semibold hover:underline'
                                 to={`${PORTFOLIO_PATH}/${request.companyId}?tab=requests`}
                              >
                                 {company?.name}
                              </Link>
                           </td>
                        )}
                        <td className={TD}>
                           {request.title}
                           {(request.answer || request.note) && (
                              <div className='text-ink-soft mt-0.5 text-xs'>
                                 {request.answer || request.note}
                              </div>
                           )}
                        </td>
                        <td
                           className={clsx(
                              TD,
                              'whitespace-nowrap',
                              late ? 'text-danger' : 'text-ink-soft',
                           )}
                        >
                           {formatDate(request.openedAt)}
                           {request.status === 'waiting_fund' && (
                              <div className='text-xs'>
                                 {t('ждёт {{count}} день', {
                                    count: waitingDays(request),
                                 })}
                              </div>
                           )}
                        </td>
                        <td className={TD}>
                           <Badge tone={late ? 'danger' : status.tone}>
                              {t(status.label)}
                           </Badge>
                        </td>
                        <td className={TD}>
                           <Person id={request.ownerId} />
                        </td>
                        <td className={clsx(TD, 'text-right')}>
                           {request.status !== 'closed' && (
                              <button
                                 type='button'
                                 className='link'
                                 onClick={() => setAnswering(request)}
                              >
                                 {t('Ответить')}
                              </button>
                           )}
                        </td>
                     </tr>
                  );
               })}
            </Table>
         ) : (
            <NoData>{t('Запросов к фонду нет')}</NoData>
         )}
         <AnswerDialog request={answering} onClose={() => setAnswering(null)} />
      </Card>
   );
};

export default Requests;

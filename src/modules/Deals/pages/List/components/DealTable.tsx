import {
   countryText,
   dayOf,
   formatAmount,
   industryText,
   roundText,
   sourceLine,
   sumAmounts,
} from '@modules/Deals/helpers';
import {
   Badge,
   Card,
   CompanyMark,
   NoData,
   Table,
   TD,
   TH,
} from '@shared/components';
import { formatNumericDate, personName } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import clsx from 'clsx';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import {
   columnName,
   columnOf,
   columnTone,
   scoreClass,
   scoreOf,
} from '../helpers';

interface DealTableProps {
   deals: Deal[];
}

// «Таблица»: the startup, its stage, round and ask, its manager, the
// screening's score and the application; a row opens the deal's card.
const DealTable = ({ deals }: DealTableProps) => {
   const { t, i18n } = useTranslation('deals');
   const navigate = useNavigate();
   const language = i18n.resolvedLanguage ?? i18n.language;

   const open = (deal: Deal) => (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('a, button')) return;
      navigate(`/deals/${deal.id}`);
   };

   return (
      <Card>
         {deals.length ? (
            <Table
               className='min-w-220'
               head={
                  <>
                     <th className={TH}>{t('Стартап')}</th>
                     <th className={TH}>{t('Этап')}</th>
                     <th className={TH}>{t('Раунд и запрос')}</th>
                     <th className={TH}>{t('Менеджер')}</th>
                     <th className={clsx(TH, 'text-right')}>{t('Скоринг')}</th>
                     <th className={TH}>{t('Заявка')}</th>
                  </>
               }
            >
               {deals.map((deal) => {
                  const column = columnOf(deal);
                  const score = scoreOf(deal);
                  const owner = deal.ownerId || deal.proposedOwnerId;
                  return (
                     <tr
                        key={deal.id}
                        className='hover:bg-hover cursor-pointer'
                        onClick={open(deal)}
                     >
                        <td className={TD}>
                           <div className='flex min-w-60 items-center gap-2.5'>
                              <CompanyMark name={deal.company} />
                              <div className='min-w-0'>
                                 <Link
                                    className='font-semibold hover:underline'
                                    to={`/deals/${deal.id}`}
                                 >
                                    {deal.company}
                                 </Link>
                                 <div className='text-ink-faint text-xs'>
                                    {[industryText(deal), countryText(deal)]
                                       .filter(Boolean)
                                       .join(' · ')}
                                 </div>
                              </div>
                           </div>
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           <Badge tone={columnTone(column)}>
                              {columnName(t, column)}
                           </Badge>
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           <div>{roundText(deal) || '—'}</div>
                           <div className='text-ink-faint text-xs tabular-nums'>
                              {formatAmount(deal.amount, language)}
                           </div>
                        </td>
                        <td className={TD}>
                           {owner ? personName(owner) : '—'}
                        </td>
                        <td
                           className={clsx(
                              TD,
                              'text-right whitespace-nowrap tabular-nums',
                           )}
                        >
                           {score === null ? (
                              <span className='text-ink-faint'>—</span>
                           ) : (
                              <b className={scoreClass(score)}>
                                 {score.toFixed(1)}
                              </b>
                           )}
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           <div className='tabular-nums'>
                              {formatNumericDate(dayOf(deal.receivedAt))}
                           </div>
                           <div className='text-ink-faint text-xs'>
                              {sourceLine(t, deal) || '—'}
                           </div>
                        </td>
                     </tr>
                  );
               })}
            </Table>
         ) : (
            <NoData>{t('Сделок по этим условиям нет.')}</NoData>
         )}
         <div className='border-line text-ink-soft flex flex-wrap justify-between gap-x-4 gap-y-1 border-t px-4.5 py-2.5 text-xs'>
            <span>
               {t('{{count}} сделка · запрошено {{amount}}', {
                  count: deals.length,
                  amount: formatAmount(sumAmounts(deals), language),
               })}
            </span>
            <span>{t('Новые заявки приходят с сайта через форму Pitch Us')}</span>
         </div>
      </Card>
   );
};

export default DealTable;

import { RENT_TYPE, STATUS_INFO } from '@modules/Contracts/constants';
import { isEnding, typeColor } from '@modules/Contracts/helpers';
import { listName } from '@modules/Settings/services';
import {
   Badge,
   Card,
   ItemActions,
   NoData,
   Table,
   TD,
   TH,
} from '@shared/components';
import { SECTION_PATHS } from '@shared/constants';
import { formatNumericDate, formatUsd, personName } from '@shared/helpers';
import type { Contract } from '@shared/types/contracts.types';
import type { Deal } from '@shared/types/deals.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface ContractTableProps {
   contracts: Contract[];
   deals: Deal[];
   onOpen: (contract: Contract) => void;
   onDelete: (contract: Contract) => void;
}

// «Таблица», as the design draws it; a row opens the contract's form.
const ContractTable = ({
   contracts,
   deals,
   onOpen,
   onDelete,
}: ContractTableProps) => {
   const { t, i18n } = useTranslation('contracts');
   const language = i18n.resolvedLanguage ?? i18n.language;

   return (
      <Card>
         {contracts.length ? (
            <Table
               className='min-w-[60rem]'
               head={
                  <>
                     <th className={TH}>{t('Договор')}</th>
                     <th className={TH}>{t('Тип')}</th>
                     <th className={clsx(TH, 'text-right')}>{t('Сумма')}</th>
                     <th className={TH}>{t('Срок действия')}</th>
                     <th className={TH}>{t('Ответственный')}</th>
                     <th className={TH}>{t('Статус')}</th>
                     <th className={TH}>
                        <span className='sr-only'>{t('Действия')}</span>
                     </th>
                  </>
               }
            >
               {contracts.map((contract) => {
                  const deal = deals.find(({ id }) => id === contract.dealId);
                  const status = STATUS_INFO[contract.status];
                  return (
                     <tr
                        key={contract.id}
                        className='hover:bg-hover cursor-pointer'
                        onClick={() => onOpen(contract)}
                     >
                        <td className={TD}>
                           <button
                              type='button'
                              className='text-left font-semibold'
                              onClick={(event) => {
                                 event.stopPropagation();
                                 onOpen(contract);
                              }}
                           >
                              {contract.party}
                           </button>
                           <div className='text-ink-faint mt-0.5 text-xs'>
                              <b className='text-ink-soft tabular-nums'>
                                 {contract.number}
                              </b>
                              {' · '}
                              {contract.subject}
                              {deal && (
                                 <>
                                    {' · '}
                                    <Link
                                       className='link'
                                       to={`${SECTION_PATHS.deals}/${deal.id}`}
                                       onClick={(event) =>
                                          event.stopPropagation()
                                       }
                                    >
                                       {deal.company}
                                    </Link>
                                 </>
                              )}
                           </div>
                           {contract.decisionNote &&
                              contract.status === 'draft' && (
                                 <div className='text-danger mt-0.5 text-xs'>
                                    {t('Возвращён на доработку: {{note}}', {
                                       note: contract.decisionNote,
                                    })}
                                 </div>
                              )}
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           <Badge color={typeColor(contract.type)} tone='neutral'>
                              {listName('contractTypes', contract.type)}
                           </Badge>
                        </td>
                        <td
                           className={clsx(
                              TD,
                              'text-right whitespace-nowrap tabular-nums',
                           )}
                        >
                           {contract.amount
                              ? formatUsd(contract.amount, language)
                              : '—'}
                           {!!contract.amount &&
                              contract.type === RENT_TYPE && (
                                 <span className='text-ink-faint text-xs'>
                                    {' '}
                                    {t('/мес')}
                                 </span>
                              )}
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           <div>
                              {contract.signedDate ? (
                                 t('с {{date}}', {
                                    date: formatNumericDate(contract.signedDate),
                                 })
                              ) : (
                                 <span className='text-ink-faint'>
                                    {t('не подписан')}
                                 </span>
                              )}
                           </div>
                           <div
                              className={clsx(
                                 'mt-0.5 text-xs',
                                 isEnding(contract)
                                    ? 'text-danger'
                                    : 'text-ink-faint',
                              )}
                           >
                              {contract.validUntil
                                 ? t('до {{date}}', {
                                      date: formatNumericDate(
                                         contract.validUntil,
                                      ),
                                   })
                                 : t('бессрочно')}
                           </div>
                        </td>
                        <td className={TD}>{personName(contract.ownerId)}</td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           <Badge tone={status.tone}>{t(status.label)}</Badge>
                        </td>
                        <td
                           className={TD}
                           onClick={(event) => event.stopPropagation()}
                        >
                           <ItemActions
                              icons
                              name={contract.number}
                              onDelete={() => onDelete(contract)}
                              onEdit={() => onOpen(contract)}
                           />
                        </td>
                     </tr>
                  );
               })}
            </Table>
         ) : (
            <NoData>{t('Договоров по этим условиям нет.')}</NoData>
         )}
         <div className='border-line text-ink-soft flex flex-wrap justify-between gap-x-4 gap-y-1 border-t px-4.5 py-2.5 text-xs'>
            <span>{t('{{count}} договор', { count: contracts.length })}</span>
            <span>
               {t('Красным отмечены договоры, истекающие в ближайшие 60 дней')}
            </span>
         </div>
      </Card>
   );
};

export default ContractTable;

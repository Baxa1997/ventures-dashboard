import {
   countryText,
   dayOf,
   formatAmount,
   industryText,
   isOpen,
   roundText,
   sourceLine,
   stageKeys,
   sumAmounts,
} from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { listOf, nameOf } from '@modules/Settings/services';
import {
   Badge,
   BadgeSelect,
   Card,
   CompanyMark,
   InlineField,
   NoData,
   Table,
   TD,
   TH,
} from '@shared/components';
import { TEAM } from '@shared/constants';
import {
   formatNumericDate,
   parseAmount,
   personName,
   shortName,
} from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
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
   // a stage or a status picked in a row: the same rules as a drop on the board
   onMove: (deal: Deal, column: string) => void;
}

// The columns a deal in work can be sent to from its row.
const MOVE_STATUSES = ['paused', 'withdrawn', 'rejected'];

/* «Таблица»: the startup, its stage, round and ask, its manager, the
   screening's score and the application. A deal in work is changed in its
   row — the stage (through the move's own window), the round, the amount
   and the manager; a click elsewhere on the row opens the deal's card. */
const DealTable = ({ deals: rows, onMove }: DealTableProps) => {
   const { t, i18n } = useTranslation('deals');
   const navigate = useNavigate();
   const user = useCurrentUser();
   const language = i18n.resolvedLanguage ?? i18n.language;

   const openRow = (deal: Deal) => (event: MouseEvent) => {
      if (
         (event.target as HTMLElement).closest(
            'a, button, input, select, textarea',
         )
      )
         return;
      navigate(`/deals/${deal.id}`);
   };

   const columns = [
      ...stageKeys(),
      ...MOVE_STATUSES.map((status) => `status:${status}`),
   ];
   const rounds = listOf('rounds').map((item) => ({
      value: item.key,
      label: nameOf(item),
   }));
   const team = TEAM.map(({ id, name }) => ({
      value: id,
      label: shortName(name),
   }));

   return (
      <Card>
         {rows.length ? (
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
               {rows.map((deal) => {
                  const column = columnOf(deal);
                  const score = scoreOf(deal);
                  const owner = deal.ownerId || deal.proposedOwnerId;
                  const open = isOpen(deal);
                  return (
                     <tr
                        key={deal.id}
                        className='hover:bg-hover cursor-pointer'
                        onClick={(event) => openRow(deal)(event)}
                     >
                        <td className={TD}>
                           <div className='flex min-w-60 items-center gap-2.5'>
                              <CompanyMark logo={deal.logo} name={deal.company} />
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
                           {open && deal.status === 'active' ? (
                              <BadgeSelect
                                 label={t('Этап')}
                                 options={columns.map((value) => ({
                                    value,
                                    label: columnName(t, value),
                                    tone: columnTone(value),
                                 }))}
                                 value={column}
                                 onChange={(next) => onMove(deal, next)}
                              />
                           ) : (
                              <Badge tone={columnTone(column)}>
                                 {columnName(t, column)}
                              </Badge>
                           )}
                        </td>
                        <td className={clsx(TD, 'min-w-36')}>
                           {open ? (
                              <>
                                 <InlineField
                                    kind='select'
                                    label={t('Раунд')}
                                    options={rounds}
                                    placeholder={roundText(deal) || '—'}
                                    value={deal.roundStage}
                                    onSave={(roundStage) =>
                                       deals.updateDetails(
                                          deal.id,
                                          { roundStage },
                                          user.id,
                                       )
                                    }
                                 />
                                 <InlineField
                                    className='text-ink-soft text-xs tabular-nums'
                                    format={(value) =>
                                       formatAmount(Number(value), language)
                                    }
                                    inputMode='numeric'
                                    label={t('Запрашиваемая сумма')}
                                    validate={(next) =>
                                       parseAmount(next) > 0
                                          ? undefined
                                          : t('Укажите сумму больше нуля', {
                                               ns: 'validation',
                                            })
                                    }
                                    value={String(deal.amount)}
                                    onSave={(next) =>
                                       deals.updateDetails(
                                          deal.id,
                                          { amount: parseAmount(next) },
                                          user.id,
                                       )
                                    }
                                 />
                              </>
                           ) : (
                              <div className='whitespace-nowrap'>
                                 <div>{roundText(deal) || '—'}</div>
                                 <div className='text-ink-faint text-xs tabular-nums'>
                                    {formatAmount(deal.amount, language)}
                                 </div>
                              </div>
                           )}
                        </td>
                        <td className={clsx(TD, 'min-w-32')}>
                           {open ? (
                              <InlineField
                                 kind='select'
                                 label={t('Менеджер')}
                                 options={[
                                    { value: '', label: t('Не назначен') },
                                    ...team,
                                 ]}
                                 value={owner}
                                 onSave={(ownerId) =>
                                    deals.setOwner(deal.id, ownerId)
                                 }
                              />
                           ) : owner ? (
                              personName(owner)
                           ) : (
                              '—'
                           )}
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
                  count: rows.length,
                  amount: formatAmount(sumAmounts(rows), language),
               })}
            </span>
            <span>{t('Новые заявки приходят с сайта через форму Pitch Us')}</span>
         </div>
      </Card>
   );
};

export default DealTable;

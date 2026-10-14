import OrderDialog from '@modules/Contracts/components/OrderDialog';
import ReturnActDialog from '@modules/Contracts/components/ReturnActDialog';
import {
   ACT_PAYMENT_DAYS,
   ACT_STATUSES,
   CARD_TAB_LABELS,
   CARD_TABS,
   type CardTab,
   CONTRACTS_PATH,
   LIST_TAB_LABELS,
   ORDER_STATUSES,
   RESTRICTION_LABELS,
   STATUSES,
   TYPE_LABELS,
   TYPE_SECTIONS,
} from '@modules/Contracts/constants';
import {
   attentionOf,
   formatSum,
   limitUse,
   monthName,
   pendingAct,
} from '@modules/Contracts/helpers';
import { useContracts } from '@modules/Contracts/hooks';
import contracts from '@modules/Contracts/services';
import { useDeals } from '@modules/Deals/hooks';
import {
   Badge,
   Button,
   Card,
   CheckList,
   FactList,
   Loading,
   NoData,
   PageBody,
   PageHeader,
   STACK,
   Table,
   Tabs,
   TD,
   TH,
} from '@shared/components';
import { DIRECTOR_ID, SECTION_PATHS } from '@shared/constants';
import { formatDate, formatDayYear, personName } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type {
   Contract,
   ContractAct,
   ContractDetails,
} from '@shared/types/contracts.types';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';

const toTab = (value: string | null): CardTab =>
   CARD_TABS.find((tab) => tab === value) ?? 'overview';

// A contract's card. The address keeps the open tab (?tab=acts).
const ContractCard = () => {
   const { t } = useTranslation('contracts');
   const { id } = useParams();
   const all = useContracts();
   const contract = all?.find((item) => item.id === id);

   if (!all || !contract)
      return (
         <>
            <PageHeader
               section={<Link to={CONTRACTS_PATH}>{t('Договоры')}</Link>}
               title={all ? t('Договор не найден') : t('Договоры')}
            />
            {all ? (
               <PageBody className='flex flex-col'>
                  <Card className='grid flex-1 place-items-center'>
                     <NoData>
                        <Link className='link' to={CONTRACTS_PATH}>
                           {t('К реестру договоров')}
                        </Link>
                     </NoData>
                  </Card>
               </PageBody>
            ) : (
               <Loading />
            )}
         </>
      );

   return <ContractView key={contract.id} contract={contract} />;
};

const ContractView = ({ contract }: { contract: Contract }) => {
   const { t } = useTranslation('contracts');
   const user = useCurrentUser();
   const [params, setParams] = useSearchParams();
   const tab = toTab(params.get('tab'));
   const [ordering, setOrdering] = useState(false);
   const [returning, setReturning] = useState<ContractAct | null>(null);
   const { details } = contract;
   const act = pendingAct(details);
   const section = TYPE_SECTIONS[contract.type];
   const status = STATUSES[contract.status];
   const director = user.id === DIRECTOR_ID;

   const approve = (item: ContractAct) =>
      contracts.approveAct(
         contract.id,
         item.id,
         t('Акт за {{month}} согласован', { month: monthName(item.month) }),
      );

   const counts: Partial<Record<CardTab, number>> = details
      ? {
           orders: details.orders.length,
           acts: details.acts.length,
           documents: details.documents.length,
        }
      : {};

   return (
      <>
         <PageHeader
            actions={
               details && (
                  <>
                     <Button variant='ghost' onClick={() => setOrdering(true)}>
                        {t('Новая заявка')}
                     </Button>
                     {act && (
                        <Button
                           disabled={!director}
                           title={
                              director ? undefined : t('Согласует директор')
                           }
                           onClick={() => approve(act)}
                        >
                           {t('Согласовать акт за {{month}}', {
                              month: dayjs(`${act.month}-01`).format('MMMM'),
                           })}
                        </Button>
                     )}
                  </>
               )
            }
            badge={
               <Badge tone={status.tone}>
                  {details && contract.status === 'active'
                     ? t('{{status}} · до {{date}}', {
                          status: t(status.label),
                          date: dayjs(details.validUntil).format('D MMMM YYYY'),
                       })
                     : t(status.label)}
               </Badge>
            }
            meta={details?.meta ?? contract.party}
            section={
               <>
                  <Link className='hover:underline' to={CONTRACTS_PATH}>
                     {t('Договоры')}
                  </Link>
                  {' · '}
                  <Link
                     className='hover:underline'
                     to={`${CONTRACTS_PATH}?tab=${section}`}
                  >
                     {t(LIST_TAB_LABELS[section])}
                  </Link>
               </>
            }
            title={contract.title}
         >
            <Tabs
               active={tab}
               items={CARD_TABS.map((key) => ({
                  id: key,
                  label: t(CARD_TAB_LABELS[key]),
                  count: counts[key],
               }))}
               label={contract.title}
               onChange={(next) =>
                  setParams(next === 'overview' ? {} : { tab: next }, {
                     replace: true,
                  })
               }
            />
         </PageHeader>
         <PageBody className='flex flex-col'>
            {!details ? (
               <Plain contract={contract} tab={tab} />
            ) : (
               <>
                  {tab === 'overview' && (
                     <Overview
                        contract={contract}
                        details={details}
                        director={director}
                        onApprove={approve}
                        onOrder={() => setOrdering(true)}
                        onReturn={setReturning}
                     />
                  )}
                  {tab === 'orders' && <Orders details={details} />}
                  {tab === 'acts' && (
                     <Acts
                        details={details}
                        director={director}
                        onApprove={approve}
                        onReturn={setReturning}
                     />
                  )}
                  {tab === 'documents' && <Documents details={details} />}
                  {tab === 'history' && <History details={details} />}
               </>
            )}
         </PageBody>
         {details && (
            <>
               <OrderDialog
                  contract={contract}
                  open={ordering}
                  onClose={() => setOrdering(false)}
               />
               <ReturnActDialog
                  act={returning}
                  contractId={contract.id}
                  onClose={() => setReturning(null)}
               />
            </>
         )}
      </>
   );
};

interface OverviewProps {
   contract: Contract;
   details: ContractDetails;
   director: boolean;
   onApprove: (act: ContractAct) => void;
   onReturn: (act: ContractAct) => void;
   onOrder: () => void;
}

const Overview = ({
   contract,
   details,
   director,
   onApprove,
   onReturn,
   onOrder,
}: OverviewProps) => {
   const { t, i18n } = useTranslation('contracts');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const { deals } = useDeals();
   const sum = (value: number) =>
      t('{{amount}} млн сум', { amount: formatSum(value, language) });
   const use = limitUse(details);
   const act = pendingAct(details) ?? details.acts[0];
   const support = details.tariffs.find(({ monthly }) => monthly);
   const legal = details.tariffs.find(({ id }) => id === 'legal_dd');
   const lastAct = [...details.acts].sort((a, b) =>
      b.date.localeCompare(a.date),
   )[0];
   const related = contract.dealIds
      .map((dealId) => deals.find(({ id }) => id === dealId))
      .filter((deal) => deal !== undefined);

   return (
      <div className='gap-section grid flex-1 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]'>
         <div className={STACK}>
            <Card
               hint={t('{{amount}} с НДС', { amount: sum(details.limit) })}
               title={t('Годовой лимит')}
            >
               <div className='px-5 py-4'>
                  <div className='flex flex-wrap items-end justify-between gap-4'>
                     <div>
                        <p className='text-ink-soft text-meta'>
                           {t('Использовано')}
                        </p>
                        <p className='mt-1 text-xl font-bold'>
                           {sum(use.used)} ·{' '}
                           {formatSum(use.share * 100, language)}%
                        </p>
                     </div>
                     <div className='text-right'>
                        <p className='text-ink-soft text-meta'>
                           {t('Остаток')}
                        </p>
                        <p className='mt-1 text-xl font-bold'>
                           {sum(use.left)}
                        </p>
                     </div>
                  </div>
                  <div
                     className='bg-track mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full [&>span]:animate-fill'
                     aria-hidden
                  >
                     <span
                        className='bg-accent'
                        style={{
                           width: `${(use.actsSum / details.limit) * 100}%`,
                        }}
                     />
                     <span
                        className='bg-accent-soft'
                        style={{
                           width: `${(use.ordersSum / details.limit) * 100}%`,
                        }}
                     />
                  </div>
                  <ul className='text-ink-soft mt-2.5 flex flex-wrap gap-x-6 gap-y-1 text-xs'>
                     <li className='flex items-center gap-1.5'>
                        <span
                           aria-hidden
                           className='bg-accent size-2.5 rounded-[3px]'
                        />
                        {t(
                           'Юр. сопровождение · {{count}} акт по {{tariff}} = {{total}}',
                           {
                              count: use.acts.length,
                              tariff: formatSum(support?.amount ?? 0, language),
                              total: formatSum(use.actsSum, language),
                           },
                        )}
                     </li>
                     <li className='flex items-center gap-1.5'>
                        <span
                           aria-hidden
                           className='bg-accent-soft size-2.5 rounded-[3px]'
                        />
                        {t(
                           'Legal DD · {{count}} заявка по {{tariff}} = {{total}}',
                           {
                              count: details.orders.length,
                              tariff: formatSum(legal?.amount ?? 0, language),
                              total: formatSum(use.ordersSum, language),
                           },
                        )}
                     </li>
                  </ul>
                  <p className='text-ink-soft mt-3 text-xs'>
                     {t(
                        'Срок использования лимита — 12 месяцев с даты подписания. Использование на макете посчитано по тарифам договора; число актов и заявок примерное.',
                     )}
                  </p>
               </div>
            </Card>
            <Card
               hint={t('приложение № 1 · фиксированные')}
               title={t('Тарифы')}
            >
               <ul className='divide-line divide-y px-5'>
                  {details.tariffs.map((tariff) => (
                     <li
                        key={tariff.id}
                        className='flex justify-between gap-4 py-3'
                     >
                        <span>{tariff.title}</span>
                        <span className='font-semibold whitespace-nowrap tabular-nums'>
                           {tariff.monthly
                              ? t('{{amount}} млн сум в месяц', {
                                   amount: formatSum(tariff.amount, language),
                                })
                              : sum(tariff.amount)}
                        </span>
                     </li>
                  ))}
               </ul>
            </Card>
            <Card
               action={
                  <button type='button' className='link' onClick={onOrder}>
                     {t('Новая заявка')}
                  </button>
               }
               hint={details.orders.length}
               title={t('Заявки по договору')}
            >
               <OrderList details={details} />
            </Card>
         </div>

         <div className={STACK}>
            {act && (
               <Card
                  hint={t(ACT_STATUSES[act.status].label).toLowerCase()}
                  title={t('Акт за {{month}}', { month: monthName(act.month) })}
               >
                  <div className='px-5 py-4'>
                     <div className='flex justify-between gap-4'>
                        <span className='text-ink-soft'>{act.title}</span>
                        <span className='font-semibold whitespace-nowrap'>
                           {sum(act.amount)}
                        </span>
                     </div>
                     <CheckList
                        className='mt-3 gap-2.5'
                        items={[
                           ...act.checks.map(({ id, text, done }) => ({
                              id,
                              text,
                              note: '',
                              state: done
                                 ? ('done' as const)
                                 : ('open' as const),
                           })),
                           {
                              id: 'director',
                              text: t('Согласован директором'),
                              note: '',
                              state:
                                 act.status === 'approved' ||
                                 act.status === 'paid'
                                    ? 'done'
                                    : 'open',
                           },
                        ]}
                     />
                     {act.status === 'pending' && (
                        <div className='mt-4 flex flex-wrap gap-2.5'>
                           <Button
                              disabled={!director}
                              title={
                                 director ? undefined : t('Согласует директор')
                              }
                              onClick={() => onApprove(act)}
                           >
                              {t('Согласовать')}
                           </Button>
                           <Button
                              variant='ghost'
                              onClick={() => onReturn(act)}
                           >
                              {t('Вернуть')}
                           </Button>
                        </div>
                     )}
                     {act.status === 'returned' && act.note && (
                        <p className='text-danger mt-3 text-xs'>{act.note}</p>
                     )}
                     <p className='text-ink-soft mt-3 text-xs'>
                        {t(
                           'После согласования акт уходит в бухгалтерию на оплату, срок — до {{date}}.',
                           {
                              date: formatDate(
                                 dayjs(act.date)
                                    .add(ACT_PAYMENT_DAYS, 'day')
                                    .format('YYYY-MM-DD'),
                              ),
                           },
                        )}
                     </p>
                  </div>
               </Card>
            )}
            <Card title={t('Ограничения договора')}>
               <dl className='divide-line divide-y px-5'>
                  {details.restrictions.map(({ key, value, warning }) => (
                     <div key={key} className='py-3'>
                        <dt className='text-ink-soft text-xs'>
                           {t(RESTRICTION_LABELS[key])}
                        </dt>
                        <dd
                           className={clsx(
                              'mt-0.5',
                              warning && 'text-warning-ink',
                           )}
                        >
                           {value}
                        </dd>
                     </div>
                  ))}
               </dl>
            </Card>
            <Card title={t('Связанные объекты')}>
               <FactList
                  className='px-5 py-1'
                  divided
                  labelWidth='6rem'
                  rows={[
                     {
                        label: t('Закупка'),
                        value: (
                           <Link
                              className='hover:underline'
                              to={SECTION_PATHS.procurement}
                           >
                              {details.procurement}
                           </Link>
                        ),
                     },
                     {
                        label: t('Сделки'),
                        value: related.length
                           ? related.map((deal, index) => (
                                <Fragment key={deal.id}>
                                   {index > 0 && ', '}
                                   <Link
                                      className='hover:underline'
                                      to={`/deals/${deal.id}`}
                                   >
                                      {deal.company}
                                   </Link>
                                </Fragment>
                             ))
                           : '—',
                     },
                     {
                        label: t('Платежи'),
                        value: lastAct
                           ? t('{{count}} акт · последний {{date}}', {
                                count: use.acts.length,
                                date: formatDate(lastAct.date),
                             })
                           : '—',
                     },
                  ]}
               />
            </Card>
         </div>
      </div>
   );
};

const OrderList = ({ details }: { details: ContractDetails }) => {
   const { t } = useTranslation('contracts');
   if (!details.orders.length)
      return <NoData>{t('Заявок по договору ещё не было')}</NoData>;
   return (
      <ul className='divide-line divide-y px-5'>
         {details.orders.map((order) => (
            <li
               key={order.id}
               className='flex items-start justify-between gap-4 py-3.5'
            >
               <div>
                  <div className='font-semibold'>
                     {order.dealId ? (
                        <Link
                           className='hover:underline'
                           to={`/deals/${order.dealId}?tab=dd`}
                        >
                           {order.title}
                        </Link>
                     ) : (
                        order.title
                     )}
                  </div>
                  <div className='text-ink-soft mt-0.5 text-xs'>
                     {order.note ||
                        t('Заявка от {{date}}', {
                           date: formatDate(order.date),
                        })}
                  </div>
               </div>
               <Badge tone={ORDER_STATUSES[order.status].tone}>
                  {t(ORDER_STATUSES[order.status].label)}
               </Badge>
            </li>
         ))}
      </ul>
   );
};

const Orders = ({ details }: { details: ContractDetails }) => {
   const { t } = useTranslation('contracts');
   return (
      <Card className='flex-1' title={t('Заявки по договору')}>
         <OrderList details={details} />
      </Card>
   );
};

interface ActsProps {
   details: ContractDetails;
   director: boolean;
   onApprove: (act: ContractAct) => void;
   onReturn: (act: ContractAct) => void;
}

const Acts = ({ details, director, onApprove, onReturn }: ActsProps) => {
   const { t, i18n } = useTranslation('contracts');
   const language = i18n.resolvedLanguage ?? i18n.language;
   return (
      <Card className='flex-1'>
         <Table
            className='min-w-2xl'
            head={
               <>
                  <th className={TH}>{t('Акт')}</th>
                  <th className={TH}>{t('Получен')}</th>
                  <th className={clsx(TH, 'text-right')}>{t('Сумма')}</th>
                  <th className={TH}>{t('Статус')}</th>
                  <th className={TH}>
                     <span className='sr-only'>{t('Действие')}</span>
                  </th>
               </>
            }
         >
            {details.acts.map((act) => (
               <tr key={act.id}>
                  <td className={TD}>
                     <div className='font-semibold capitalize'>
                        {monthName(act.month)}
                     </div>
                     <div className='text-ink-soft mt-0.5 text-xs'>
                        {act.title}
                     </div>
                  </td>
                  <td className={clsx(TD, 'text-ink-soft')}>
                     {formatDate(act.date)}
                  </td>
                  <td className={clsx(TD, 'text-right tabular-nums')}>
                     {t('{{amount}} млн сум', {
                        amount: formatSum(act.amount, language),
                     })}
                  </td>
                  <td className={TD}>
                     <Badge tone={ACT_STATUSES[act.status].tone}>
                        {t(ACT_STATUSES[act.status].label)}
                     </Badge>
                  </td>
                  <td className={clsx(TD, 'text-right whitespace-nowrap')}>
                     {act.status === 'pending' && (
                        <>
                           <button
                              type='button'
                              className='link disabled:text-ink-faint disabled:no-underline'
                              disabled={!director}
                              onClick={() => onApprove(act)}
                           >
                              {t('Согласовать')}
                           </button>
                           <button
                              type='button'
                              className='link ml-4'
                              onClick={() => onReturn(act)}
                           >
                              {t('Вернуть')}
                           </button>
                        </>
                     )}
                  </td>
               </tr>
            ))}
         </Table>
      </Card>
   );
};

const Documents = ({ details }: { details: ContractDetails }) => {
   const { t } = useTranslation('contracts');
   return (
      <Card className='flex-1'>
         <Table
            head={
               <>
                  <th className={TH}>{t('Документ')}</th>
                  <th className={TH}>{t('Дата')}</th>
               </>
            }
         >
            {details.documents.map((document) => (
               <tr key={document.id}>
                  <td className={clsx(TD, 'font-medium')}>{document.title}</td>
                  <td className={clsx(TD, 'text-ink-soft')}>
                     {formatDayYear(document.date)}
                  </td>
               </tr>
            ))}
         </Table>
         <p className='border-line text-ink-soft mt-auto border-t px-5 py-3 text-xs'>
            {t(
               'Файлы появятся после переноса из Notion: хранилища файлов пока нет.',
            )}
         </p>
      </Card>
   );
};

const History = ({ details }: { details: ContractDetails }) => (
   <Card className='flex-1'>
      <ol className='divide-line divide-y px-5'>
         {details.history.map((entry, index) => (
            <li key={`${entry.date}-${index}`} className='flex gap-6 py-3'>
               <span className='text-ink-soft w-24 shrink-0'>
                  {formatDayYear(entry.date)}
               </span>
               <span>{entry.text}</span>
            </li>
         ))}
      </ol>
   </Card>
);

// The card of a contract the sample has only the register's line for.
const Plain = ({ contract, tab }: { contract: Contract; tab: CardTab }) => {
   const { t, i18n } = useTranslation('contracts');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const { deals } = useDeals();
   if (tab !== 'overview')
      return (
         <Card className='flex-1'>
            <NoData>
               {t(
                  'Этот раздел карточки заполнится при переносе договора из Notion.',
               )}
            </NoData>
         </Card>
      );
   return (
      <Card className='flex-1' title={t('Договор')}>
         <FactList
            className='px-5 py-1'
            divided
            labelWidth='12rem'
            rows={[
               { label: t('Контрагент и предмет'), value: contract.party },
               { label: t('Тип'), value: t(TYPE_LABELS[contract.type]) },
               { label: t('Сумма или лимит'), value: contract.amount },
               { label: t('Срок'), value: contract.term },
               {
                  label: t('Что требует внимания'),
                  value: attentionOf(t, contract, language),
               },
               {
                  label: t('Ответственный'),
                  value: personName(contract.ownerId),
               },
               {
                  label: t('Сделки'),
                  value: contract.dealIds.length
                     ? contract.dealIds.map((dealId, index) => (
                          <Fragment key={dealId}>
                             {index > 0 && ', '}
                             <Link
                                className='hover:underline'
                                to={`/deals/${dealId}`}
                             >
                                {deals.find(({ id }) => id === dealId)
                                   ?.company ?? dealId}
                             </Link>
                          </Fragment>
                       ))
                     : '—',
               },
            ]}
         />
         <p className='text-ink-soft px-5 pb-4 text-xs'>
            {t(
               'Тарифы, заявки, акты и документы этого договора появятся после переноса из Notion.',
            )}
         </p>
      </Card>
   );
};

export default ContractCard;

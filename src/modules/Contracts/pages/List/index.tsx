import NewContractDialog from '@modules/Contracts/components/NewContractDialog';
import {
   CONTRACTS_PATH,
   LIST_TAB_LABELS,
   LIST_TABS,
   type ListTab,
   STATUSES,
   TAB_TYPES,
   TYPE_LABELS,
} from '@modules/Contracts/constants';
import { attentionOf, isExpiring } from '@modules/Contracts/helpers';
import { useContracts } from '@modules/Contracts/hooks';
import {
   Badge,
   Button,
   Card,
   FilterBar,
   FilterSelect,
   Loading,
   NoData,
   PageBody,
   PageHeader,
   SearchField,
   Table,
   TD,
   TH,
   Tabs,
} from '@shared/components';
import { TEAM } from '@shared/constants';
import { downloadCsv, personName } from '@shared/helpers';
import type { ContractStatus } from '@shared/types/contracts.types';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';

const ALL = 'all';

const toTab = (value: string | null): ListTab =>
   LIST_TABS.find((tab) => tab === value) ?? 'all';

/* Договоры: one register instead of four Notion bases. A contract with acts
   says by itself what needs doing; the others keep the line moved from
   Notion. The address keeps the tab (?tab=services). */
const ContractsList = () => {
   const { t, i18n } = useTranslation('contracts');
   const { t: tLayout } = useTranslation('layout');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const navigate = useNavigate();
   const contracts = useContracts();
   const [params, setParams] = useSearchParams();
   const tab = toTab(params.get('tab'));
   const [search, setSearch] = useState('');
   const [status, setStatus] = useState<ContractStatus | typeof ALL>(ALL);
   const [ownerId, setOwnerId] = useState(ALL);
   const [expiring, setExpiring] = useState<'all' | 'soon'>('all');
   const [creating, setCreating] = useState(false);
   const title = t('Договоры');

   if (!contracts)
      return (
         <>
            <PageHeader section={tLayout('Фонд')} title={title} />
            <Loading />
         </>
      );

   const inTab = (id: ListTab) =>
      contracts.filter(
         ({ type }) => !TAB_TYPES[id] || TAB_TYPES[id]?.includes(type),
      );
   const query = search.trim().toLowerCase();
   const rows = inTab(tab).filter(
      (contract) =>
         (status === ALL || contract.status === status) &&
         (ownerId === ALL || contract.ownerId === ownerId) &&
         (expiring === 'all' || isExpiring(contract)) &&
         (!query ||
            `${contract.title} ${contract.party} ${contract.attention}`
               .toLowerCase()
               .includes(query)),
   );
   const owners = TEAM.filter(({ id }) =>
      contracts.some((contract) => contract.ownerId === id),
   );

   const exportRows = () =>
      downloadCsv('dogovory.csv', [
         [
            t('Договор'),
            t('Контрагент'),
            t('Тип'),
            t('Сумма или лимит'),
            t('Срок'),
            t('Что требует внимания'),
            t('Статус'),
            t('Ответственный'),
         ],
         ...rows.map((contract) => [
            contract.title,
            contract.party,
            t(TYPE_LABELS[contract.type]),
            contract.amount,
            contract.term,
            attentionOf(t, contract, language),
            t(STATUSES[contract.status].label),
            personName(contract.ownerId),
         ]),
      ]);

   return (
      <>
         <PageHeader
            actions={
               <>
                  <Button variant='ghost' onClick={exportRows}>
                     {t('Экспорт')}
                  </Button>
                  <Button onClick={() => setCreating(true)}>
                     {t('Новый договор')}
                  </Button>
               </>
            }
            meta={t(
               'Один реестр вместо четырёх баз Notion: инвестиционные соглашения, услуги и ГПХ, управление капиталом, партнёрства и MoU',
            )}
            section={tLayout('Фонд')}
            title={title}
         >
            <Tabs
               active={tab}
               items={LIST_TABS.map((id) => ({
                  id,
                  label: t(LIST_TAB_LABELS[id]),
                  count: inTab(id).length,
               }))}
               label={title}
               onChange={(next) =>
                  setParams(next === 'all' ? {} : { tab: next }, {
                     replace: true,
                  })
               }
            />
         </PageHeader>
         <PageBody className='flex flex-col'>
            <FilterBar>
               <SearchField
                  label={t('Номер, контрагент, предмет')}
                  value={search}
                  onChange={setSearch}
               />
               <FilterSelect
                  label={t('Статус')}
                  options={[
                     { value: ALL, label: t('Все статусы') },
                     ...(Object.keys(STATUSES) as ContractStatus[]).map(
                        (value) => ({
                           value,
                           label: t(STATUSES[value].label),
                        }),
                     ),
                  ]}
                  showLabel={false}
                  value={status}
                  onChange={setStatus}
               />
               <FilterSelect
                  label={t('Ответственный')}
                  options={[
                     { value: ALL, label: t('Все ответственные') },
                     ...owners.map(({ id }) => ({
                        value: id,
                        label: personName(id),
                     })),
                  ]}
                  showLabel={false}
                  value={ownerId}
                  onChange={setOwnerId}
               />
               <FilterSelect
                  accent={expiring === 'soon'}
                  label={t('Срок')}
                  options={[
                     { value: 'all', label: t('Все сроки') },
                     { value: 'soon', label: t('Истекают в 90 дней') },
                  ]}
                  showLabel={false}
                  value={expiring}
                  onChange={setExpiring}
               />
            </FilterBar>
            <Card className='mt-section flex flex-1 flex-col'>
               {rows.length ? (
                  <Table
                     className='min-w-5xl'
                     head={
                        <>
                           <th className={TH}>{t('Договор и контрагент')}</th>
                           <th className={TH}>{t('Тип')}</th>
                           <th className={TH}>{t('Сумма или лимит')}</th>
                           <th className={TH}>{t('Срок')}</th>
                           <th className={TH}>{t('Что требует внимания')}</th>
                           <th className={TH}>{t('Статус')}</th>
                        </>
                     }
                  >
                     {rows.map((contract) => {
                        const state = STATUSES[contract.status];
                        return (
                           <tr
                              key={contract.id}
                              className='hover:bg-ground/60 cursor-pointer'
                              onClick={() =>
                                 navigate(`${CONTRACTS_PATH}/${contract.id}`)
                              }
                           >
                              <td className={TD}>
                                 <Link
                                    className='text-sm font-semibold hover:underline'
                                    to={`${CONTRACTS_PATH}/${contract.id}`}
                                    onClick={(event) => event.stopPropagation()}
                                 >
                                    {contract.title}
                                 </Link>
                                 <div className='text-ink-soft mt-0.5 text-xs'>
                                    {contract.party}
                                 </div>
                              </td>
                              <td
                                 className={clsx(TD, 'text-ink-soft max-w-36')}
                              >
                                 {t(TYPE_LABELS[contract.type])}
                              </td>
                              <td
                                 className={clsx(
                                    TD,
                                    contract.details && 'font-semibold',
                                 )}
                              >
                                 {contract.amount}
                              </td>
                              <td
                                 className={clsx(TD, 'text-ink-soft max-w-32')}
                              >
                                 {contract.term}
                              </td>
                              <td className={clsx(TD, 'w-[24%] text-xs')}>
                                 {attentionOf(t, contract, language)}
                              </td>
                              <td className={TD}>
                                 <Badge tone={state.tone}>
                                    {t(state.label)}
                                 </Badge>
                              </td>
                           </tr>
                        );
                     })}
                  </Table>
               ) : (
                  <NoData>{t('Договоров по этим условиям нет')}</NoData>
               )}
            </Card>
            <p className='text-ink-soft mt-section text-xs'>
               {t(
                  'Источник: базы Notion «Реестр инвестиционных соглашений», «Реестр стратегических партнёрств», «Партнёрства и договоры», «HR: документы, приказы и договоры». Поля «—» не заполнены в Notion и требуют сверки при переносе.',
               )}
            </p>
         </PageBody>
         <NewContractDialog
            open={creating}
            onClose={() => setCreating(false)}
            onCreated={(contract) =>
               navigate(`${CONTRACTS_PATH}/${contract.id}`)
            }
         />
      </>
   );
};

export default ContractsList;

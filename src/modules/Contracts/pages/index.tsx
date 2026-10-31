import ContractDialog from '@modules/Contracts/components/ContractDialog';
import {
   CONTRACT_STATUSES,
   INVEST_TYPE,
   LIST_VIEW_LABELS,
   LIST_VIEWS,
   STATUS_INFO,
   type ListView,
} from '@modules/Contracts/constants';
import { useContracts } from '@modules/Contracts/hooks';
import contractsService from '@modules/Contracts/services';
import { roundText } from '@modules/Deals/helpers';
import { listOf, nameOf } from '@modules/Settings/services';
import {
   Button,
   ConfirmDialog,
   FilterSelect,
   Loading,
   Notice,
   PageBody,
   PageHeader,
   SearchField,
   Segmented,
} from '@shared/components';
import { formatMoneyShort } from '@shared/helpers';
import { useAction, useCurrentUser } from '@shared/hooks';
import type {
   Contract,
   ContractInput,
   ContractStatus,
} from '@shared/types/contracts.types';
import { Columns3, type LucideIcon, Plus, Table2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { ContractBoard, ContractTable } from './components';

const VIEW_ICONS: Record<ListView, LucideIcon> = {
   table: Table2,
   board: Columns3,
};

/* Договоры, as the design draws them: the fund's contracts as a table or a
   board by status, with a form over the page. The address keeps the view
   (?view=board). ?open=<id> opens a contract, as Мой день does; ?deal=<id>
   starts one from a deal, as its card does. */
const ContractsPage = () => {
   const { t } = useTranslation('contracts');
   const { t: tLayout } = useTranslation('layout');
   const user = useCurrentUser();
   const data = useContracts();
   const [params, setParams] = useSearchParams();
   const view = LIST_VIEWS.find((one) => one === params.get('view')) ?? 'table';
   const [type, setType] = useState('');
   const [status, setStatus] = useState<ContractStatus | ''>('');
   const [query, setQuery] = useState('');
   const [editing, setEditing] = useState<Contract | null>(null);
   const [adding, setAdding] = useState<Partial<ContractInput> | null>(null);
   const [removing, setRemoving] = useState<Contract | null>(null);
   const title = t('Договоры');

   const moving = useAction(
      (contract: Contract, next: ContractStatus) =>
         contractsService.setStatus(contract.id, next),
      {
         success: (contract, next) =>
            t('Договор {{number}}: {{status}}', {
               number: contract.number,
               status: t(STATUS_INFO[next].label),
            }),
      },
   );

   // what the address asks to open, once the contracts are read
   const toOpen = params.get('open');
   const fromDeal = params.get('deal');
   useEffect(() => {
      if (!data || (!toOpen && !fromDeal)) return;
      const deal = data.deals.find(({ id }) => id === fromDeal);
      const contract = data.contracts.find(({ id }) => id === toOpen);
      if (contract) setEditing(contract);
      if (deal)
         setAdding({
            party: deal.legalName || deal.company,
            subject: [t('Договор инвестирования'), roundText(deal)]
               .filter(Boolean)
               .join(', '),
            type: INVEST_TYPE,
            amount: deal.amount,
            ownerId: deal.ownerId || user.id,
            dealId: deal.id,
         });
      setParams(view === 'table' ? {} : { view }, { replace: true });
   }, [data, toOpen, fromDeal, view, setParams, t, user.id]);

   if (!data)
      return (
         <>
            <PageHeader section={tLayout('Фонд')} title={title} />
            <Loading />
         </>
      );

   const signed = data.contracts
      .filter((item) => item.status === 'signed' && item.type === INVEST_TYPE)
      .reduce((sum, item) => sum + item.amount, 0);
   const search = query.trim().toLowerCase();
   const found = data.contracts.filter(
      (item) =>
         (!type || item.type === type) &&
         (!status || item.status === status) &&
         (!search ||
            `${item.number} ${item.party} ${item.subject}`
               .toLowerCase()
               .includes(search)),
   );

   return (
      <>
         <PageHeader
            actions={
               <Button
                  disabled={!data.stored}
                  hint={t('Добавить договор в реестр')}
                  onClick={() => setAdding({})}
               >
                  <Plus aria-hidden />
                  {t('Новый договор')}
               </Button>
            }
            meta={t(
               'Реестр договоров фонда: инвестиционные, NDA, аренда и услуги. Подписанные инвестиционные договоры: {{sum}}.',
               { sum: formatMoneyShort(signed) },
            )}
            section={tLayout('Фонд')}
            title={title}
         />
         <PageBody className='flex flex-col'>
            {!data.stored && (
               <Notice warning className='mb-3.5'>
                  {t(
                     'Договоры ещё нельзя вести: в ucode нет таблицы (партия 18 в docs/ucode-migration.md).',
                  )}
               </Notice>
            )}
            <div className='mb-3.5 flex flex-wrap items-center gap-2'>
               <Segmented
                  items={LIST_VIEWS.map((id) => ({
                     id,
                     label: t(LIST_VIEW_LABELS[id]),
                     icon: VIEW_ICONS[id],
                  }))}
                  label={t('Вид')}
                  value={view}
                  onChange={(id) =>
                     setParams(id === 'table' ? {} : { view: id }, {
                        replace: true,
                     })
                  }
               />
               <FilterSelect
                  label={t('Тип')}
                  options={[
                     { value: '', label: t('Все типы') },
                     ...listOf('contractTypes', true).map((item) => ({
                        value: item.key,
                        label: nameOf(item),
                     })),
                  ]}
                  showLabel={false}
                  value={type}
                  onChange={setType}
               />
               <FilterSelect
                  label={t('Статус')}
                  options={[
                     { value: '' as const, label: t('Все статусы') },
                     ...CONTRACT_STATUSES.map((value) => ({
                        value,
                        label: t(STATUS_INFO[value].label),
                     })),
                  ]}
                  showLabel={false}
                  value={status}
                  onChange={setStatus}
               />
               <div className='w-full sm:ml-auto sm:w-72'>
                  <SearchField
                     label={t('Номер, контрагент, предмет')}
                     value={query}
                     onChange={setQuery}
                  />
               </div>
            </div>
            {view === 'table' ? (
               <ContractTable
                  contracts={found}
                  deals={data.deals}
                  onDelete={setRemoving}
                  onOpen={setEditing}
               />
            ) : (
               <ContractBoard
                  contracts={found}
                  only={status}
                  onMove={moving.run}
                  onOpen={setEditing}
               />
            )}
         </PageBody>
         <ContractDialog
            all={data.contracts}
            contract={editing}
            deals={data.deals}
            initial={adding ?? undefined}
            open={editing !== null || adding !== null}
            onClose={() => {
               setEditing(null);
               setAdding(null);
            }}
         />
         <ConfirmDialog
            open={removing !== null}
            subtitle={removing?.party}
            title={t('Удалить договор {{number}}?', {
               number: removing?.number ?? '',
            })}
            onClose={() => setRemoving(null)}
            onConfirm={async () => {
               if (removing) await contractsService.remove(removing.id);
               setRemoving(null);
            }}
         >
            <p>
               {t(
                  'Договор исчезнет из реестра, из «Моего дня» согласующего и из карточки компании.',
               )}
            </p>
         </ConfirmDialog>
      </>
   );
};

export default ContractsPage;

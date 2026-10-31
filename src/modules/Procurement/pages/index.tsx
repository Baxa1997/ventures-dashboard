import ApproveDialog from '@modules/Procurement/components/ApproveDialog';
import ProcurementDialog from '@modules/Procurement/components/ProcurementDialog';
import {
   LIST_VIEW_LABELS,
   LIST_VIEWS,
   type ListView,
} from '@modules/Procurement/constants';
import { isClosed, nextStageOf } from '@modules/Procurement/helpers';
import { useProcurement } from '@modules/Procurement/hooks';
import service, { type SaveOutcome } from '@modules/Procurement/services';
import {
   listName,
   listOf,
   nameOf,
   vendorName,
} from '@modules/Settings/services';
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
import { formatMoneyShort, personName } from '@shared/helpers';
import { toast } from '@shared/helpers/toast';
import { useCurrentUser, useRequest } from '@shared/hooks';
import type { Procurement } from '@shared/types/procurement.types';
import { Columns3, type LucideIcon, Plus, Table2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { ProcurementBoard, ProcurementTable } from './components';

const VIEW_ICONS: Record<ListView, LucideIcon> = {
   table: Table2,
   board: Columns3,
};

/* Закупки, as the design draws them: requests from the first ask through the
   approval and the vendor to the payment, as a table or a board by stage. A
   request over its category's limit stops on the approval stage until the
   general director decides, here or in Мой день. The address keeps the view
   (?view=board); ?open=<id> opens a request, as Мой день does. */
const ProcurementPage = () => {
   const { t } = useTranslation('procurement');
   const { t: tLayout } = useTranslation('layout');
   const user = useCurrentUser();
   const data = useProcurement();
   const [params, setParams] = useSearchParams();
   const view = LIST_VIEWS.find((one) => one === params.get('view')) ?? 'table';
   const [category, setCategory] = useState('');
   const [query, setQuery] = useState('');
   const [editing, setEditing] = useState<Procurement | null>(null);
   const [adding, setAdding] = useState(false);
   const [approving, setApproving] = useState<Procurement | null>(null);
   const [removing, setRemoving] = useState<Procurement | null>(null);
   const moving = useRequest({ success: false });
   const title = t('Закупки');

   const toOpen = params.get('open');
   useEffect(() => {
      if (!data || !toOpen) return;
      const request = data.requests.find(({ id }) => id === toOpen);
      if (request) setEditing(request);
      setParams(view === 'table' ? {} : { view }, { replace: true });
   }, [data, toOpen, view, setParams]);

   // says what came of a move, and opens what it needs next
   const move = (request: Procurement, to: string) =>
      moving.run(async () => {
         const plan = await service.move(request.id, to, user.id);
         if (plan.kind === 'moved')
            toast.success(t('Этап: {{stage}}', { stage: listName('procStages', to) }));
         if (plan.kind === 'sent')
            toast.success(
               t(
                  'Сумма выше лимита категории: закупка ждёт согласования ({{name}})',
                  { name: personName(plan.approverId) },
               ),
            );
         if (plan.kind === 'waits')
            toast.error(
               t(
                  'Закупка ждёт согласования: {{name}}. Следующий этап откроется после решения.',
                  { name: personName(plan.approverId) },
               ),
            );
         if (plan.kind === 'need_vendor') {
            toast.error(t('Сначала выберите поставщика'));
            setEditing(request);
         }
         if (plan.kind === 'decide') setApproving(request);
      });

   const saved = (outcome: SaveOutcome) => {
      if (outcome.kind === 'decide') setApproving(outcome.request);
      else if (outcome.kind === 'sent')
         toast.success(
            t(
               'Сумма выше лимита категории: закупка ждёт согласования ({{name}})',
               { name: personName(outcome.approverId) },
            ),
         );
      else toast.success(t('Заявка сохранена'));
   };

   if (!data)
      return (
         <>
            <PageHeader section={tLayout('Фонд')} title={title} />
            <Loading />
         </>
      );

   const open = data.requests.filter((request) => !isClosed(request));
   const search = query.trim().toLowerCase();
   const found = data.requests.filter(
      (request) =>
         (!category || request.category === category) &&
         (!search ||
            `${request.title} ${vendorName(request.vendorId)}`
               .toLowerCase()
               .includes(search)),
   );

   return (
      <>
         <PageHeader
            actions={
               <Button disabled={!data.stored} onClick={() => setAdding(true)}>
                  <Plus aria-hidden />
                  {t('Новая заявка')}
               </Button>
            }
            meta={t(
               'Заявки на закупку товаров и услуг: от заявки и согласования до договора и оплаты. В работе: {{count}} на {{sum}}.',
               {
                  count: open.length,
                  sum: formatMoneyShort(
                     open.reduce((sum, { amount }) => sum + amount, 0),
                  ),
               },
            )}
            section={tLayout('Фонд')}
            title={title}
         />
         <PageBody className='flex flex-col'>
            {!data.stored && (
               <Notice warning className='mb-3.5'>
                  {t(
                     'Закупки ещё нельзя вести: в ucode нет таблицы (партия 18 в docs/ucode-migration.md).',
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
                  label={t('Категория')}
                  options={[
                     { value: '', label: t('Все категории') },
                     ...listOf('procCategories', true).map((item) => ({
                        value: item.key,
                        label: nameOf(item),
                     })),
                  ]}
                  showLabel={false}
                  value={category}
                  onChange={setCategory}
               />
               <div className='w-full sm:ml-auto sm:w-72'>
                  <SearchField
                     label={t('Закупка или поставщик')}
                     value={query}
                     onChange={setQuery}
                  />
               </div>
            </div>
            {view === 'table' ? (
               <ProcurementTable
                  requests={found}
                  onDelete={setRemoving}
                  onNext={(request) => {
                     const next = nextStageOf(request);
                     if (next) move(request, next.key);
                  }}
                  onOpen={setEditing}
               />
            ) : (
               <ProcurementBoard
                  requests={found}
                  onMove={move}
                  onOpen={setEditing}
               />
            )}
         </PageBody>
         <ProcurementDialog
            open={editing !== null || adding}
            request={editing}
            onClose={() => {
               setEditing(null);
               setAdding(false);
            }}
            onSaved={saved}
         />
         <ApproveDialog request={approving} onClose={() => setApproving(null)} />
         <ConfirmDialog
            open={removing !== null}
            subtitle={
               removing && listName('procCategories', removing.category)
            }
            title={t('Удалить заявку «{{title}}»?', {
               title: removing?.title ?? '',
            })}
            onClose={() => setRemoving(null)}
            onConfirm={async () => {
               if (removing) await service.remove(removing.id);
               setRemoving(null);
            }}
         >
            <p>{t('Заявка исчезнет из реестра и из «Моего дня» согласующего.')}</p>
         </ConfirmDialog>
      </>
   );
};

export default ProcurementPage;

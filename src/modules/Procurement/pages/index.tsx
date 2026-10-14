import { CONTRACTS_PATH } from '@modules/Contracts/constants';
import NewProcurementDialog from '@modules/Procurement/components/NewProcurementDialog';
import {
   COMMISSION_MIN,
   EVALUATION_STEP,
   METHOD_LABELS,
   type ProcurementTab,
   ROLE_LABELS,
   STAGES,
   TAB_LABELS,
   TABS,
} from '@modules/Procurement/constants';
import procurements, {
   type ProcurementState,
} from '@modules/Procurement/services';
import { COMMISSION_ORDER } from '@modules/Procurement/services/sample';
import {
   Avatar,
   Badge,
   Button,
   buttonClass,
   Card,
   Loading,
   NoData,
   PageBody,
   PageHeader,
   Table,
   TD,
   TH,
   Tabs,
} from '@shared/components';
import { SECTION_PATHS, TEAM } from '@shared/constants';
import { formatDayYear, personName } from '@shared/helpers';
import { useServiceData } from '@shared/hooks';
import type { Procurement } from '@shared/types/procurement.types';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

const toTab = (value: string | null): ProcurementTab =>
   TABS.find((tab) => tab === value) ?? 'procurements';

const load = () => procurements.getState();
const subscribe = (listener: () => void) => procurements.subscribe(listener);

/* Закупки: the tenders with their steps under the procurement rules, the
   commission and its protocols, the suppliers. The address keeps the tab. */
const ProcurementPage = () => {
   const { t } = useTranslation('procurement');
   const { t: tLayout } = useTranslation('layout');
   const data = useServiceData(load, subscribe);
   const [params, setParams] = useSearchParams();
   const tab = toTab(params.get('tab'));
   const [selectedId, setSelectedId] = useState<string | null>(null);
   const [creating, setCreating] = useState(false);
   const title = t('Закупки');

   if (!data)
      return (
         <>
            <PageHeader section={tLayout('Фонд')} title={title} />
            <Loading />
         </>
      );

   const counts: Record<ProcurementTab, number> = {
      procurements: data.procurements.length,
      commission: data.totals.protocols,
      suppliers: data.totals.suppliers,
   };
   const selected =
      data.procurements.find(({ id }) => id === selectedId) ??
      data.procurements[0];

   return (
      <>
         <PageHeader
            actions={
               <>
                  <Link
                     className={buttonClass('ghost')}
                     to={`${SECTION_PATHS.documents}?doc=procurement-rules`}
                  >
                     {t('Порядок закупок')}
                  </Link>
                  <Button onClick={() => setCreating(true)}>
                     {t('Новая закупка')}
                  </Button>
               </>
            }
            meta={[
               t('Порядок закупок в редакции протокола НС № 1'),
               t('закупочная комиссия по приказу {{order}}', {
                  order: COMMISSION_ORDER,
               }),
               t('площадка etender (UZEX)'),
            ].join(' · ')}
            section={tLayout('Фонд')}
            title={title}
         >
            <Tabs
               active={tab}
               items={TABS.map((id) => ({
                  id,
                  label: t(TAB_LABELS[id]),
                  count: counts[id],
               }))}
               label={title}
               onChange={(next) =>
                  setParams(next === 'procurements' ? {} : { tab: next }, {
                     replace: true,
                  })
               }
            />
         </PageHeader>
         <PageBody className='flex flex-col'>
            {tab === 'procurements' && (
               <>
                  <Card>
                     <Table
                        className='min-w-4xl'
                        head={
                           <>
                              <th className={TH}>{t('Предмет закупки')}</th>
                              <th className={TH}>{t('Способ')}</th>
                              <th className={TH}>{t('Начальная цена')}</th>
                              <th className={TH}>{t('Этап')}</th>
                              <th className={TH}>{t('Результат')}</th>
                           </>
                        }
                     >
                        {data.procurements.map((procurement) => (
                           <tr
                              key={procurement.id}
                              aria-selected={procurement.id === selected?.id}
                              className={clsx(
                                 'cursor-pointer',
                                 procurement.id === selected?.id
                                    ? 'bg-accent-tint/60'
                                    : 'hover:bg-ground/60',
                              )}
                              onClick={() => setSelectedId(procurement.id)}
                           >
                              <td className={TD}>
                                 <button
                                    type='button'
                                    className='text-left text-sm font-semibold'
                                 >
                                    {procurement.title}
                                 </button>
                                 <div className='text-ink-soft mt-0.5 text-xs'>
                                    {procurement.scope}
                                 </div>
                              </td>
                              <td className={clsx(TD, 'text-ink-soft')}>
                                 {t(METHOD_LABELS[procurement.method])}
                              </td>
                              <td
                                 className={clsx(
                                    TD,
                                    'font-medium whitespace-nowrap',
                                 )}
                              >
                                 {procurement.price}
                              </td>
                              <td className={TD}>
                                 <Badge tone={STAGES[procurement.stage].tone}>
                                    {t(STAGES[procurement.stage].label)}
                                 </Badge>
                              </td>
                              <td className={clsx(TD, 'max-w-56 text-xs')}>
                                 {procurement.contractId ? (
                                    <Link
                                       className='hover:underline'
                                       to={`${CONTRACTS_PATH}/${procurement.contractId}`}
                                       onClick={(event) =>
                                          event.stopPropagation()
                                       }
                                    >
                                       {procurement.result}
                                    </Link>
                                 ) : (
                                    procurement.result || '—'
                                 )}
                              </td>
                           </tr>
                        ))}
                     </Table>
                  </Card>
                  <div className='mt-section gap-section grid flex-1 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]'>
                     {selected && <Steps data={data} procurement={selected} />}
                     <Commission data={data} />
                  </div>
               </>
            )}
            {tab === 'commission' && <Protocols data={data} />}
            {tab === 'suppliers' && <Suppliers data={data} />}
         </PageBody>
         <NewProcurementDialog
            open={creating}
            onClose={() => setCreating(false)}
            onCreated={(procurement) => setSelectedId(procurement.id)}
         />
      </>
   );
};

// The six steps of a tender; the next one can be marked done here.
const Steps = ({
   data,
   procurement,
}: {
   data: ProcurementState;
   procurement: Procurement;
}) => {
   const { t } = useTranslation('procurement');
   const next = procurement.steps.find(({ done }) => !done);
   const short = data.commission.length < COMMISSION_MIN;

   return (
      <Card
         action={
            <button
               type='button'
               disabled
               className='link disabled:text-ink-faint disabled:cursor-not-allowed disabled:no-underline'
               title={t('Файлы появятся вместе с хранилищем документов')}
            >
               {t('Открыть ТЗ и КД')}
            </button>
         }
         title={t('{{title}} — этапы закупки', { title: procurement.title })}
      >
         <ol className='divide-line divide-y px-5'>
            {procurement.steps.map((step, index) => {
               const blocked = step.id === EVALUATION_STEP && short;
               return (
                  <li key={step.id} className='flex items-start gap-3 py-3'>
                     {step.done ? (
                        <span className='bg-success-ink mt-px grid size-5 shrink-0 place-items-center rounded-full text-white'>
                           <Check
                              aria-hidden
                              className='size-3'
                              strokeWidth={3}
                           />
                        </span>
                     ) : (
                        <span className='border-line-strong text-ink-soft mt-px grid size-5 shrink-0 place-items-center rounded-full border text-[11px]'>
                           {index + 1}
                        </span>
                     )}
                     <div className='min-w-0 flex-1'>
                        <div className={clsx(step.done && 'font-semibold')}>
                           {step.title}
                        </div>
                        {step.note && (
                           <div className='text-ink-soft mt-0.5 text-xs'>
                              {step.note}
                           </div>
                        )}
                     </div>
                     {step.id === next?.id && (
                        <button
                           type='button'
                           className='link disabled:text-ink-faint disabled:cursor-not-allowed disabled:no-underline'
                           disabled={blocked}
                           title={
                              blocked
                                 ? t(
                                      'В комиссии меньше {{count}} человек — заседание провести нельзя',
                                      { count: COMMISSION_MIN },
                                   )
                                 : undefined
                           }
                           onClick={() =>
                              procurements.completeStep(procurement.id, step.id)
                           }
                        >
                           {t('Этап пройден')}
                        </button>
                     )}
                  </li>
               );
            })}
         </ol>
      </Card>
   );
};

const Commission = ({ data }: { data: ProcurementState }) => {
   const { t } = useTranslation('procurement');
   return (
      <Card
         hint={t('{{count}} человек', { count: data.commission.length })}
         title={t('Закупочная комиссия')}
      >
         <ul className='divide-line divide-y px-5'>
            {data.commission.map(({ employeeId, role }) => {
               const employee = TEAM.find(({ id }) => id === employeeId);
               return (
                  <li
                     key={employeeId}
                     className='flex items-center gap-3 py-2.5'
                  >
                     {employee && <Avatar name={employee.name} />}
                     <div>
                        <div className='font-medium'>
                           {personName(employeeId)}
                        </div>
                        <div className='text-ink-soft text-xs'>
                           {t(ROLE_LABELS[role])}
                        </div>
                     </div>
                  </li>
               );
            })}
         </ul>
         <p className='text-ink-soft px-5 pb-4 text-xs'>
            {t(
               'Основание: приказ {{order}}. Если состав станет меньше {{count}} человек, система не даст провести заседание комиссии.',
               { order: COMMISSION_ORDER, count: COMMISSION_MIN },
            )}
         </p>
      </Card>
   );
};

const Protocols = ({ data }: { data: ProcurementState }) => {
   const { t } = useTranslation('procurement');
   return (
      <div className='gap-section grid flex-1 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]'>
         <Card
            className='flex flex-col self-stretch'
            title={t('Протоколы комиссии')}
         >
            <Table
               head={
                  <>
                     <th className={TH}>{t('Дата')}</th>
                     <th className={TH}>{t('Закупка')}</th>
                     <th className={TH}>{t('Решение')}</th>
                  </>
               }
            >
               {data.protocols.map((protocol) => (
                  <tr key={protocol.id}>
                     <td className={clsx(TD, 'whitespace-nowrap')}>
                        {formatDayYear(protocol.date)}
                     </td>
                     <td className={TD}>
                        {
                           data.procurements.find(
                              ({ id }) => id === protocol.procurementId,
                           )?.title
                        }
                     </td>
                     <td className={TD}>{protocol.decision}</td>
                  </tr>
               ))}
            </Table>
            <p className='border-line text-ink-soft mt-auto border-t px-5 py-3 text-xs'>
               {t(
                  'В образце {{shown}} из {{total}} протоколов: остальные перенесут из Notion.',
                  {
                     shown: data.protocols.length,
                     total: data.totals.protocols,
                  },
               )}
            </p>
         </Card>
         <Commission data={data} />
      </div>
   );
};

const Suppliers = ({ data }: { data: ProcurementState }) => {
   const { t } = useTranslation('procurement');
   return (
      <Card className='flex flex-1 flex-col'>
         {data.suppliers.length ? (
            <Table
               head={
                  <>
                     <th className={TH}>{t('Поставщик')}</th>
                     <th className={TH}>{t('Что поставляет')}</th>
                     <th className={TH}>{t('Договор')}</th>
                  </>
               }
            >
               {data.suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                     <td className={clsx(TD, 'font-semibold')}>
                        {supplier.name}
                     </td>
                     <td className={TD}>{supplier.what}</td>
                     <td className={TD}>
                        {supplier.contractId ? (
                           <Link
                              className='link'
                              to={`${CONTRACTS_PATH}/${supplier.contractId}`}
                           >
                              {t('Открыть договор')}
                           </Link>
                        ) : (
                           '—'
                        )}
                     </td>
                  </tr>
               ))}
            </Table>
         ) : (
            <NoData />
         )}
         <p className='border-line text-ink-soft mt-auto border-t px-5 py-3 text-xs'>
            {t(
               'В образце {{shown}} из {{total}} поставщиков: остальные перенесут из Notion.',
               {
                  shown: data.suppliers.length,
                  total: data.totals.suppliers,
               },
            )}
         </p>
      </Card>
   );
};

export default ProcurementPage;

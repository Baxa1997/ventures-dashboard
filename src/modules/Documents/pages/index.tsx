import DocumentDialog from '@modules/Documents/components/DocumentDialog';
import {
   APPROVERS,
   ISSUE_STATUSES,
   STATUSES,
   TAB_LABELS,
   TABS,
} from '@modules/Documents/constants';
import documents from '@modules/Documents/services';
import {
   Badge,
   Button,
   Card,
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
import { formatDayYear } from '@shared/helpers';
import { useServiceData } from '@shared/hooks';
import type { DocCategory } from '@shared/types/documents.types';
import clsx from 'clsx';
import { FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

const toTab = (value: string | null): DocCategory =>
   TABS.find((tab) => tab === value) ?? 'corporate';

const load = () => documents.getState();
const subscribe = (listener: () => void) => documents.subscribe(listener);

/* Документы фонда: charter documents, regulations and policies, orders, HR
   documents and templates — the version in force of each. Other sections
   link here with ?doc=<id>; that document is marked on its tab. */
const DocumentsPage = () => {
   const { t } = useTranslation('documents');
   const { t: tLayout } = useTranslation('layout');
   const data = useServiceData(load, subscribe);
   const [params, setParams] = useSearchParams();
   const marked = params.get('doc');
   const markedDoc = data?.documents.find(({ id }) => id === marked);
   const tab =
      markedDoc && !params.get('tab')
         ? markedDoc.category
         : toTab(params.get('tab'));
   const [adding, setAdding] = useState<'order' | 'document' | null>(null);
   const markedRow = useRef<HTMLTableRowElement>(null);
   const title = t('Документы фонда');

   useEffect(() => {
      markedRow.current?.scrollIntoView({ block: 'center' });
   }, [markedDoc]);

   if (!data)
      return (
         <>
            <PageHeader section={tLayout('Фонд')} title={title} />
            <Loading />
         </>
      );

   const inTab = (category: DocCategory) =>
      data.documents.filter((document) => document.category === category);
   const count = (category: DocCategory) =>
      data.totals[category] ?? inTab(category).length;
   const rows = inTab(tab);
   const total = count(tab);
   const orders = inTab('orders');

   return (
      <>
         <PageHeader
            actions={
               <>
                  <Button variant='ghost' onClick={() => setAdding('order')}>
                     {t('Новый приказ')}
                  </Button>
                  <Button onClick={() => setAdding('document')}>
                     {t('Загрузить документ')}
                  </Button>
               </>
            }
            meta={[
               t('Учредительные документы, положения, политики и приказы'),
               t(
                  'действующая редакция всегда одна, предыдущие — в истории версий',
               ),
            ].join(' · ')}
            section={tLayout('Фонд')}
            title={title}
         >
            <Tabs
               active={tab}
               items={TABS.map((id) => ({
                  id,
                  label: t(TAB_LABELS[id]),
                  count: count(id),
               }))}
               label={title}
               onChange={(next) =>
                  setParams(next === 'corporate' ? {} : { tab: next }, {
                     replace: true,
                  })
               }
            />
         </PageHeader>
         <PageBody className='gap-section grid flex-1 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]'>
            <div className='flex min-w-0 flex-col self-stretch'>
               <Card className='flex flex-1 flex-col'>
                  {rows.length ? (
                     <Table
                        className='min-w-xl'
                        head={
                           <>
                              <th className={TH}>
                                 {tab === 'orders'
                                    ? t('Приказ')
                                    : t('Документ')}
                              </th>
                              <th className={TH}>
                                 {tab === 'orders'
                                    ? t('Дата')
                                    : t('Кем утверждён')}
                              </th>
                              <th className={TH}>{t('Статус')}</th>
                           </>
                        }
                     >
                        {rows.map((document) => (
                           <tr
                              key={document.id}
                              ref={
                                 document.id === marked ? markedRow : undefined
                              }
                              className={clsx(
                                 document.id === marked && 'bg-accent-tint/60',
                              )}
                           >
                              <td className={TD}>
                                 <span className='flex gap-3'>
                                    <FileText
                                       aria-hidden
                                       className='text-ink-soft mt-0.5 size-4 shrink-0'
                                    />
                                    <span>
                                       <span className='block font-semibold'>
                                          {document.title}
                                       </span>
                                       {document.note && (
                                          <span className='text-ink-soft mt-0.5 block text-xs'>
                                             {document.note}
                                          </span>
                                       )}
                                       {document.file && (
                                          <span className='text-accent mt-0.5 block text-xs'>
                                             {t('Файл: {{name}}', {
                                                name: document.file,
                                             })}
                                          </span>
                                       )}
                                    </span>
                                 </span>
                              </td>
                              <td
                                 className={clsx(
                                    TD,
                                    'text-ink-soft whitespace-nowrap',
                                 )}
                              >
                                 {tab === 'orders'
                                    ? document.date &&
                                      formatDayYear(document.date)
                                    : t(APPROVERS[document.approvedBy])}
                              </td>
                              <td className={TD}>
                                 <Badge tone={STATUSES[document.status].tone}>
                                    {t(STATUSES[document.status].label)}
                                 </Badge>
                              </td>
                           </tr>
                        ))}
                     </Table>
                  ) : (
                     <NoData>
                        {t(
                           'Документы этого раздела ещё не перенесены из Notion',
                        )}
                     </NoData>
                  )}
                  {rows.length < total && (
                     <p className='border-line text-ink-soft mt-auto border-t px-5 py-3 text-xs'>
                        {t(
                           'В образце {{shown}} из {{total}}: остальные перенесут из базы «HR: документы, приказы и договоры» в Notion.',
                           {
                              shown: rows.length,
                              total,
                           },
                        )}
                     </p>
                  )}
               </Card>
               <p className='text-ink-soft mt-section text-xs'>
                  {t(
                     'Перечень и статусы — из баз «Корпоративные документы» и «Корпоративное управление» в Notion. Кем утверждён — предположение по типу документа, сверить при переносе.',
                  )}
               </p>
            </div>
            <div className={STACK}>
               <Card
                  hint={data.issues.length}
                  title={t('Открытые вопросы управления')}
               >
                  <ul className='divide-line divide-y px-5'>
                     {data.issues.map((issue) => (
                        <li key={issue.id} className='py-3.5'>
                           <div className='font-semibold'>{issue.title}</div>
                           <div className='text-ink-soft mt-0.5 text-xs'>
                              {issue.note}
                           </div>
                           <div className='mt-2'>
                              <Badge tone={ISSUE_STATUSES[issue.status].tone}>
                                 {t(ISSUE_STATUSES[issue.status].label)}
                              </Badge>
                           </div>
                        </li>
                     ))}
                  </ul>
               </Card>
               <Card
                  action={
                     <button
                        type='button'
                        className='link'
                        onClick={() =>
                           setParams({ tab: 'orders' }, { replace: true })
                        }
                     >
                        {t('Все приказы')}
                     </button>
                  }
                  title={t('Последние приказы')}
               >
                  <ul className='divide-line divide-y px-5'>
                     {orders.slice(0, 3).map((order) => (
                        <li key={order.id} className='py-3'>
                           <div className='font-semibold'>{order.title}</div>
                           <div className='text-ink-soft mt-0.5 text-xs'>
                              {order.note}
                           </div>
                        </li>
                     ))}
                  </ul>
               </Card>
            </div>
         </PageBody>
         <DocumentDialog
            mode={adding}
            tab={tab}
            onClose={() => setAdding(null)}
            onAdded={(document) =>
               setParams(
                  { tab: document.category, doc: document.id },
                  { replace: true },
               )
            }
         />
      </>
   );
};

export default DocumentsPage;

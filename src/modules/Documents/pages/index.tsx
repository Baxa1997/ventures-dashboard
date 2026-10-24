import DocumentDialog, {
   type DocumentDialogMode,
} from '@modules/Documents/components/DocumentDialog';
import IssueDialog from '@modules/Documents/components/IssueDialog';
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
   FilterSelect,
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
import { formatDayYear, personName } from '@shared/helpers';
import { useAction, useServiceData } from '@shared/hooks';
import type { DocCategory, IssueStatus } from '@shared/types/documents.types';
import clsx from 'clsx';
import { ExternalLink, FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

const toTab = (value: string | null): DocCategory =>
   TABS.find((tab) => tab === value) ?? 'corporate';

const load = () => documents.getState();
const subscribe = (listener: () => void) => documents.subscribe(listener);

/* Документы фонда: charter documents, regulations and policies, orders, HR
   documents and templates, each with its version in force and a link to its
   file; and the open questions of corporate governance. Other sections may
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
   const [dialog, setDialog] = useState<DocumentDialogMode | null>(null);
   const [addingIssue, setAddingIssue] = useState(false);
   const markedRow = useRef<HTMLTableRowElement>(null);
   const title = t('Документы фонда');
   const changing = useAction(
      (id: string, status: IssueStatus) => documents.setIssueStatus(id, status),
      { success: t('Статус вопроса сохранён') },
   );
   // the issue whose status is being saved
   const [changingId, setChangingId] = useState('');

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
   const rows = inTab(tab);
   const orders = inTab('orders');
   const issues = data.issues.filter(({ status }) => status !== 'resolved');

   return (
      <>
         <PageHeader
            actions={
               <>
                  <Button variant='ghost' onClick={() => setDialog('order')}>
                     {t('Новый приказ')}
                  </Button>
                  <Button onClick={() => setDialog('document')}>
                     {t('Добавить документ')}
                  </Button>
               </>
            }
            meta={[
               t('Учредительные документы, положения, политики и приказы'),
               t('у каждого документа одна действующая редакция'),
            ].join(' · ')}
            section={tLayout('Фонд')}
            title={title}
         >
            <Tabs
               active={tab}
               items={TABS.map((id) => ({
                  id,
                  label: t(TAB_LABELS[id]),
                  count: inTab(id).length,
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
            <Card className='flex min-w-0 flex-col self-stretch'>
               {rows.length ? (
                  <Table
                     className='min-w-xl'
                     head={
                        <>
                           <th className={TH}>
                              {tab === 'orders' ? t('Приказ') : t('Документ')}
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
                           ref={document.id === marked ? markedRow : undefined}
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
                                 <span className='min-w-0'>
                                    <button
                                       type='button'
                                       className='hover:text-accent block text-left font-semibold'
                                       onClick={() => setDialog(document)}
                                    >
                                       {document.title}
                                    </button>
                                    {document.note && (
                                       <span className='text-ink-soft mt-0.5 block text-xs'>
                                          {document.note}
                                       </span>
                                    )}
                                    {document.link && (
                                       <a
                                          className='link mt-1 inline-flex items-center gap-1 text-xs'
                                          href={document.link}
                                          rel='noreferrer'
                                          target='_blank'
                                       >
                                          {t('Открыть файл')}
                                          <ExternalLink
                                             aria-hidden
                                             className='size-3'
                                          />
                                       </a>
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
                                 ? formatDayYear(document.date)
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
                     {t('В этом разделе пока нет документов — добавьте первый')}
                  </NoData>
               )}
            </Card>
            <div className={STACK}>
               <Card
                  action={
                     <button
                        type='button'
                        className='link'
                        onClick={() => setAddingIssue(true)}
                     >
                        {t('Добавить')}
                     </button>
                  }
                  hint={issues.length || undefined}
                  title={t('Открытые вопросы управления')}
               >
                  {issues.length ? (
                     <ul className='divide-line divide-y px-5'>
                        {issues.map((issue) => (
                           <li key={issue.id} className='py-3.5'>
                              <div className='font-semibold'>{issue.title}</div>
                              {issue.note && (
                                 <div className='text-ink-soft mt-0.5 text-xs'>
                                    {issue.note}
                                 </div>
                              )}
                              <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-2'>
                                 <FilterSelect<IssueStatus>
                                    accent={issue.status === 'in_work'}
                                    busy={changingId === issue.id}
                                    label={t('Статус вопроса')}
                                    options={(
                                       Object.keys(
                                          ISSUE_STATUSES,
                                       ) as IssueStatus[]
                                    ).map((value) => ({
                                       value,
                                       label: t(ISSUE_STATUSES[value].label),
                                    }))}
                                    showLabel={false}
                                    value={issue.status}
                                    onChange={async (status) => {
                                       setChangingId(issue.id);
                                       await changing.run(issue.id, status);
                                       setChangingId('');
                                    }}
                                 />
                                 {issue.ownerId && (
                                    <span className='text-ink-soft text-xs'>
                                       {personName(issue.ownerId)}
                                    </span>
                                 )}
                              </div>
                           </li>
                        ))}
                     </ul>
                  ) : (
                     <NoData>{t('Открытых вопросов нет')}</NoData>
                  )}
               </Card>
               <Card
                  action={
                     orders.length > 0 && (
                        <button
                           type='button'
                           className='link'
                           onClick={() =>
                              setParams({ tab: 'orders' }, { replace: true })
                           }
                        >
                           {t('Все приказы')}
                        </button>
                     )
                  }
                  title={t('Последние приказы')}
               >
                  {orders.length ? (
                     <ul className='divide-line divide-y px-5'>
                        {orders.slice(0, 3).map((order) => (
                           <li key={order.id} className='py-3'>
                              <div className='font-semibold'>
                                 {t('{{number}} от {{date}}', {
                                    number: order.title,
                                    date: formatDayYear(order.date),
                                 })}
                              </div>
                              <div className='text-ink-soft mt-0.5 text-xs'>
                                 {order.note}
                              </div>
                           </li>
                        ))}
                     </ul>
                  ) : (
                     <NoData>{t('Приказов пока нет')}</NoData>
                  )}
               </Card>
            </div>
         </PageBody>
         <DocumentDialog
            mode={dialog}
            tab={tab}
            onClose={() => setDialog(null)}
            onSaved={(id, category) =>
               setParams({ tab: category, doc: id }, { replace: true })
            }
         />
         <IssueDialog
            open={addingIssue}
            onClose={() => setAddingIssue(false)}
         />
      </>
   );
};

export default DocumentsPage;

import {
   DOCUMENT_STATUS_LABELS,
   DOCUMENT_STATUS_TONES,
   STAGE_LABELS,
   TEXT_MAX,
} from '@modules/Deals/constants';
import { formatStamp, isOpen, personName } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import {
   Badge,
   Button,
   Card,
   FactList,
   NoData,
   STACK,
} from '@shared/components';
import { ROLE_LABELS, TEAM } from '@shared/constants';
import { formatDate, todayISO } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type {
   Deal,
   DealDocument,
   DealRequest,
} from '@shared/types/deals.types';
import dayjs from 'dayjs';
import { FileText } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface RequestsProps {
   deal: Deal;
   onRequest: (title: string) => void;
}

// Working days from tomorrow to the day, inclusive.
const workingDaysLeft = (date: string, today = todayISO()) => {
   let count = 0;
   for (
      let day = dayjs(today).add(1, 'day');
      !day.isAfter(date);
      day = day.add(1, 'day')
   )
      if (day.day() !== 0 && day.day() !== 6) count += 1;
   return count;
};

// What the fund has asked the applicant for, and the documents received.
const Requests = ({ deal, onRequest }: RequestsProps) => {
   const { t } = useTranslation('deals');
   const { t: tLayout } = useTranslation('layout');
   const user = useCurrentUser();
   const requests = deal.requests ?? [];
   const documents = deal.documents ?? [];
   const open = requests.filter(({ status }) => status === 'waiting');
   const writable = isOpen(deal);
   // the document being checked, and the reason typed for rejecting it
   const [reviewId, setReviewId] = useState<string | null>(null);
   const [reason, setReason] = useState('');

   const requestLine = (request: DealRequest) =>
      request.detail ||
      t('Запросил {{name}} · {{date}}', {
         name: personName(request.byId),
         date: formatDate(request.sentAt),
      });

   const documentLine = ({ version, detail, handled }: DealDocument) => {
      const prefix = version ? `v${version} · ` : '';
      if (!handled) return prefix + detail;
      const name = personName(handled.byId);
      const at = formatStamp(handled.at);
      if (handled.kind === 'rejected')
         return `${prefix}${t('отклонил {{name}}: {{reason}}', { name, reason: handled.reason })}`;
      return `${prefix}${
         handled.kind === 'uploaded'
            ? t('загружен от имени фонда · {{name}}', { name })
            : t('принял {{name}}', { name })
      } · ${at}`;
   };

   const review = async (document: DealDocument, accepted: boolean) => {
      await deals.reviewDocument(
         deal.id,
         document.id,
         accepted,
         reason.trim(),
         user.id,
      );
      setReviewId(null);
      setReason('');
   };

   const documentAction = (document: DealDocument) => {
      if (document.status === 'review')
         return (
            writable && (
               <button
                  type='button'
                  className='link'
                  onClick={() => setReviewId(document.id)}
               >
                  {t('Проверить')}
               </button>
            )
         );
      if (document.status === 'accepted')
         return (
            <button
               type='button'
               className='text-ink-faint text-meta cursor-not-allowed font-medium'
               disabled
               title={t('Файлы появятся, когда будет подключено хранилище')}
            >
               {t('Скачать')}
            </button>
         );
      return (
         writable && (
            <button
               type='button'
               className='link'
               onClick={() => onRequest(document.title)}
            >
               {document.status === 'rejected'
                  ? t('Запросить заново')
                  : t('Запросить')}
            </button>
         )
      );
   };

   const first = open[0];
   const author = first && TEAM.find(({ id }) => id === first.byId);

   return (
      <div className='gap-section grid flex-1 xl:grid-cols-[minmax(0,1fr)_23.75rem]'>
         <div className={STACK}>
            <Card
               hint={`${t('{{count}} открытый', { count: open.length })} · ${t(
                  '{{count}} закрыт',
                  { count: requests.length - open.length },
               )}`}
               title={t('Запросы заявителю')}
            >
               {requests.length ? (
                  <ul className='divide-line divide-y px-5 py-1'>
                     {requests.map((request) => (
                        <li
                           key={request.id}
                           className='grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 py-3.5 sm:grid-cols-[minmax(0,1fr)_10rem_7.5rem]'
                        >
                           <div className='min-w-0'>
                              <div className='font-semibold'>
                                 {request.title}
                              </div>
                              <div className='text-ink-soft mt-0.5 text-xs'>
                                 {requestLine(request)}
                              </div>
                              {request.warning && (
                                 <div className='text-warning-ink mt-1 text-xs'>
                                    {request.warning}
                                 </div>
                              )}
                           </div>
                           <div className='text-ink-soft text-meta max-sm:order-last'>
                              {request.status === 'waiting'
                                 ? t('Ответ до {{date}}', {
                                      date: formatDate(request.dueDate),
                                   })
                                 : t('Закрыт {{date}}', {
                                      date: formatDate(request.closedAt),
                                   })}
                           </div>
                           <div>
                              {request.status === 'waiting' ? (
                                 <Badge tone='warning'>
                                    {t('Ждём ответа')}
                                 </Badge>
                              ) : (
                                 <Badge tone='success'>{t('Принят')}</Badge>
                              )}
                           </div>
                        </li>
                     ))}
                  </ul>
               ) : (
                  <NoData>{t('Запросов заявителю пока нет')}</NoData>
               )}
            </Card>

            <Card
               action={
                  <button
                     type='button'
                     className='text-ink-faint text-meta cursor-not-allowed font-medium'
                     disabled
                     title={t(
                        'Файлы появятся, когда будет подключено хранилище',
                     )}
                  >
                     {t('Скачать архив')}
                  </button>
               }
               hint={`${t('{{count}} документ', { count: documents.length })} · ${t(
                  '{{total}} на проверке',
                  {
                     total: documents.filter(
                        ({ status }) => status === 'review',
                     ).length,
                  },
               )}`}
               title='Data room'
            >
               {documents.length ? (
                  <div className='p-5'>
                     <ul className='flex flex-col gap-2.5'>
                        {documents.map((document) => (
                           <li
                              key={document.id}
                              className='border-line rounded-lg border px-4 py-3'
                           >
                              <div className='flex items-center gap-3.5'>
                                 <span className='bg-ground text-ink-faint grid size-9 shrink-0 place-items-center rounded-md'>
                                    <FileText aria-hidden className='size-4' />
                                 </span>
                                 <div className='min-w-0 flex-1'>
                                    <div className='flex flex-wrap items-center gap-x-2.5 gap-y-1'>
                                       <span className='font-semibold'>
                                          {document.title}
                                       </span>
                                       <Badge
                                          caps
                                          tone={
                                             DOCUMENT_STATUS_TONES[
                                                document.status
                                             ]
                                          }
                                       >
                                          {t(
                                             DOCUMENT_STATUS_LABELS[
                                                document.status
                                             ],
                                          )}
                                       </Badge>
                                    </div>
                                    <div className='text-ink-soft mt-0.5 text-xs'>
                                       {documentLine(document)}
                                    </div>
                                 </div>
                                 {reviewId !== document.id &&
                                    documentAction(document)}
                              </div>
                              {reviewId === document.id && (
                                 <div className='border-line mt-3 border-t pt-3'>
                                    <textarea
                                       aria-label={t('Причина отклонения')}
                                       className='field-input text-meta'
                                       maxLength={TEXT_MAX}
                                       placeholder={t(
                                          'Причина — нужна, только если документ отклоняется',
                                       )}
                                       rows={2}
                                       value={reason}
                                       onChange={(event) =>
                                          setReason(event.target.value)
                                       }
                                    />
                                    <div className='mt-2.5 flex flex-wrap items-center gap-2.5'>
                                       <Button
                                          className='h-9'
                                          onClick={() => review(document, true)}
                                       >
                                          {t('Принять')}
                                       </Button>
                                       <Button
                                          className='h-9'
                                          // a rejection always says why
                                          disabled={!reason.trim()}
                                          variant='ghost'
                                          onClick={() =>
                                             review(document, false)
                                          }
                                       >
                                          {t('Отклонить')}
                                       </Button>
                                       <Button
                                          className='h-9'
                                          variant='text'
                                          onClick={() => setReviewId(null)}
                                       >
                                          {t('Отмена')}
                                       </Button>
                                    </div>
                                 </div>
                              )}
                           </li>
                        ))}
                     </ul>
                     <p className='text-ink-soft mt-3.5 text-xs'>
                        {t(
                           'Каждая версия хранится с автором, временем и хешем файла. Отклонение без причины недоступно — иначе заявитель вернётся в почту.',
                        )}
                     </p>
                  </div>
               ) : (
                  <NoData>{t('Документов в data room пока нет')}</NoData>
               )}
            </Card>
         </div>

         <div className={STACK}>
            {deal.days && (
               <Card
                  title={t('Часы стадии «{{stage}}»', {
                     stage: t(STAGE_LABELS[deal.stage]),
                  })}
               >
                  <div className='p-5'>
                     <div className='bg-neutral-tint flex gap-3 rounded-lg px-4 py-3'>
                        <span
                           aria-hidden
                           className='bg-neutral-ink mt-1.5 size-2 shrink-0 rounded-full'
                        />
                        <div className='text-meta'>
                           <div>
                              {deal.waiting
                                 ? t('Таймер остановлен')
                                 : t('Таймер идёт')}
                           </div>
                           <div className='text-ink-soft mt-0.5 text-xs'>
                              {deal.waiting
                                 ? t('Ждём данные от заявителя с {{date}}', {
                                      date: formatDate(
                                         deal.clock?.pausedSince ?? todayISO(),
                                      ),
                                   })
                                 : t('Срок фонда считается в рабочих днях')}
                           </div>
                        </div>
                     </div>
                     <FactList
                        className='text-meta mt-2'
                        labelWidth='7.5rem'
                        rows={[
                           {
                              label: t('Норма стадии'),
                              value: t('{{count}} рабочий день', {
                                 count: deal.days.norm,
                              }),
                           },
                           {
                              label: t('Использовано'),
                              value: t('{{count}} рабочий день', {
                                 count: deal.days.used,
                              }),
                           },
                           ...(deal.clock
                              ? [
                                   {
                                      label: t('На паузе'),
                                      value: `${t('{{count}} рабочий день', {
                                         count: deal.clock.pausedDays,
                                      })} · ${t('по вине заявителя')}`,
                                   },
                                ]
                              : []),
                           ...(deal.waiting
                              ? [
                                   {
                                      label: t('Возобновится'),
                                      value: t(
                                         'после ответа на {{count}} запрос',
                                         {
                                            count: open.length,
                                         },
                                      ),
                                   },
                                ]
                              : []),
                        ]}
                     />
                  </div>
               </Card>
            )}

            {first && (
               <Card
                  hint={t('кабинет {{company}}', { company: deal.company })}
                  title={t('Так видит заявитель')}
               >
                  <div className='p-5'>
                     <p className='text-ink-soft text-xs'>
                        {deal.applicantEmail
                           ? t(
                                'Кабинета заявителя пока нет: отправьте запрос на {{email}} сами. Ниже — как он будет выглядеть в кабинете.',
                                { email: deal.applicantEmail },
                             )
                           : t(
                                'Кабинета заявителя пока нет: отправьте запрос заявителю сами. Ниже — как он будет выглядеть в кабинете.',
                             )}
                     </p>
                     {/* a picture of the applicant's screen, not controls */}
                     <div
                        inert
                        aria-label={t('Так видит заявитель')}
                        className='border-line mt-3 rounded-lg border p-4'
                     >
                        <div className='flex items-start justify-between gap-3'>
                           <div className='text-title leading-5 font-bold'>
                              {first.title}
                           </div>
                           <Badge tone='warning'>{t('Нужен ответ')}</Badge>
                        </div>
                        <div className='text-ink-soft mt-2.5 text-xs'>
                           {t('Запросил: {{name}}, {{role}} · {{date}}', {
                              name: personName(first.byId),
                              role: author
                                 ? tLayout(
                                      ROLE_LABELS[author.role],
                                   ).toLowerCase()
                                 : '',
                              date: formatDate(first.sentAt),
                           })}
                        </div>
                        {first.text && (
                           <p className='text-meta mt-2.5'>{first.text}</p>
                        )}
                        <div className='bg-warning-tint text-warning-ink mt-3 flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium'>
                           <span
                              aria-hidden
                              className='bg-warning-ink size-1.5 rounded-full'
                           />
                           {t('Ответить до {{date}}', {
                              date: formatDate(first.dueDate),
                           })}
                           {' · '}
                           {t('остался {{count}} день', {
                              count: workingDaysLeft(first.dueDate),
                           })}
                        </div>
                        <div className='mt-3 flex items-center gap-4'>
                           <span className='bg-accent inline-flex h-11 items-center rounded-lg px-5 font-semibold text-white'>
                              {t('Ответить и приложить файл')}
                           </span>
                           <span className='text-accent text-meta font-medium'>
                              {t('История')}
                           </span>
                        </div>
                     </div>
                  </div>
               </Card>
            )}
         </div>
      </div>
   );
};

export default Requests;

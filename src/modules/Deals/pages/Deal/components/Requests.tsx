import { listOf, nameOf, stageName } from '@modules/Settings/services';
import { TEXT_MAX } from '@modules/Deals/constants';
import { isOpen, personName } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import {
   Attachments,
   Badge,
   Button,
   Card,
   ConfirmDialog,
   FactList,
   FilterSelect,
   ItemActions,
   NoData,
   STACK,
} from '@shared/components';
import { ROLE_LABELS, TEAM } from '@shared/constants';
import { formatDate, todayISO } from '@shared/helpers';
import {
   useAction,
   useAttachments,
   useCurrentUser,
   useRequest,
} from '@shared/hooks';
import attachments from '@shared/services/attachments';
import type { Deal, DealRequest } from '@shared/types/deals.types';
import dayjs from 'dayjs';
import { FileText, Paperclip, X } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DataRoom from './DataRoom';

interface RequestsProps {
   deal: Deal;
   folderId: string; // the open folder of the data room
   onFolder: (folderId: string) => void;
   onRequest: (title: string) => void;
}

interface TemplatePickerProps {
   dealId: string;
   requestId: string;
}

/* Adds a template from Настройки → Шаблоны документов to a request: the
   applicant downloads it, fills it in and sends it back. A template already
   on the request is not offered again. */
const TemplatePicker = ({ dealId, requestId }: TemplatePickerProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   const place = { dealId, section: 'request', itemId: requestId };
   const attached = new Set(useAttachments(place).map(({ url }) => url));
   const templates = listOf('docTemplates').filter(
      (item) => item.file && !attached.has(item.file.url),
   );
   const adding = useAction(
      (key: string) => {
         const item = templates.find((template) => template.key === key);
         return (
            item?.file &&
            attachments.addCopies(
               place,
               [{ title: nameOf(item), url: item.file.url }],
               user.id,
            )
         );
      },
      { kind: 'create', success: t('Шаблон добавлен к запросу') },
   );

   if (!templates.length) return null;
   return (
      <FilterSelect
         busy={adding.pending}
         label={t('Добавить шаблон')}
         options={[
            { value: '', label: t('Добавить шаблон…') },
            ...templates.map((item) => ({
               value: item.key,
               label: nameOf(item),
            })),
         ]}
         showLabel={false}
         value=''
         onChange={(key) => key && adding.run(key)}
      />
   );
};

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

interface RequestRowProps {
   dealId: string;
   request: DealRequest;
   line: string;
   writable: boolean;
}

/* A request to the applicant: what was asked and until when. While it
   waits, the fund records the answer (it comes by mail until the founders'
   cabinet), changes the request or withdraws it; the answer's files go with
   it. */
const RequestRow = ({ dealId, request, line, writable }: RequestRowProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   // what is open under the request: the answer, the request's own fields
   const [mode, setMode] = useState<'answer' | 'edit' | null>(null);
   const [answer, setAnswer] = useState('');
   // the applicant's filled-in files, uploaded with the answer
   const [files, setFiles] = useState<File[]>([]);
   const fileInput = useRef<HTMLInputElement>(null);
   const place = { dealId, section: 'request', itemId: request.id };
   const sent = useAttachments(place);
   const [draft, setDraft] = useState({
      title: request.title,
      text: request.text,
      dueDate: request.dueDate,
      detail: request.detail,
   });
   const [removing, setRemoving] = useState(false);
   const waiting = request.status === 'waiting';
   const answering = useRequest({
      success: files.length
         ? t('Запрос закрыт, файлы — в data room на проверке')
         : t('Запрос закрыт'),
   });
   const saving = useRequest();

   const submitAnswer = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!answer.trim()) return;
      if (
         await answering.run(() =>
            deals.answerRequest(
               dealId,
               request.id,
               answer.trim(),
               user.id,
               files,
            ),
         )
      ) {
         setMode(null);
         setFiles([]);
      }
   };

   const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!draft.title.trim() || !draft.dueDate) return;
      if (
         await saving.run(() =>
            deals.updateRequest(dealId, request.id, {
               title: draft.title.trim(),
               text: draft.text.trim(),
               dueDate: draft.dueDate,
               ...(!waiting && { detail: draft.detail.trim() }),
            }),
         )
      )
         setMode(null);
   };

   return (
      <li className='py-3.5'>
         <div className='grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_10rem_7.5rem]'>
            <div className='min-w-0'>
               <div className='font-semibold'>{request.title}</div>
               <div className='text-ink-soft mt-0.5 text-xs'>{line}</div>
               {request.text && (
                  <p className='text-meta mt-1'>{request.text}</p>
               )}
               {!waiting && request.detail && (
                  <p className='text-meta mt-1'>
                     <span className='text-ink-soft'>{t('Ответ')}: </span>
                     {request.detail}
                  </p>
               )}
               {request.warning && (
                  <div className='text-warning-ink mt-1 text-xs'>
                     {request.warning}
                  </div>
               )}
            </div>
            <div className='text-ink-soft text-meta max-sm:order-last'>
               {waiting
                  ? t('Ответ до {{date}}', {
                       date: formatDate(request.dueDate),
                    })
                  : t('Закрыт {{date}}', {
                       date: formatDate(request.closedAt),
                    })}
            </div>
            <div>
               {waiting ? (
                  <Badge tone='warning'>{t('Ждём ответа')}</Badge>
               ) : (
                  <Badge tone='success'>{t('Принят')}</Badge>
               )}
            </div>
         </div>
         {/* what goes to the applicant: templates to fill in, examples */}
         {(sent.length > 0 || writable) && (
            <div className='text-ink-soft mt-2.5 text-xs font-medium'>
               {t('Шаблоны и файлы для заявителя')}
            </div>
         )}
         <Attachments
            className='mt-1.5'
            editable={writable}
            extra={
               writable && (
                  <TemplatePicker dealId={dealId} requestId={request.id} />
               )
            }
            place={place}
         />
         {writable && mode === null && (
            <div className='mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs'>
               {waiting && (
                  <button
                     type='button'
                     className='link'
                     onClick={() => setMode('answer')}
                  >
                     {t('Ответ получен')}
                  </button>
               )}
               <ItemActions
                  name={request.title}
                  onDelete={() => setRemoving(true)}
                  onEdit={() => setMode('edit')}
               />
            </div>
         )}
         <ConfirmDialog
            open={removing}
            subtitle={request.title}
            title={t('Удалить запрос?')}
            onClose={() => setRemoving(false)}
            onConfirm={() => deals.removeRequest(dealId, request.id)}
         >
            <p>
               {t(
                  'Запрос уйдёт из списка вместе с файлами для заявителя; присланные им документы останутся в data room. Если других открытых запросов нет, часы стадии снова пойдут.',
               )}
            </p>
         </ConfirmDialog>
         {mode === 'answer' && (
            <form className='mt-3' onSubmit={submitAnswer}>
               <textarea
                  aria-label={t('Ответ заявителя')}
                  autoFocus
                  className='field-input text-meta'
                  maxLength={TEXT_MAX}
                  placeholder={t('Что ответил заявитель')}
                  rows={2}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
               />
               {/* the filled-in templates and other files the applicant sent */}
               <div className='mt-2 text-xs'>
                  {files.length > 0 && (
                     <ul className='mb-1.5 flex flex-col gap-1'>
                        {files.map((file, index) => (
                           <li
                              key={`${file.name}-${index}`}
                              className='flex items-center gap-2'
                           >
                              <Paperclip
                                 aria-hidden
                                 className='text-ink-soft size-3.5 shrink-0'
                              />
                              <span className='min-w-0 truncate'>
                                 {file.name}
                              </span>
                              <button
                                 type='button'
                                 aria-label={t('Убрать файл: {{name}}', {
                                    name: file.name,
                                 })}
                                 className='text-ink-soft hover:text-danger grid size-5 place-items-center rounded'
                                 onClick={() =>
                                    setFiles((prev) =>
                                       prev.filter((_, at) => at !== index),
                                    )
                                 }
                              >
                                 <X aria-hidden className='size-3.5' />
                              </button>
                           </li>
                        ))}
                     </ul>
                  )}
                  <button
                     type='button'
                     className='link'
                     onClick={() => fileInput.current?.click()}
                  >
                     {t('Приложить заполненные файлы')}
                  </button>
                  <span className='text-ink-soft'>
                     {' '}
                     {t('— они попадут в data room на проверку')}
                  </span>
                  <input
                     ref={fileInput}
                     hidden
                     multiple
                     type='file'
                     onChange={(event) => {
                        const chosen = [...(event.target.files ?? [])];
                        setFiles((prev) => [...prev, ...chosen]);
                        event.target.value = '';
                     }}
                  />
               </div>
               <div className='mt-2.5 flex gap-2.5'>
                  <Button
                     className='h-9'
                     disabled={!answer.trim()}
                     loading={answering.pending}
                     type='submit'
                  >
                     {t('Закрыть запрос')}
                  </Button>
                  <Button
                     className='h-9'
                     disabled={answering.pending}
                     variant='text'
                     onClick={() => setMode(null)}
                  >
                     {t('Отмена')}
                  </Button>
               </div>
            </form>
         )}
         {mode === 'edit' && (
            <form
               className='mt-3 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_10rem]'
               onSubmit={submitEdit}
            >
               <input
                  aria-label={t('Что запрашиваем')}
                  autoFocus
                  className='field-input'
                  maxLength={160}
                  placeholder={t('Что запрашиваем')}
                  value={draft.title}
                  onChange={(event) =>
                     setDraft((prev) => ({
                        ...prev,
                        title: event.target.value,
                     }))
                  }
               />
               <input
                  aria-label={t('Срок ответа')}
                  className='field-input'
                  type='date'
                  value={draft.dueDate}
                  onChange={(event) =>
                     setDraft((prev) => ({
                        ...prev,
                        dueDate: event.target.value,
                     }))
                  }
               />
               <textarea
                  aria-label={t('Текст запроса')}
                  className='field-input text-meta sm:col-span-2'
                  maxLength={TEXT_MAX}
                  placeholder={t('Текст запроса')}
                  rows={2}
                  value={draft.text}
                  onChange={(event) =>
                     setDraft((prev) => ({ ...prev, text: event.target.value }))
                  }
               />
               {!waiting && (
                  <textarea
                     aria-label={t('Ответ заявителя')}
                     className='field-input text-meta sm:col-span-2'
                     maxLength={TEXT_MAX}
                     placeholder={t('Ответ заявителя')}
                     rows={2}
                     value={draft.detail}
                     onChange={(event) =>
                        setDraft((prev) => ({
                           ...prev,
                           detail: event.target.value,
                        }))
                     }
                  />
               )}
               <div className='flex gap-2.5 sm:col-span-2'>
                  <Button
                     className='h-9'
                     loading={saving.pending}
                     type='submit'
                  >
                     {t('Сохранить')}
                  </Button>
                  <Button
                     className='h-9'
                     disabled={saving.pending}
                     variant='text'
                     onClick={() => setMode(null)}
                  >
                     {t('Отмена')}
                  </Button>
               </div>
            </form>
         )}
      </li>
   );
};

// What the fund has asked the applicant for, and the documents received.
const Requests = ({ deal, folderId, onFolder, onRequest }: RequestsProps) => {
   const { t } = useTranslation('deals');
   const { t: tLayout } = useTranslation('layout');
   const requests = deal.requests ?? [];
   const open = requests.filter(({ status }) => status === 'waiting');
   const writable = isOpen(deal);
   const first = open[0];
   const author = first && TEAM.find(({ id }) => id === first.byId);
   // what the applicant downloads with the first open request
   const firstFiles = useAttachments({
      dealId: deal.id,
      section: 'request',
      itemId: first?.id ?? '',
   });

   // who asked and when; `detail` is the applicant's answer
   const requestLine = (request: DealRequest) =>
      t('Запросил {{name}} · {{date}}', {
         name: personName(request.byId),
         date: formatDate(request.sentAt),
      });

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
                        <RequestRow
                           key={request.id}
                           dealId={deal.id}
                           line={requestLine(request)}
                           request={request}
                           writable={writable}
                        />
                     ))}
                  </ul>
               ) : (
                  <NoData>{t('Запросов заявителю пока нет')}</NoData>
               )}
            </Card>

            <DataRoom
               deal={deal}
               folderId={folderId}
               onFolder={onFolder}
               onRequest={onRequest}
            />
         </div>

         <div className={STACK}>
            {deal.days && (
               <Card
                  title={t('Часы стадии «{{stage}}»', {
                     stage: stageName(deal.stage),
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
                        {firstFiles.length > 0 && (
                           <div className='mt-3'>
                              <div className='text-ink-soft text-xs'>
                                 {t(
                                    'Скачайте, заполните и приложите к ответу:',
                                 )}
                              </div>
                              <ul className='mt-1.5 flex flex-col gap-1'>
                                 {firstFiles.map((item) => (
                                    <li
                                       key={item.id}
                                       className='text-accent text-meta flex items-center gap-2'
                                    >
                                       <FileText
                                          aria-hidden
                                          className='size-3.5 shrink-0'
                                       />
                                       <span className='min-w-0 truncate'>
                                          {item.title}
                                       </span>
                                    </li>
                                 ))}
                              </ul>
                           </div>
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

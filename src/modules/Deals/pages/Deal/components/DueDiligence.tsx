import { RisksCard } from '@modules/Deals/components';
import {
   WORKSTREAM_STATUS_LABELS,
   WORKSTREAM_STATUS_TONES,
   WORKSTREAM_VERDICTS,
} from '@modules/Deals/constants';
import { ddStreams, isOpen, personName } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { hasVerdictFields } from '@modules/Deals/services/ucode';
import { listOf } from '@modules/Settings/services';
import {
   Badge,
   Button,
   Card,
   ConfirmDialog,
   Field,
   ItemActions,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   NoData,
   Notice,
   STACK,
   TONE_COLORS,
} from '@shared/components';
import { TEAM } from '@shared/constants';
import { formatDate } from '@shared/helpers';
import {
   useAction,
   useAttachments,
   useCurrentUser,
   useRequest,
} from '@shared/hooks';
import attachments from '@shared/services/attachments';
import type { Attachment } from '@shared/types/attachments.types';
import type {
   Deal,
   Workstream,
   WorkstreamStatus,
   WorkstreamVerdict,
} from '@shared/types/deals.types';
import clsx from 'clsx';
import {
   Calculator,
   Cpu,
   FileText,
   Scale,
   ShieldCheck,
   Upload,
   X,
} from 'lucide-react';
import { type DragEvent, type FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface DueDiligenceProps {
   deal: Deal;
}

type StreamValues = Pick<
   Workstream,
   'executor' | 'status' | 'conclusion' | 'verdict'
>;

const VERDICTS = Object.keys(WORKSTREAM_VERDICTS) as WorkstreamVerdict[];

// A workstream's sign, as the design's three audits have theirs.
const streamIcon = (name: string) =>
   /юрид|прав|legal/i.test(name)
      ? Scale
      : /финанс|бухг|financ/i.test(name)
        ? Calculator
        : /\bit\b|it-|техн|tech/i.test(name)
          ? Cpu
          : ShieldCheck;

interface ConclusionFilesProps {
   dealId: string;
   stream: Workstream;
   editable: boolean;
}

/* The files of a workstream's conclusion, as the design's box: their count
   and «Загрузить» on top, each file with when and by whom it came and its
   cross (it asks first); files dropped on the box are uploaded too. The
   first file of an audit nobody has touched gives it its row. */
const ConclusionFiles = ({
   dealId,
   stream,
   editable,
}: ConclusionFilesProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   const place = { dealId, section: 'workstream', itemId: stream.id };
   const files = useAttachments(place);
   const input = useRef<HTMLInputElement>(null);
   const [dragging, setDragging] = useState(false);
   const [removing, setRemoving] = useState<Attachment | null>(null);
   const uploading = useAction(
      async (list: File[]) => {
         const itemId = await deals.openAudit(dealId, stream);
         await attachments.uploadFiles({ ...place, itemId }, list, user.id);
      },
      { kind: 'upload', success: t('Файл заключения загружен') },
   );
   const upload = (list: File[]) => {
      if (list.length && !uploading.pending) void uploading.run(list);
   };
   const withFiles = (event: DragEvent) =>
      editable && event.dataTransfer.types.includes('Files');

   return (
      <div
         className={clsx(
            'border-line overflow-hidden rounded-lg border',
            dragging &&
               'outline-accent outline-2 -outline-offset-4 outline-dashed',
         )}
         onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node))
               setDragging(false);
         }}
         onDragOver={(event) => {
            if (!withFiles(event)) return;
            event.preventDefault();
            setDragging(true);
         }}
         onDrop={(event) => {
            if (!withFiles(event)) return;
            event.preventDefault();
            setDragging(false);
            upload([...event.dataTransfer.files]);
         }}
      >
         <div className='bg-ground text-ink-soft flex items-center justify-between gap-2 px-2.5 py-2 text-xs font-semibold'>
            <span>
               {t('Файлы заключения')}
               <span className='text-ink-faint ml-1 font-medium'>
                  {files.length}
               </span>
            </span>
            {editable && (
               <Button
                  className='h-7 px-2.5 text-xs'
                  hint={t('Выбрать файлы заключения и загрузить их')}
                  loading={uploading.pending}
                  variant='ghost'
                  onClick={() => input.current?.click()}
               >
                  <Upload aria-hidden />
                  {t('Загрузить')}
               </Button>
            )}
         </div>
         {files.length ? (
            files.map((file) => (
               <div
                  key={file.id}
                  className='border-line hover:bg-hover flex items-center gap-2.5 border-t px-2.5 py-2'
               >
                  <FileText
                     aria-hidden
                     className={clsx(
                        'size-4.5 shrink-0',
                        /\.pdf$/i.test(file.title)
                           ? 'text-danger'
                           : 'text-ink-soft',
                     )}
                  />
                  <a
                     className='min-w-0 flex-1'
                     data-hint={t('Открыть файл в новой вкладке')}
                     href={file.url}
                     rel='noreferrer'
                     target='_blank'
                  >
                     <span className='text-meta block truncate font-medium'>
                        {file.title}
                     </span>
                     <span className='text-ink-faint block text-[11px]'>
                        {[
                           file.addedAt &&
                              formatDate(file.addedAt.slice(0, 10)),
                           personName(file.addedById),
                        ]
                           .filter(Boolean)
                           .join(' · ')}
                     </span>
                  </a>
                  {editable && (
                     <button
                        type='button'
                        aria-label={t('Удалить файл: {{name}}', {
                           name: file.title,
                        })}
                        className='text-ink-soft hover:text-danger hover:bg-ground grid size-7 shrink-0 place-items-center rounded-md'
                        data-hint={t('Удалить файл: {{name}}', {
                           name: file.title,
                        })}
                        onClick={() => setRemoving(file)}
                     >
                        <X aria-hidden className='size-4' />
                     </button>
                  )}
               </div>
            ))
         ) : (
            <p className='border-line text-ink-soft border-t border-dashed px-2.5 py-3 text-xs'>
               {t(
                  'Отчёт аудитора: PDF, Word, Excel или архив. Можно перетащить файл сюда.',
               )}
            </p>
         )}
         <input
            ref={input}
            hidden
            multiple
            type='file'
            onChange={(event) => {
               upload([...(event.target.files ?? [])]);
               event.target.value = '';
            }}
         />
         <ConfirmDialog
            open={removing !== null}
            subtitle={removing?.title}
            success={t('Файл удалён')}
            title={t('Удалить файл заключения?')}
            onClose={() => setRemoving(null)}
            onConfirm={() => removing && attachments.remove(removing.id)}
         >
            <p>{t('Файл удалится из заключения и из хранилища.')}</p>
         </ConfirmDialog>
      </div>
   );
};

interface StreamCardProps {
   dealId: string;
   stream: Workstream;
   editable: boolean;
   people: string[]; // the team's names, offered as the auditor
   // an audit of Настройки stays; only another workstream is changed or deleted
   onEdit?: () => void;
   onRemove?: () => void;
}

/* A workstream as the design's audit card: its sign, name and status on
   top, then the auditor, the status, the conclusion picked and the
   remarks, changed in place, the conclusion's files and the day of the
   conclusion. Picking the auditor of a workstream not started hands it
   over; «Завершён» concludes it. An audit of Настройки gets its row with
   its first change. A workstream that is not one has «Изменить» (its name,
   an outside auditor, the deadline) and «Удалить» (after asking) at its
   foot. */
const StreamCard = ({
   dealId,
   stream,
   editable,
   people,
   onEdit,
   onRemove,
}: StreamCardProps) => {
   const { t } = useTranslation('deals');
   // typed text is kept here and saved when the field is left
   const [conclusion, setConclusion] = useState(stream.conclusion);
   const saving = useAction(
      async (patch: Partial<StreamValues>) => {
         const id = await deals.openAudit(dealId, stream);
         await (patch.executor && stream.status === 'not_started'
            ? deals.handOverWorkstream(dealId, id, patch.executor)
            : deals.updateWorkstream(dealId, id, patch));
      },
      { success: t('Сохранено') },
   );
   const verdict = stream.verdict ? WORKSTREAM_VERDICTS[stream.verdict] : null;
   const verdicts = hasVerdictFields();
   // an auditor from outside the team, named in «Изменить», is kept
   const auditors = [...new Set([stream.executor, ...people])].filter(Boolean);

   return (
      <Card
         action={
            <Badge tone={WORKSTREAM_STATUS_TONES[stream.status]}>
               {t(WORKSTREAM_STATUS_LABELS[stream.status])}
            </Badge>
         }
         icon={streamIcon(stream.name)}
         title={stream.name}
      >
         <div className='grid gap-3 p-4.5'>
            <Field label={t('Аудитор')}>
               <select
                  className='field-input'
                  disabled={!editable || saving.pending}
                  value={stream.executor}
                  onChange={(event) =>
                     saving.run({ executor: event.target.value })
                  }
               >
                  <option value=''>{t('Не назначен')}</option>
                  {auditors.map((name) => (
                     <option key={name} value={name}>
                        {name}
                     </option>
                  ))}
               </select>
            </Field>
            <Field label={t('Статус')}>
               <select
                  className='field-input'
                  disabled={!editable || saving.pending}
                  value={stream.status}
                  onChange={(event) =>
                     saving.run({
                        status: event.target.value as WorkstreamStatus,
                     })
                  }
               >
                  {(
                     Object.keys(WORKSTREAM_STATUS_LABELS) as WorkstreamStatus[]
                  ).map((status) => (
                     <option key={status} value={status}>
                        {t(WORKSTREAM_STATUS_LABELS[status])}
                     </option>
                  ))}
               </select>
            </Field>
            <Field label={t('Заключение')}>
               <select
                  className='field-input'
                  disabled={!editable || !verdicts || saving.pending}
                  style={
                     verdict
                        ? { borderColor: TONE_COLORS[verdict.tone] }
                        : undefined
                  }
                  title={
                     verdicts
                        ? undefined
                        : t(
                             'Заключение сохранится, когда в ucode будет партия 15',
                          )
                  }
                  value={stream.verdict}
                  onChange={(event) =>
                     saving.run({
                        verdict: event.target.value as WorkstreamVerdict | '',
                     })
                  }
               >
                  <option value=''>{t('Нет заключения')}</option>
                  {VERDICTS.map((value) => (
                     <option key={value} value={value}>
                        {t(WORKSTREAM_VERDICTS[value].label)}
                     </option>
                  ))}
               </select>
            </Field>
            <Field label={t('Замечания')}>
               <textarea
                  className='field-input text-meta min-h-34 resize-y'
                  disabled={!editable}
                  maxLength={400}
                  placeholder={t('Что нашли, что нужно исправить до сделки')}
                  value={conclusion}
                  onBlur={() =>
                     conclusion.trim() !== stream.conclusion &&
                     saving.run({ conclusion: conclusion.trim() })
                  }
                  onChange={(event) => setConclusion(event.target.value)}
               />
            </Field>
            <ConclusionFiles
               dealId={dealId}
               editable={editable}
               stream={stream}
            />
            <div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-1'>
               <span className='text-ink-soft text-xs'>
                  {[
                     stream.concludedAt
                        ? t('Дата заключения: {{date}}', {
                             date: formatDate(stream.concludedAt),
                          })
                        : t('Заключение ещё не выдано'),
                     stream.dueDate &&
                        t('срок {{date}}', {
                           date: formatDate(stream.dueDate),
                        }),
                  ]
                     .filter(Boolean)
                     .join(' · ')}
               </span>
               {editable && onEdit && onRemove && (
                  <ItemActions
                     className='text-xs'
                     name={stream.name}
                     onDelete={onRemove}
                     onEdit={onEdit}
                  />
               )}
            </div>
         </div>
      </Card>
   );
};

/* «Due Diligence», as the design draws it: a line with the DD's frame, then
   the audits of Настройки — every deal has them — three to a row, with any
   other workstream the deal has after them; under them the risks found, the
   frame, what speaks for the deal and the warning for the committee. New
   audits are added in Настройки. */
const DueDiligence = ({ deal }: DueDiligenceProps) => {
   const { t } = useTranslation('deals');
   const streams = ddStreams(deal);
   const audits = new Set(listOf('ddAudits').map(({ key }) => key));
   const closed = streams.filter(({ status }) => status === 'done').length;
   const { dd } = deal;
   const editable = isOpen(deal);
   const [editing, setEditing] = useState<Workstream | null>(null);
   const [removing, setRemoving] = useState<Workstream | null>(null);
   const [framing, setFraming] = useState(false);
   const people = TEAM.map(({ fullName, name }) => fullName || name);

   const summary = [
      t('Направлений закрыто {{done}} из {{total}}', {
         done: closed,
         total: streams.length,
      }),
      ...(deal.stage === 'dd' && deal.days
         ? [t('срок стадии: {{used}} из {{norm}} р.д.', deal.days)]
         : []),
      ...(dd?.due ? [t('до {{date}}', { date: formatDate(dd.due) })] : []),
      ...(deal.clock?.pausedDays
         ? [t('на паузе {{total}} р.д.', { total: deal.clock.pausedDays })]
         : []),
      ...(dd?.external.value
         ? [t('внешний DD {{value}}', { value: dd.external.value })]
         : []),
   ];

   return (
      <div className='gap-section flex flex-1 flex-col'>
         <Notice>
            {summary.join(' · ')}
            {dd?.closedNote && (
               <span className='text-ink-soft block text-xs'>
                  {dd.closedNote}
               </span>
            )}
            {streams.length > 0 && !hasVerdictFields() && (
               <span className='text-ink-soft block text-xs'>
                  {t(
                     'Заключение и его дата сохранятся, когда в ucode будет партия 15.',
                  )}
               </span>
            )}
         </Notice>

         {streams.length > 0 ? (
            <div className='gap-section grid items-start lg:grid-cols-2 xl:grid-cols-3'>
               {streams.map((stream) => (
                  <StreamCard
                     // a change made elsewhere starts the card's fields afresh;
                     // an audit's first change, which gives it a row, does not
                     key={`${stream.auditKey || stream.id}:${stream.conclusion}`}
                     dealId={deal.id}
                     editable={editable}
                     people={people}
                     stream={stream}
                     {...(!audits.has(stream.auditKey) && {
                        onEdit: () => setEditing(stream),
                        onRemove: () => setRemoving(stream),
                     })}
                  />
               ))}
            </div>
         ) : (
            <Card>
               <NoData>{t('Направлений DD пока нет')}</NoData>
            </Card>
         )}

         <div className='gap-section grid flex-1 xl:grid-cols-[minmax(0,1fr)_23.75rem]'>
            <RisksCard
               deal={deal}
               editable={editable}
               link={
                  deal.memo && (
                     <Link
                        className='link'
                        data-hint={t('Перейти к матрице рисков')}
                        to='?tab=memo'
                     >
                        {t('Матрица рисков')}
                     </Link>
                  )
               }
               title={t('Ключевые риски')}
            />

            <div className={STACK}>
               <Card
                  action={
                     editable &&
                     dd && (
                        <button
                           type='button'
                           className='link'
                           data-hint={t('Изменить срок, стоимость и выводы DD')}
                           onClick={() => setFraming(true)}
                        >
                           {t('Изменить')}
                        </button>
                     )
                  }
                  title={t('Рамки DD')}
               >
                  {dd ? (
                     <dl className='divide-line text-meta divide-y px-5 py-1'>
                        <div className='py-3'>
                           <dt className='text-ink-soft text-xs'>
                              {t('Срок DD')}
                           </dt>
                           <dd className='mt-1'>
                              {dd.due ? formatDate(dd.due) : '—'}
                           </dd>
                        </div>
                        <div className='py-3'>
                           <dt className='text-ink-soft text-xs'>
                              {t('Внешний DD по договорам')}
                           </dt>
                           <dd className='mt-1'>
                              {dd.external.value || '—'}
                              {dd.external.note && (
                                 <div className='text-ink-soft mt-0.5 text-xs'>
                                    {dd.external.note}
                                 </div>
                              )}
                           </dd>
                        </div>
                        {dd.closedNote && (
                           <div className='py-3'>
                              <dt className='text-ink-soft text-xs'>
                                 {t('Итог по направлениям')}
                              </dt>
                              <dd className='mt-1'>{dd.closedNote}</dd>
                           </div>
                        )}
                     </dl>
                  ) : (
                     <div className='px-5 py-4'>
                        <p className='text-ink-soft text-meta'>
                           {t(
                              'Срок DD, стоимость внешнего DD, факторы в пользу сделки и главное предупреждение для ИК.',
                           )}
                        </p>
                        {editable && (
                           <Button
                              className='mt-3'
                              hint={t('Указать срок, стоимость и выводы DD')}
                              variant='ghost'
                              onClick={() => setFraming(true)}
                           >
                              {t('Задать рамки DD')}
                           </Button>
                        )}
                     </div>
                  )}
               </Card>
               {dd && dd.strengths.length > 0 && (
                  <Card title={t('Факторы в пользу')}>
                     <ul className='divide-line text-meta divide-y px-5 py-1'>
                        {dd.strengths.map((strength) => (
                           <li key={strength} className='py-3'>
                              {strength}
                           </li>
                        ))}
                     </ul>
                  </Card>
               )}
               {dd?.alert && (
                  <section className='bg-warning-tint rounded-lg p-5'>
                     <h2 className='text-warning-ink font-semibold'>
                        {dd.alert.title}
                     </h2>
                     <p className='text-meta mt-2'>{dd.alert.text}</p>
                  </section>
               )}
            </div>
         </div>
         <Modal
            open={editing !== null}
            subtitle={deal.company}
            title={t('Направление DD')}
            onClose={() => setEditing(null)}
         >
            {editing && (
               <StreamForm
                  key={editing.id}
                  dealId={deal.id}
                  stream={editing}
                  onClose={() => setEditing(null)}
               />
            )}
         </Modal>
         <ConfirmDialog
            open={removing !== null}
            subtitle={deal.company}
            title={t('Удалить направление «{{name}}»?', {
               name: removing?.name ?? '',
            })}
            onClose={() => setRemoving(null)}
            onConfirm={() =>
               removing && deals.removeWorkstream(deal.id, removing.id)
            }
         >
            <p>
               {t('Направление уйдёт из DD вместе с выводом и файлами отчёта.')}
            </p>
         </ConfirmDialog>
         <Modal
            open={framing}
            subtitle={deal.company}
            title={t('Рамки DD')}
            onClose={() => setFraming(false)}
         >
            {framing && (
               <FrameForm deal={deal} onClose={() => setFraming(false)} />
            )}
         </Modal>
      </div>
   );
};

interface StreamFormProps {
   dealId: string;
   stream: Workstream;
   onClose: () => void;
}

// Everything of a workstream: its name, executor, deadline, status and
// conclusion.
const StreamForm = ({ dealId, stream, onClose }: StreamFormProps) => {
   const { t } = useTranslation('deals');
   const [values, setValues] = useState({
      name: stream.name,
      executor: stream.executor,
      dueDate: stream.dueDate,
      status: stream.status,
      conclusion: stream.conclusion,
   });
   const saving = useRequest();
   const valid = values.name.trim() && values.dueDate;

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!valid) return;
      if (
         await saving.run(async () => {
            await deals.updateWorkstream(dealId, stream.id, {
               name: values.name.trim(),
               executor: values.executor.trim(),
               dueDate: values.dueDate,
               status: values.status,
               conclusion: values.conclusion.trim(),
            });
         })
      )
         onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               <Field label={t('Направление')}>
                  <input
                     data-autofocus
                     className='field-input'
                     maxLength={80}
                     value={values.name}
                     onChange={(event) =>
                        setValues((prev) => ({
                           ...prev,
                           name: event.target.value,
                        }))
                     }
                  />
               </Field>
               <Field
                  hint={t('Кто проверяет и по какому договору')}
                  label={t('Исполнитель и основание')}
               >
                  <input
                     className='field-input'
                     maxLength={160}
                     value={values.executor}
                     onChange={(event) =>
                        setValues((prev) => ({
                           ...prev,
                           executor: event.target.value,
                        }))
                     }
                  />
               </Field>
               <Field label={t('Срок')}>
                  <input
                     className='field-input sm:w-48'
                     type='date'
                     value={values.dueDate}
                     onChange={(event) =>
                        setValues((prev) => ({
                           ...prev,
                           dueDate: event.target.value,
                        }))
                     }
                  />
               </Field>
               <Field label={t('Статус')}>
                  <select
                     className='field-input sm:w-48'
                     value={values.status}
                     onChange={(event) =>
                        setValues((prev) => ({
                           ...prev,
                           status: event.target.value as WorkstreamStatus,
                        }))
                     }
                  >
                     {(
                        Object.keys(
                           WORKSTREAM_STATUS_LABELS,
                        ) as WorkstreamStatus[]
                     ).map((status) => (
                        <option key={status} value={status}>
                           {t(WORKSTREAM_STATUS_LABELS[status])}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field label={t('Вывод')}>
                  <textarea
                     className='field-input field-sizing-content min-h-16 resize-none'
                     maxLength={400}
                     value={values.conclusion}
                     onChange={(event) =>
                        setValues((prev) => ({
                           ...prev,
                           conclusion: event.target.value,
                        }))
                     }
                  />
               </Field>
            </div>
         </ModalBody>
         <ModalFooter>
            <Button
               hint={t('Закрыть окно, ничего не меняя')}
               variant='text'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               disabled={!valid}
               hint={t('Сохранить направление DD')}
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

// The DD's frame: its deadline, the outside DD's cost, what speaks for the
// deal (a line each) and the warning the committee sees first.
const FrameForm = ({ deal, onClose }: { deal: Deal; onClose: () => void }) => {
   const { t } = useTranslation('deals');
   const dd = deal.dd;
   const [values, setValues] = useState({
      due: dd?.due ?? '',
      cost: dd?.external.value.replace(/[^\d]/g, '') ?? '',
      costNote: dd?.external.note ?? '',
      closedNote: dd?.closedNote ?? '',
      strengths: dd?.strengths.join('\n') ?? '',
      alertTitle: dd?.alert?.title ?? '',
      alertText: dd?.alert?.text ?? '',
   });
   const saving = useRequest();
   const set = (patch: Partial<typeof values>) =>
      setValues((prev) => ({ ...prev, ...patch }));

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const cost = Number(values.cost.replace(/\s/g, ''));
      if (
         await saving.run(async () => {
            await deals.setDd(deal.id, {
               due: values.due,
               closedNote: values.closedNote.trim(),
               external: {
                  value: cost > 0 ? `$${cost.toLocaleString('ru-RU')}` : '',
                  note: values.costNote.trim(),
               },
               strengths: values.strengths
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean),
               alert: values.alertTitle.trim()
                  ? {
                       title: values.alertTitle.trim(),
                       text: values.alertText.trim(),
                    }
                  : null,
            });
         })
      )
         onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4 sm:grid-cols-2'>
               <Field label={t('Срок DD')}>
                  <input
                     data-autofocus
                     className='field-input'
                     type='date'
                     value={values.due}
                     onChange={(event) => set({ due: event.target.value })}
                  />
               </Field>
               <Field label={t('Внешний DD, $')}>
                  <input
                     className='field-input'
                     inputMode='numeric'
                     value={values.cost}
                     onChange={(event) => set({ cost: event.target.value })}
                  />
               </Field>
               <Field
                  className='sm:col-span-2'
                  hint={t('например, «2 договора: юридический и финансовый»')}
                  label={t('О внешнем DD')}
               >
                  <input
                     className='field-input'
                     maxLength={200}
                     value={values.costNote}
                     onChange={(event) => set({ costNote: event.target.value })}
                  />
               </Field>
               <Field
                  className='sm:col-span-2'
                  label={t('Итог по направлениям')}
               >
                  <input
                     className='field-input'
                     maxLength={200}
                     value={values.closedNote}
                     onChange={(event) =>
                        set({ closedNote: event.target.value })
                     }
                  />
               </Field>
               <Field
                  className='sm:col-span-2'
                  hint={t('Каждый фактор с новой строки')}
                  label={t('Факторы в пользу')}
               >
                  <textarea
                     className='field-input field-sizing-content min-h-20 resize-none'
                     maxLength={1000}
                     value={values.strengths}
                     onChange={(event) =>
                        set({ strengths: event.target.value })
                     }
                  />
               </Field>
               <Field
                  className='sm:col-span-2'
                  hint={t(
                     'То, что ИК должен увидеть первым; пусто — без предупреждения',
                  )}
                  label={t('Предупреждение')}
               >
                  <input
                     className='field-input'
                     maxLength={160}
                     value={values.alertTitle}
                     onChange={(event) =>
                        set({ alertTitle: event.target.value })
                     }
                  />
               </Field>
               {values.alertTitle.trim() && (
                  <Field className='sm:col-span-2' label={t('Подробнее')}>
                     <textarea
                        className='field-input field-sizing-content min-h-16 resize-none'
                        maxLength={600}
                        value={values.alertText}
                        onChange={(event) =>
                           set({ alertText: event.target.value })
                        }
                     />
                  </Field>
               )}
            </div>
         </ModalBody>
         <ModalFooter>
            <Button
               hint={t('Закрыть окно, ничего не меняя')}
               variant='text'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               hint={t('Сохранить рамки DD')}
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

export default DueDiligence;

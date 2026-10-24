import { RisksCard } from '@modules/Deals/components';
import {
   WORKSTREAM_STATUS_LABELS,
   WORKSTREAM_STATUS_TONES,
} from '@modules/Deals/constants';
import { isOpen } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import {
   Attachments,
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
   STACK,
} from '@shared/components';
import { formatDate } from '@shared/helpers';
import type {
   Deal,
   Workstream,
   WorkstreamStatus,
} from '@shared/types/deals.types';
import clsx from 'clsx';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useRequest } from '@shared/hooks';

interface DueDiligenceProps {
   deal: Deal;
}

const TH = 'px-3 py-2.5 text-xs font-normal text-ink-soft';

/* Detailed DD: its frame (deadline, the outside DD's cost, what speaks for
   the deal), the workstreams with who does each and their reports, and the
   risks found. The owner changes the frame and each workstream here. */
const DueDiligence = ({ deal }: DueDiligenceProps) => {
   const { t } = useTranslation('deals');
   const streams = deal.workstreams ?? [];
   const risks = deal.risks ?? [];
   const closed = streams.filter(({ status }) => status === 'done').length;
   const high = risks.filter(({ level }) => level === 'high').length;
   const { dd } = deal;
   const editable = isOpen(deal);
   const [editing, setEditing] = useState<Workstream | null>(null);
   const [removing, setRemoving] = useState<Workstream | null>(null);
   const [framing, setFraming] = useState(false);

   const tiles = (dd || streams.length > 0) && [
      ...(deal.stage === 'dd' && deal.days
         ? [
              {
                 label: t('Срок стадии'),
                 value: t('{{used}} из {{norm}} р.д.', deal.days),
                 note: `${dd?.due ? `${t('до {{date}}', { date: formatDate(dd.due) })} · ` : ''}${
                    deal.clock?.pausedDays
                       ? t('на паузе {{total}} р.д.', {
                            total: deal.clock.pausedDays,
                         })
                       : t('пауз не было')
                 }`,
                 tone: '',
              },
           ]
         : []),
      {
         label: t('Направлений закрыто'),
         value: t('{{done}} из {{total}}', {
            done: closed,
            total: streams.length,
         }),
         note: dd?.closedNote ?? '',
         tone: closed < streams.length ? 'text-warning-ink' : '',
      },
      {
         label: t('Открытых рисков'),
         value: String(risks.length),
         note: `${t('{{count}} высокий', { count: high })} · ${
            risks.every(({ ownerId }) => ownerId)
               ? t('владельцы назначены')
               : t('не у всех есть владелец')
         }`,
         tone: risks.length ? 'text-danger' : '',
      },
      {
         label: t('Внешний DD по договорам'),
         value: dd?.external.value || '—',
         note: dd?.external.note ?? '',
         tone: '',
      },
   ];

   return (
      <div className='gap-section flex flex-1 flex-col'>
         {tiles && (
            <dl className='gap-section grid grid-cols-2 xl:grid-cols-4'>
               {tiles.map((tile) => (
                  <div
                     key={tile.label}
                     className='border-line rounded-lg border bg-white px-5 py-4'
                  >
                     <dt className='text-ink-soft text-xs'>{tile.label}</dt>
                     <dd>
                        <div
                           className={clsx(
                              'text-display mt-1.5 font-bold tabular-nums',
                              tile.tone,
                           )}
                        >
                           {tile.value}
                        </div>
                        <div className='text-ink-soft mt-1.5 text-xs'>
                           {tile.note}
                        </div>
                     </dd>
                  </div>
               ))}
            </dl>
         )}

         <Card className='overflow-hidden' title={t('Направления DD')}>
            {streams.length ? (
               <div className='overflow-x-auto'>
                  <table className='text-meta w-full min-w-4xl border-collapse text-left'>
                     <thead>
                        <tr className='bg-ground border-line border-b'>
                           <th className={`${TH} pl-5`}>{t('Направление')}</th>
                           <th className={TH}>
                              {t('Исполнитель и основание')}
                           </th>
                           <th className={TH}>{t('Передано')}</th>
                           <th className={TH}>{t('Срок')}</th>
                           <th className={TH}>{t('Статус')}</th>
                           <th className={`${TH} pr-5`}>{t('Вывод')}</th>
                           {editable && (
                              <th className={`${TH} w-10 pr-5`}>
                                 <span className='sr-only'>
                                    {t('Действия')}
                                 </span>
                              </th>
                           )}
                        </tr>
                     </thead>
                     <tbody className='divide-line divide-y'>
                        {streams.map((stream) => (
                           <tr key={stream.id} className='align-top'>
                              <td className='py-3.5 pr-3 pl-5 text-sm font-semibold'>
                                 {stream.name}
                              </td>
                              <td className='w-[27%] px-3 py-3.5'>
                                 {stream.executor}
                              </td>
                              <td className='text-ink-soft px-3 py-3.5 whitespace-nowrap'>
                                 {stream.handedAt
                                    ? formatDate(stream.handedAt)
                                    : '—'}
                              </td>
                              <td className='text-ink-soft px-3 py-3.5 whitespace-nowrap'>
                                 {formatDate(stream.dueDate)}
                              </td>
                              <td className='px-3 py-3.5'>
                                 <Badge
                                    tone={
                                       WORKSTREAM_STATUS_TONES[stream.status]
                                    }
                                 >
                                    {t(WORKSTREAM_STATUS_LABELS[stream.status])}
                                 </Badge>
                              </td>
                              <td className='text-ink-soft w-[25%] py-3.5 pr-5 pl-3 text-xs'>
                                 {stream.conclusion || '—'}
                                 {/* the executor's report and other files */}
                                 <Attachments
                                    className='mt-2'
                                    editable={editable}
                                    place={{
                                       dealId: deal.id,
                                       section: 'workstream',
                                       itemId: stream.id,
                                    }}
                                 />
                              </td>
                              {editable && (
                                 <td className='py-3.5 pr-5'>
                                    <ItemActions
                                       className='flex-col items-start'
                                       name={stream.name}
                                       onDelete={() => setRemoving(stream)}
                                       onEdit={() => setEditing(stream)}
                                    />
                                 </td>
                              )}
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            ) : (
               <NoData>{t('Направлений DD пока нет')}</NoData>
            )}
         </Card>

         <div className='gap-section grid flex-1 xl:grid-cols-[minmax(0,1fr)_23.75rem]'>
            <RisksCard
               deal={deal}
               editable={isOpen(deal)}
               link={
                  deal.memo && (
                     <Link className='link' to='?tab=memo'>
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
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button disabled={!valid} loading={saving.pending} type='submit'>
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
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button loading={saving.pending} type='submit'>
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

export default DueDiligence;

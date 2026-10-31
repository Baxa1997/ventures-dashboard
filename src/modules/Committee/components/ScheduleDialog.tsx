import { stageName } from '@modules/Settings/services';
import DealPicker from '@modules/Committee/components/DealPicker';
import MemberDialog from '@modules/Committee/components/MemberDialog';
import {
   COMMITTEE_PATH,
   FORMAT_OPTIONS,
   IC_RULES,
   MEMBER_ROLE_LABELS,
} from '@modules/Committee/constants';
import {
   activeMembers,
   meetingName,
   waitingDeals,
} from '@modules/Committee/helpers';
import type { CommitteeData } from '@modules/Committee/hooks';
import committee from '@modules/Committee/services';
import {
   Button,
   Checkbox,
   ConfirmDialog,
   Field,
   ItemActions,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { addWorkingDays, formatDate, todayISO } from '@shared/helpers';
import { useAction } from '@shared/hooks';
import type {
   CommitteeBody,
   CommitteeMember,
   CommitteeStage,
   Meeting,
} from '@shared/types/committee.types';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface ScheduleDialogProps {
   data: CommitteeData;
   open: boolean;
   dealId?: string; // a deal to put on the agenda, from its card
   onClose: () => void;
   onScheduled: (meeting: Meeting) => void;
}

// The Friday after the last planned meeting, or the coming Friday.
const nextFriday = (data: CommitteeData) => {
   const last = data.meetings
      .filter(({ status }) => status !== 'held')
      .map(({ date }) => date)
      .sort()
      .at(-1);
   let day = dayjs(last ?? todayISO()).add(1, 'day');
   while (day.day() !== 5) day = day.add(1, 'day');
   return day.format('YYYY-MM-DD');
};

/* A new meeting of the committee or the board. The agenda offers the deals
   waiting for that stage which no planned meeting has on its agenda yet; the
   type of meeting starts at the one deals are waiting for, or at the deal the
   dialog was opened for. The participants are picked here, everyone at
   first; a new person is added on the spot. The quorum counts them. */
const ScheduleDialog = ({
   data,
   open,
   dealId,
   onClose,
   onScheduled,
}: ScheduleDialogProps) => {
   const { t } = useTranslation('committee');
   const [body, setBody] = useState<CommitteeBody>('ic');
   const [stage, setStage] = useState<CommitteeStage>('ic1');
   const [date, setDate] = useState(() => nextFriday(data));
   const [time, setTime] = useState('15:00');
   const [format, setFormat] = useState<string>(FORMAT_OPTIONS[0]);
   const [dealIds, setDealIds] = useState<string[]>([]);
   const [participantIds, setParticipantIds] = useState<string[]>([]);
   // a person being added ('new') or changed, and one leaving the committee
   const [person, setPerson] = useState<CommitteeMember | 'new' | null>(null);
   const [retiring, setRetiring] = useState<CommitteeMember | null>(null);
   const [error, setError] = useState('');
   // closes the form once ucode has the meeting
   const scheduling = useAction(
      async () => {
         const meeting = await committee.scheduleMeeting({
            body,
            stage: body === 'ic' ? stage : null,
            date,
            time,
            format,
            dealIds,
            participantIds,
         });
         onClose();
         onScheduled(meeting);
      },
      {
         kind: 'create',
         success: t('Заседание назначено'),
         error: t('Не удалось назначить заседание'),
      },
   );
   const members = activeMembers(data.members);

   const waiting = waitingDeals(
      data.meetings,
      data.deals,
      body,
      body === 'ic' ? stage : null,
   );
   // a meeting of this type that is already planned can take the deals too
   const planned = data.meetings
      .filter(
         (meeting) =>
            meeting.status === 'planned' &&
            meeting.body === body &&
            (body === 'board' || meeting.stage === stage),
      )
      .sort((a, b) => a.date.localeCompare(b.date))[0];

   useEffect(() => {
      if (!open) return;
      const deal = data.deals.find(({ id }) => id === dealId);
      const waitingFor = (value: CommitteeStage) =>
         waitingDeals(data.meetings, data.deals, 'ic', value).length;
      const firstBody = deal?.stage === 'board' ? 'board' : 'ic';
      setBody(firstBody);
      const first: CommitteeStage = deal
         ? deal.stage === 'ic2'
            ? 'ic2'
            : 'ic1'
         : waitingFor('ic2') && !waitingFor('ic1')
           ? 'ic2'
           : 'ic1';
      setStage(first);
      setDate(nextFriday(data));
      // the deal it was opened for, or every deal waiting for that meeting;
      // a deal already on an agenda, or approved at its stage, waits for none
      const offered = waitingDeals(
         data.meetings,
         data.deals,
         firstBody,
         firstBody === 'ic' ? first : null,
      ).map(({ id }) => id);
      setDealIds(deal ? offered.filter((id) => id === deal.id) : offered);
      setParticipantIds(activeMembers(data.members).map(({ id }) => id));
      setError('');
      // the dialog starts afresh each time it opens, not as the data changes
   }, [open, dealId]);

   const submit = async () => {
      if (!date || date < todayISO()) {
         setError(t('Выберите дату не раньше сегодняшней'));
         return;
      }
      scheduling.run();
   };

   return (
      <>
         <MemberDialog
            member={person}
            onClose={() => setPerson(null)}
            onCreated={(id) => setParticipantIds((prev) => [...prev, id])}
         />
         <ConfirmDialog
            confirmLabel={t('Убрать')}
            error={t('Не удалось убрать из состава')}
            open={retiring !== null}
            success={t('Убран из состава ИК')}
            title={t('Убрать {{name}} из состава ИК?', {
               name: retiring?.name ?? '',
            })}
            onClose={() => setRetiring(null)}
            onConfirm={async () => {
               if (!retiring) return;
               await committee.retireMember(retiring.id);
               setParticipantIds((prev) =>
                  prev.filter((id) => id !== retiring.id),
               );
            }}
         >
            <p>
               {t(
                  'Его снимут со всех назначенных заседаний и больше не будут предлагать; в прошлых заседаниях и протоколах он останется.',
               )}
            </p>
         </ConfirmDialog>
         <Modal open={open} title={t('Назначить заседание')} onClose={onClose}>
            <form
               className={MODAL_FORM}
               onSubmit={(event) => {
                  event.preventDefault();
                  submit();
               }}
            >
               <ModalBody>
                  <div className='grid gap-4 sm:grid-cols-2'>
                     <Field label={t('Орган')}>
                        <select
                           className='field-input'
                           value={body}
                           onChange={(event) => {
                              setBody(event.target.value as CommitteeBody);
                              setDealIds([]);
                           }}
                        >
                           <option value='ic'>
                              {t('Инвестиционный комитет')}
                           </option>
                           <option value='board'>
                              {t('Наблюдательный совет')}
                           </option>
                        </select>
                     </Field>
                     {body === 'ic' && (
                        <Field label={t('Тип')}>
                           <select
                              className='field-input'
                              value={stage}
                              onChange={(event) => {
                                 setStage(event.target.value as CommitteeStage);
                                 setDealIds([]);
                              }}
                           >
                              {(['ic1', 'ic2'] as const).map((value) => (
                                 <option key={value} value={value}>
                                    {stageName(value)}
                                 </option>
                              ))}
                           </select>
                        </Field>
                     )}
                     <Field error={error} label={t('Дата')}>
                        <input
                           aria-invalid={!!error}
                           className='field-input'
                           type='date'
                           value={date}
                           onChange={(event) => {
                              setDate(event.target.value);
                              setError('');
                           }}
                        />
                     </Field>
                     <Field label={t('Время')}>
                        <input
                           className='field-input'
                           type='time'
                           value={time}
                           onChange={(event) => setTime(event.target.value)}
                        />
                     </Field>
                     <Field className='sm:col-span-2' label={t('Формат')}>
                        <select
                           className='field-input'
                           value={format}
                           onChange={(event) => setFormat(event.target.value)}
                        >
                           {FORMAT_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                 {t(option)}
                              </option>
                           ))}
                        </select>
                     </Field>
                  </div>
                  <fieldset className='mt-5'>
                     <legend className='text-ink-soft text-xs font-medium'>
                        {t('Повестка')}
                     </legend>
                     {waiting.length ? (
                        <DealPicker
                           deals={waiting}
                           value={dealIds}
                           onChange={setDealIds}
                        />
                     ) : (
                        <p className='text-ink-soft mt-2'>
                           {t(
                              'Сделок, которые ждут этого заседания, сейчас нет — вопросы можно добавить позже.',
                           )}
                        </p>
                     )}
                     {planned && (
                        <p className='text-ink-soft mt-4 text-xs'>
                           {t(
                              '{{name}} на {{date}} уже назначено — сделки можно добавить в его повестку.',
                              {
                                 name: meetingName(t, planned),
                                 date: formatDate(planned.date),
                              },
                           )}{' '}
                           <Link
                              className='link'
                              data-hint={t('Открыть страницу заседания')}
                              to={`${COMMITTEE_PATH}/${planned.id}`}
                              onClick={onClose}
                           >
                              {t('Открыть заседание')}
                           </Link>
                        </p>
                     )}
                  </fieldset>
                  <fieldset className='mt-5'>
                     <legend className='text-ink-soft text-xs font-medium'>
                        {t('Участники')}
                     </legend>
                     <ul className='mt-2 flex flex-col gap-2'>
                        {members.map((member) => {
                           const checked = participantIds.includes(member.id);
                           return (
                              <li
                                 key={member.id}
                                 className='flex items-center gap-3'
                              >
                                 <label className='flex min-w-0 flex-1 items-center gap-2.5'>
                                    <Checkbox
                                       checked={checked}
                                       hint={t(
                                          'Включить человека в состав заседания или убрать',
                                       )}
                                       label={member.name}
                                       onChange={() =>
                                          setParticipantIds((prev) =>
                                             checked
                                                ? prev.filter(
                                                     (id) => id !== member.id,
                                                  )
                                                : [...prev, member.id],
                                          )
                                       }
                                    />
                                    <span className='font-medium'>
                                       {member.name}
                                    </span>
                                    <span className='text-ink-soft text-xs'>
                                       {[
                                          t(MEMBER_ROLE_LABELS[member.role]),
                                          member.remote && t('по видео'),
                                       ]
                                          .filter(Boolean)
                                          .join(' · ')}
                                    </span>
                                 </label>
                                 <ItemActions
                                    className='text-xs'
                                    deleteLabel={t('Убрать')}
                                    name={member.name}
                                    onDelete={() => setRetiring(member)}
                                    onEdit={() => setPerson(member)}
                                 />
                              </li>
                           );
                        })}
                     </ul>
                     <button
                        type='button'
                        className='link mt-2.5'
                        data-hint={t('Добавить нового человека в состав ИК')}
                        onClick={() => setPerson('new')}
                     >
                        {t('Добавить человека')}
                     </button>
                     {participantIds.length < IC_RULES.quorum && (
                        <p className='text-warning-ink mt-2 text-xs'>
                           {t(
                              'Для кворума нужно не меньше {{count}} участников — заседание не откроется без них.',
                              { count: IC_RULES.quorum },
                           )}
                        </p>
                     )}
                  </fieldset>
               </ModalBody>
               <ModalFooter
                  note={
                     date &&
                     t('Материалы членам ИК — до {{date}}', {
                        date: formatDate(
                           addWorkingDays(date, -IC_RULES.materialsDays),
                        ),
                     })
                  }
               >
                  <Button
                     hint={t('Закрыть окно, ничего не меняя')}
                     variant='ghost'
                     onClick={onClose}
                  >
                     {t('Отмена')}
                  </Button>
                  <Button
                     hint={t(
                        'Создать заседание с этими датой, составом и повесткой',
                     )}
                     loading={scheduling.pending}
                     type='submit'
                  >
                     {t('Назначить')}
                  </Button>
               </ModalFooter>
            </form>
         </Modal>
      </>
   );
};

export default ScheduleDialog;

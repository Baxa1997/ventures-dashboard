import DealPicker from '@modules/Committee/components/DealPicker';
import {
   COMMITTEE_PATH,
   FORMAT_OPTIONS,
   IC_RULES,
   STAGE_LABELS,
} from '@modules/Committee/constants';
import { meetingName, waitingDeals } from '@modules/Committee/helpers';
import type { CommitteeData } from '@modules/Committee/hooks';
import committee from '@modules/Committee/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { addWorkingDays, formatDate, todayISO } from '@shared/helpers';
import type {
   CommitteeBody,
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
   dialog was opened for. */
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
   const [error, setError] = useState('');

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
      setBody(deal?.stage === 'board' ? 'board' : 'ic');
      const first: CommitteeStage = deal
         ? deal.stage === 'ic2'
            ? 'ic2'
            : 'ic1'
         : waitingFor('ic2') && !waitingFor('ic1')
           ? 'ic2'
           : 'ic1';
      setStage(first);
      setDate(nextFriday(data));
      // the deal it was opened for, or every deal waiting for that meeting
      setDealIds(
         deal
            ? [deal.id]
            : waitingDeals(data.meetings, data.deals, 'ic', first).map(
                 ({ id }) => id,
              ),
      );
      setError('');
      // the dialog starts afresh each time it opens, not as the data changes
   }, [open, dealId]);

   const submit = async () => {
      if (!date || date < todayISO()) {
         setError(t('Выберите дату не раньше сегодняшней'));
         return;
      }
      const meeting = await committee.scheduleMeeting({
         body,
         stage: body === 'ic' ? stage : null,
         date,
         time,
         format,
         dealIds,
      });
      onClose();
      onScheduled(meeting);
   };

   return (
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
                                 {t(STAGE_LABELS[value])}
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
                           to={`${COMMITTEE_PATH}/${planned.id}`}
                           onClick={onClose}
                        >
                           {t('Открыть заседание')}
                        </Link>
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
               <Button variant='ghost' onClick={onClose}>
                  {t('Отмена')}
               </Button>
               <Button type='submit'>{t('Назначить')}</Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default ScheduleDialog;

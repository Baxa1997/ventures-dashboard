import {
   FORMAT_OPTIONS,
   IC_RULES,
   STAGE_LABELS,
} from '@modules/Committee/constants';
import type { CommitteeData } from '@modules/Committee/hooks';
import committee from '@modules/Committee/services';
import {
   Button,
   Checkbox,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import {
   addWorkingDays,
   formatDate,
   formatUsd,
   todayISO,
} from '@shared/helpers';
import type {
   CommitteeBody,
   CommitteeStage,
   Meeting,
} from '@shared/types/committee.types';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ScheduleDialogProps {
   data: CommitteeData;
   open: boolean;
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
   waiting for that stage which no planned meeting has on its agenda yet. */
const ScheduleDialog = ({
   data,
   open,
   onClose,
   onScheduled,
}: ScheduleDialogProps) => {
   const { t, i18n } = useTranslation('committee');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const [body, setBody] = useState<CommitteeBody>('ic');
   const [stage, setStage] = useState<CommitteeStage>('ic2');
   const [date, setDate] = useState(() => nextFriday(data));
   const [time, setTime] = useState('15:00');
   const [format, setFormat] = useState<string>(FORMAT_OPTIONS[0]);
   const [dealIds, setDealIds] = useState<string[]>([]);
   const [error, setError] = useState('');

   const planned = new Set(
      data.meetings
         .filter(({ status }) => status !== 'held')
         .flatMap(({ agenda }) => agenda.map(({ dealId }) => dealId)),
   );
   const waiting = data.deals.filter(
      (deal) =>
         deal.status === 'active' &&
         !planned.has(deal.id) &&
         (body === 'board' ? deal.stage === 'board' : deal.stage === stage),
   );

   const close = () => {
      setDate(nextFriday(data));
      setDealIds([]);
      setError('');
      onClose();
   };

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
      close();
      onScheduled(meeting);
   };

   return (
      <Modal open={open} title={t('Назначить заседание')} onClose={close}>
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
                     <ul className='mt-2 flex flex-col gap-2.5'>
                        {waiting.map((deal) => {
                           const checked = dealIds.includes(deal.id);
                           const toggle = () =>
                              setDealIds((prev) =>
                                 checked
                                    ? prev.filter((value) => value !== deal.id)
                                    : [...prev, deal.id],
                              );
                           return (
                              <li
                                 key={deal.id}
                                 className='flex items-center gap-3'
                              >
                                 <Checkbox
                                    checked={checked}
                                    label={deal.company}
                                    onChange={toggle}
                                 />
                                 <button
                                    type='button'
                                    className='text-left'
                                    onClick={toggle}
                                 >
                                    <span className='font-medium'>
                                       {deal.company}
                                    </span>
                                    <span className='text-ink-soft ml-2 text-xs'>
                                       {formatUsd(deal.amount, language)}
                                    </span>
                                 </button>
                              </li>
                           );
                        })}
                     </ul>
                  ) : (
                     <p className='text-ink-soft mt-2'>
                        {t(
                           'Сделок, которые ждут этого заседания, сейчас нет — вопросы можно добавить позже.',
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
               <Button variant='ghost' onClick={close}>
                  {t('Отмена')}
               </Button>
               <Button type='submit'>{t('Назначить')}</Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default ScheduleDialog;

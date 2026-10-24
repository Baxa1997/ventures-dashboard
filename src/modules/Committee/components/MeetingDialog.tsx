import { FORMAT_OPTIONS } from '@modules/Committee/constants';
import committee from '@modules/Committee/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import type { Meeting } from '@shared/types/committee.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRequest } from '@shared/hooks';

interface MeetingDialogProps {
   meeting: Meeting;
   open: boolean;
   onClose: () => void;
}

const MeetingForm = ({
   meeting,
   onClose,
}: Omit<MeetingDialogProps, 'open'>) => {
   const { t } = useTranslation('committee');
   const [values, setValues] = useState({
      date: meeting.date,
      time: meeting.time,
      format: meeting.format,
   });
   const saving = useRequest();
   const set = (patch: Partial<typeof values>) =>
      setValues((prev) => ({ ...prev, ...patch }));

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (
         await saving.run(async () => {
            await committee.updateMeeting(meeting.id, values);
         })
      )
         onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4 sm:grid-cols-2'>
               <Field label={t('Дата')}>
                  <input
                     data-autofocus
                     className='field-input'
                     type='date'
                     value={values.date}
                     onChange={(event) => set({ date: event.target.value })}
                  />
               </Field>
               <Field label={t('Время')}>
                  <input
                     className='field-input'
                     type='time'
                     value={values.time}
                     onChange={(event) => set({ time: event.target.value })}
                  />
               </Field>
               <Field className='sm:col-span-2' label={t('Формат')}>
                  <select
                     className='field-input'
                     value={values.format}
                     onChange={(event) => set({ format: event.target.value })}
                  >
                     {FORMAT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                           {t(option)}
                        </option>
                     ))}
                     {/* a format the list does not have stays offered */}
                     {!FORMAT_OPTIONS.some(
                        (option) => option === meeting.format,
                     ) && (
                        <option value={meeting.format}>{meeting.format}</option>
                     )}
                  </select>
               </Field>
            </div>
         </ModalBody>
         <ModalFooter
            note={t('Срок рассылки материалов сдвинется вместе с датой')}
         >
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button
               disabled={!values.date}
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

// The day, time and format of a meeting that has not opened yet.
const MeetingDialog = ({ meeting, open, onClose }: MeetingDialogProps) => {
   const { t } = useTranslation('committee');

   return (
      <Modal open={open} title={t('Заседание')} onClose={onClose}>
         {open && <MeetingForm meeting={meeting} onClose={onClose} />}
      </Modal>
   );
};

export default MeetingDialog;

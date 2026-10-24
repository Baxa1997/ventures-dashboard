import committee from '@modules/Committee/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { useRequest } from '@shared/hooks';
import type { Meeting } from '@shared/types/committee.types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SignDialogProps {
   meeting: Meeting;
   open: boolean;
   onClose: () => void;
}

const isLink = (value: string) => /^https?:\/\/\S+$/.test(value);

/* The members have signed the printed protocol; the secretary marks it with
   a link to the signed copy, so the register shows the proof. */
const SignDialog = ({ meeting, open, onClose }: SignDialogProps) => {
   const { t } = useTranslation('committee');
   const [link, setLink] = useState('');
   const [error, setError] = useState('');
   const saving = useRequest({ success: t('Протокол отмечен подписанным') });

   useEffect(() => {
      if (!open) return;
      setLink('');
      setError('');
   }, [open]);

   const submit = async () => {
      const value = link.trim();
      if (!isLink(value))
         return setError(
            value
               ? t('Ссылка должна начинаться с https://')
               : t('Вставьте ссылку на подписанный протокол'),
         );
      if (await saving.run(() => committee.signProtocol(meeting.id, value)))
         onClose();
   };

   return (
      <Modal open={open} title={t('Протокол подписан')} onClose={onClose}>
         <form
            className={MODAL_FORM}
            onSubmit={(event) => {
               event.preventDefault();
               void submit();
            }}
         >
            <ModalBody>
               <p className='text-meta mb-4'>
                  {t(
                     'Отметьте, когда все члены подписали протокол — на бумаге или электронной подписью.',
                  )}
               </p>
               <Field
                  error={error}
                  hint={t('Где лежит подписанный скан: диск, SharePoint, Notion')}
                  label={t('Ссылка на подписанный протокол')}
               >
                  <input
                     data-autofocus
                     aria-invalid={!!error}
                     className='field-input'
                     inputMode='url'
                     placeholder='https://'
                     value={link}
                     onChange={(event) => {
                        setLink(event.target.value);
                        setError('');
                     }}
                  />
               </Field>
            </ModalBody>
            <ModalFooter
               note={t(
                  'Файл остаётся там, где его хранит фонд: в ucode Files он был бы открыт любому, у кого есть ссылка',
               )}
            >
               <Button variant='ghost' onClick={onClose}>
                  {t('Отмена')}
               </Button>
               <Button loading={saving.pending} type='submit'>
                  {t('Сохранить')}
               </Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default SignDialog;

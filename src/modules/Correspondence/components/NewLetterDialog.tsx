import correspondence from '@modules/Correspondence/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { TEAM } from '@shared/constants';
import { addWorkingDays, shortName, todayISO } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { LetterDirection } from '@shared/types/correspondence.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface NewLetterDialogProps {
   direction: LetterDirection | null; // null — closed
   onClose: () => void;
}

/* Registers an incoming letter with its number and answer date, or starts an
   outgoing one as a draft for the director's signature. */
const NewLetterDialog = ({ direction, onClose }: NewLetterDialogProps) => {
   const { t } = useTranslation('correspondence');
   const user = useCurrentUser();
   const incoming = direction === 'in';
   const [party, setParty] = useState('');
   const [subject, setSubject] = useState('');
   const [number, setNumber] = useState('');
   const [ownerId, setOwnerId] = useState(user.id);
   const [replyDue, setReplyDue] = useState(() =>
      addWorkingDays(todayISO(), 5),
   );
   const [errors, setErrors] = useState<{ party?: string; subject?: string }>(
      {},
   );

   const close = () => {
      setParty('');
      setSubject('');
      setNumber('');
      setErrors({});
      onClose();
   };

   return (
      <Modal
         open={direction !== null}
         title={
            incoming ? t('Зарегистрировать входящее') : t('Новое исходящее')
         }
         onClose={close}
      >
         <form
            className={MODAL_FORM}
            onSubmit={async (event) => {
               event.preventDefault();
               const next = {
                  party: party.trim() ? undefined : t('Укажите контрагента'),
                  subject: subject.trim()
                     ? undefined
                     : t('Укажите тему письма'),
               };
               setErrors(next);
               if (!direction || next.party || next.subject) return;
               await correspondence.createLetter({
                  direction,
                  number: number.trim(),
                  party: party.trim(),
                  subject: subject.trim(),
                  ownerId,
                  replyDue,
               });
               close();
            }}
         >
            <ModalBody>
               <div className='grid gap-4 sm:grid-cols-2'>
                  <Field
                     className='sm:col-span-2'
                     error={errors.party}
                     label={incoming ? t('От кого') : t('Кому')}
                  >
                     <input
                        data-autofocus
                        aria-invalid={!!errors.party}
                        className='field-input'
                        value={party}
                        onChange={(event) => setParty(event.target.value)}
                     />
                  </Field>
                  <Field
                     className='sm:col-span-2'
                     error={errors.subject}
                     label={t('Тема')}
                  >
                     <input
                        aria-invalid={!!errors.subject}
                        className='field-input'
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                     />
                  </Field>
                  {incoming && (
                     <Field label={t('Входящий номер')}>
                        <input
                           className='field-input'
                           value={number}
                           onChange={(event) => setNumber(event.target.value)}
                        />
                     </Field>
                  )}
                  <Field
                     label={incoming ? t('Срок ответа') : t('Отправить до')}
                  >
                     <input
                        className='field-input'
                        type='date'
                        value={replyDue}
                        onChange={(event) => setReplyDue(event.target.value)}
                     />
                  </Field>
                  <Field label={t('Ответственный')}>
                     <select
                        className='field-input'
                        value={ownerId}
                        onChange={(event) => setOwnerId(event.target.value)}
                     >
                        {TEAM.map((employee) => (
                           <option key={employee.id} value={employee.id}>
                              {shortName(employee.name)}
                           </option>
                        ))}
                     </select>
                  </Field>
               </div>
            </ModalBody>
            <ModalFooter
               note={
                  incoming
                     ? t('Письмо попадёт в «Ждут ответа фонда»')
                     : t('Черновик уйдёт директору на подпись')
               }
            >
               <Button variant='ghost' onClick={close}>
                  {t('Отмена')}
               </Button>
               <Button type='submit'>
                  {incoming ? t('Зарегистрировать') : t('Создать черновик')}
               </Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default NewLetterDialog;

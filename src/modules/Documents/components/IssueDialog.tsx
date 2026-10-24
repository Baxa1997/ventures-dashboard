import { NOTE_MAX, TITLE_MAX } from '@modules/Documents/constants';
import documents from '@modules/Documents/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { TEAM } from '@shared/constants';
import { useCurrentUser, useRequest } from '@shared/hooks';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface IssueDialogProps {
   open: boolean;
   onClose: () => void;
}

// An open question of corporate governance: what it is, what is being done,
// and who follows it.
const IssueDialog = ({ open, onClose }: IssueDialogProps) => {
   const { t } = useTranslation('documents');
   const user = useCurrentUser();
   const [title, setTitle] = useState('');
   const [note, setNote] = useState('');
   const [ownerId, setOwnerId] = useState('');
   const [error, setError] = useState('');
   const saving = useRequest({ kind: 'create', success: t('Вопрос добавлен') });

   useEffect(() => {
      if (!open) return;
      setTitle('');
      setNote('');
      setOwnerId(user.id);
      setError('');
   }, [open, user.id]);

   const submit = async () => {
      if (!title.trim()) return setError(t('Напишите, в чём вопрос'));
      if (
         await saving.run(async () => {
            await documents.addIssue({
               title: title.trim(),
               note: note.trim(),
               ownerId,
            });
         })
      )
         onClose();
   };

   return (
      <Modal open={open} title={t('Новый вопрос управления')} onClose={onClose}>
         <form
            className={MODAL_FORM}
            onSubmit={(event) => {
               event.preventDefault();
               void submit();
            }}
         >
            <ModalBody>
               <div className='flex flex-col gap-4'>
                  <Field error={error} label={t('Вопрос')}>
                     <input
                        data-autofocus
                        aria-invalid={!!error}
                        className='field-input'
                        maxLength={TITLE_MAX}
                        value={title}
                        onChange={(event) => {
                           setTitle(event.target.value);
                           setError('');
                        }}
                     />
                  </Field>
                  <Field label={t('Что делаем')}>
                     <textarea
                        className='field-input'
                        maxLength={NOTE_MAX}
                        rows={2}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                     />
                  </Field>
                  <Field label={t('Ответственный')}>
                     <select
                        className='field-input'
                        value={ownerId}
                        onChange={(event) => setOwnerId(event.target.value)}
                     >
                        {TEAM.map(({ id, name }) => (
                           <option key={id} value={id}>
                              {name}
                           </option>
                        ))}
                     </select>
                  </Field>
               </div>
            </ModalBody>
            <ModalFooter>
               <Button variant='ghost' onClick={onClose}>
                  {t('Отмена')}
               </Button>
               <Button loading={saving.pending} type='submit'>
                  {t('Добавить')}
               </Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default IssueDialog;

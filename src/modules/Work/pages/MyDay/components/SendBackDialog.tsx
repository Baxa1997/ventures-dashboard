import { getAssigneeId } from '@modules/Work/helpers';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { personName } from '@shared/helpers';
import { useRequest } from '@shared/hooks';
import type { Task } from '@shared/types/work.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SendBackDialogProps {
   task: Task | null; // null — closed
   onClose: () => void;
   onSendBack: (task: Task, note: string) => Promise<unknown>;
}

// «Вернуть на доработку»: what to fix goes to the task's comments, and the
// task goes back to work.
const SendBackDialog = ({ task, onClose, onSendBack }: SendBackDialogProps) => {
   const { t } = useTranslation('work');
   const [note, setNote] = useState('');
   const [error, setError] = useState('');
   const sending = useRequest({ success: t('Возвращено на доработку') });

   const close = () => {
      setNote('');
      setError('');
      onClose();
   };

   return (
      <Modal
         open={task !== null}
         subtitle={task?.title}
         title={t('Вернуть на доработку')}
         onClose={close}
      >
         <form
            className={MODAL_FORM}
            onSubmit={async (event) => {
               event.preventDefault();
               if (!task) return;
               if (!note.trim()) {
                  setError(t('Напишите, что исправить'));
                  return;
               }
               const text = t('Возвращено на доработку: {{note}}', {
                  note: note.trim(),
               });
               if (await sending.run(() => onSendBack(task, text))) close();
            }}
         >
            <ModalBody>
               <Field error={error} label={t('Что исправить')}>
                  <textarea
                     data-autofocus
                     aria-invalid={!!error}
                     className='field-input min-h-28'
                     placeholder={
                        task
                           ? t('Комментарий для {{name}}', {
                                name: personName(getAssigneeId(task)),
                             })
                           : undefined
                     }
                     value={note}
                     onChange={(event) => {
                        setNote(event.target.value);
                        setError('');
                     }}
                  />
               </Field>
            </ModalBody>
            <ModalFooter>
               <Button variant='ghost' onClick={close}>
                  {t('Отмена')}
               </Button>
               <Button loading={sending.pending} type='submit'>
                  {t('Вернуть')}
               </Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default SendBackDialog;

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
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// What is sent back, to whom, and how.
export interface SendBackTarget {
   title: string;
   personId: string;
   send: (note: string) => Promise<unknown>;
}

interface SendBackDialogProps {
   target: SendBackTarget | null; // null — closed
   onClose: () => void;
}

// «Вернуть на доработку»: what to fix goes with it, and it goes back to whoever
// prepared it: a task to work, a contract to its draft, a purchase to its first
// stage.
const SendBackDialog = ({ target, onClose }: SendBackDialogProps) => {
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
         open={target !== null}
         subtitle={target?.title}
         title={t('Вернуть на доработку')}
         onClose={close}
      >
         <form
            className={MODAL_FORM}
            onSubmit={async (event) => {
               event.preventDefault();
               if (!target) return;
               if (!note.trim()) {
                  setError(t('Напишите, что исправить'));
                  return;
               }
               if (await sending.run(() => target.send(note.trim()))) close();
            }}
         >
            <ModalBody>
               <Field error={error} label={t('Что исправить')}>
                  <textarea
                     data-autofocus
                     aria-invalid={!!error}
                     className='field-input min-h-28'
                     placeholder={
                        target
                           ? t('Комментарий для {{name}}', {
                                name: personName(target.personId),
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

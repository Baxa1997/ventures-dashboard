import portfolio from '@modules/Portfolio/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import type { CompanyRequest } from '@shared/types/portfolio.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AnswerDialogProps {
   request: CompanyRequest | null; // null — closed
   onClose: () => void;
}

// The fund's answer to a company's request; it closes the request.
const AnswerDialog = ({ request, onClose }: AnswerDialogProps) => {
   const { t } = useTranslation('portfolio');
   const [answer, setAnswer] = useState('');
   const [error, setError] = useState('');

   const close = () => {
      setAnswer('');
      setError('');
      onClose();
   };

   return (
      <Modal
         open={request !== null}
         subtitle={request?.title}
         title={t('Ответ компании')}
         onClose={close}
      >
         <form
            className={MODAL_FORM}
            onSubmit={async (event) => {
               event.preventDefault();
               if (!request) return;
               if (!answer.trim()) {
                  setError(t('Напишите ответ'));
                  return;
               }
               await portfolio.answerRequest(request.id, answer.trim());
               close();
            }}
         >
            <ModalBody>
               <Field error={error} label={t('Ответ')}>
                  <textarea
                     data-autofocus
                     aria-invalid={!!error}
                     className='field-input min-h-28'
                     value={answer}
                     onChange={(event) => {
                        setAnswer(event.target.value);
                        setError('');
                     }}
                  />
               </Field>
            </ModalBody>
            <ModalFooter note={t('Компания увидит ответ в своём кабинете')}>
               <Button variant='ghost' onClick={close}>
                  {t('Отмена')}
               </Button>
               <Button type='submit'>{t('Ответить и закрыть')}</Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default AnswerDialog;

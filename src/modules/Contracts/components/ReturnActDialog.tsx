import { monthName } from '@modules/Contracts/helpers';
import contracts from '@modules/Contracts/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import type { ContractAct } from '@shared/types/contracts.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ReturnActDialogProps {
   contractId: string;
   act: ContractAct | null; // null — closed
   onClose: () => void;
}

// An act goes back to the contractor with the reason.
const ReturnActDialog = ({
   contractId,
   act,
   onClose,
}: ReturnActDialogProps) => {
   const { t } = useTranslation('contracts');
   const [reason, setReason] = useState('');
   const [error, setError] = useState('');

   const close = () => {
      setReason('');
      setError('');
      onClose();
   };

   return (
      <Modal
         open={act !== null}
         title={t('Вернуть акт за {{month}}', {
            month: act ? monthName(act.month) : '',
         })}
         onClose={close}
      >
         <form
            className={MODAL_FORM}
            onSubmit={async (event) => {
               event.preventDefault();
               if (!act) return;
               if (!reason.trim()) {
                  setError(t('Напишите, что исправить'));
                  return;
               }
               await contracts.returnAct(
                  contractId,
                  act.id,
                  reason.trim(),
                  t('Акт за {{month}} возвращён: {{reason}}', {
                     month: monthName(act.month),
                     reason: reason.trim(),
                  }),
               );
               close();
            }}
         >
            <ModalBody>
               <Field error={error} label={t('Что исправить')}>
                  <textarea
                     data-autofocus
                     aria-invalid={!!error}
                     className='field-input min-h-24'
                     value={reason}
                     onChange={(event) => {
                        setReason(event.target.value);
                        setError('');
                     }}
                  />
               </Field>
            </ModalBody>
            <ModalFooter note={t('Исполнитель получит акт с замечанием')}>
               <Button variant='ghost' onClick={close}>
                  {t('Отмена')}
               </Button>
               <Button type='submit'>{t('Вернуть акт')}</Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default ReturnActDialog;

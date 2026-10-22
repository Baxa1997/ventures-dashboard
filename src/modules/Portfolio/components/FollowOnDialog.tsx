import deals from '@modules/Deals/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

interface FollowOnDialogProps {
   company: PortfolioCompany;
   open: boolean;
   onClose: () => void;
}

// A follow-on starts as a new deal in Сделки and goes through the same stages.
const FollowOnDialog = ({ company, open, onClose }: FollowOnDialogProps) => {
   const { t } = useTranslation('portfolio');
   const user = useCurrentUser();
   const navigate = useNavigate();
   const [amount, setAmount] = useState('');
   const [error, setError] = useState('');

   const close = () => {
      setAmount('');
      setError('');
      onClose();
   };

   return (
      <Modal
         open={open}
         subtitle={t('Сделка появится во «Входящих» и пройдёт те же стадии')}
         title={t('Follow-on в {{company}}', { company: company.name })}
         onClose={close}
      >
         <form
            className={MODAL_FORM}
            onSubmit={async (event) => {
               event.preventDefault();
               const value = Number(amount.replace(/\s/g, ''));
               if (!value || value <= 0) {
                  setError(t('Укажите сумму в долларах'));
                  return;
               }
               const deal = await deals.createDeal(
                  {
                     company: `${company.name} · follow-on`,
                     about: company.about,
                     industryKey: company.industryKey,
                     industry: company.tagline || company.about,
                     // Настройки → Источники: «Портфель (follow-on)»
                     source: 'portfolio',
                     amount: value,
                     country: 'UZ',
                     roundStage: 'seed',
                  },
                  user.id,
               );
               close();
               navigate(`/deals/${deal.id}`);
            }}
         >
            <ModalBody>
               <Field
                  error={error}
                  hint={t('Сумма, которую фонд готов вложить дополнительно')}
                  label={t('Сумма, $')}
               >
                  <input
                     data-autofocus
                     aria-invalid={!!error}
                     className='field-input'
                     inputMode='numeric'
                     value={amount}
                     onChange={(event) => {
                        setAmount(event.target.value);
                        setError('');
                     }}
                  />
               </Field>
            </ModalBody>
            <ModalFooter>
               <Button variant='ghost' onClick={close}>
                  {t('Отмена')}
               </Button>
               <Button type='submit'>{t('Открыть follow-on')}</Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default FollowOnDialog;

import { DEFAULT_BASES } from '@modules/Finance/constants';
import finance from '@modules/Finance/services';
import { useDeals } from '@modules/Deals/hooks';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { addWorkingDays, todayISO } from '@shared/helpers';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface NewPaymentDialogProps {
   open: boolean;
   taken: string[]; // deals that already have a payment under way
   onClose: () => void;
}

/* A payment for a deal at the closing stage. It waits for the usual bases —
   the decisions, the signed contract, the compliance check — before the
   accountant can pass it to the bank. */
const NewPaymentDialog = ({ open, taken, onClose }: NewPaymentDialogProps) => {
   const { t } = useTranslation('finance');
   const { deals } = useDeals();
   const closing = deals.filter(
      ({ id, status, stage }) =>
         status === 'active' &&
         (stage === 'closing' || stage === 'board') &&
         !taken.includes(id),
   );
   const [dealId, setDealId] = useState('');
   const [amount, setAmount] = useState('');
   const [due, setDue] = useState(() => addWorkingDays(todayISO(), 10));
   const [errors, setErrors] = useState<{ deal?: string; amount?: string }>({});

   const close = () => {
      setDealId('');
      setAmount('');
      setErrors({});
      onClose();
   };

   const submit = async () => {
      const deal = closing.find(({ id }) => id === dealId);
      const value = Number(amount.replace(/\s/g, ''));
      const next = {
         deal: deal ? undefined : t('Выберите сделку'),
         amount: value > 0 ? undefined : t('Укажите сумму в долларах'),
      };
      setErrors(next);
      if (!deal || next.amount) return;
      await finance.createPayment({
         title: deal.company,
         dealId: deal.id,
         amount: value,
         due,
         condition: '',
         bases: [...DEFAULT_BASES],
      });
      close();
   };

   return (
      <Modal open={open} title={t('Новый платёж по сделке')} onClose={close}>
         <form
            className={MODAL_FORM}
            onSubmit={(event) => {
               event.preventDefault();
               submit();
            }}
         >
            <ModalBody>
               <div className='flex flex-col gap-4'>
                  <Field error={errors.deal} label={t('Сделка')}>
                     <select
                        aria-invalid={!!errors.deal}
                        className='field-input'
                        value={dealId}
                        onChange={(event) => {
                           const deal = closing.find(
                              ({ id }) => id === event.target.value,
                           );
                           setDealId(event.target.value);
                           if (deal && !amount) setAmount(String(deal.amount));
                        }}
                     >
                        <option value=''>{t('Сделка на закрытии')}</option>
                        {closing.map((deal) => (
                           <option key={deal.id} value={deal.id}>
                              {deal.company}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <div className='grid gap-4 sm:grid-cols-2'>
                     <Field error={errors.amount} label={t('Сумма, $')}>
                        <input
                           aria-invalid={!!errors.amount}
                           className='field-input'
                           inputMode='numeric'
                           value={amount}
                           onChange={(event) => setAmount(event.target.value)}
                        />
                     </Field>
                     <Field label={t('Срок')}>
                        <input
                           className='field-input'
                           type='date'
                           value={due}
                           onChange={(event) => setDue(event.target.value)}
                        />
                     </Field>
                  </div>
                  <div>
                     <p className='text-ink-soft text-xs font-medium'>
                        {t('Основания')}
                     </p>
                     <ul className='mt-1.5 list-disc pl-5'>
                        {DEFAULT_BASES.map((basis) => (
                           <li key={basis}>{t(basis)}</li>
                        ))}
                     </ul>
                  </div>
               </div>
            </ModalBody>
            <ModalFooter note={t('Основания закрывают бухгалтерия и директор')}>
               <Button variant='ghost' onClick={close}>
                  {t('Отмена')}
               </Button>
               <Button type='submit'>{t('Создать платёж')}</Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default NewPaymentDialog;

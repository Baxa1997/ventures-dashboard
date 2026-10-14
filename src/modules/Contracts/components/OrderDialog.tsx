import { formatSum, limitUse } from '@modules/Contracts/helpers';
import contracts from '@modules/Contracts/services';
import { useDeals } from '@modules/Deals/hooks';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import type { Contract } from '@shared/types/contracts.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface OrderDialogProps {
   contract: Contract;
   open: boolean;
   onClose: () => void;
}

/* An order under the framework contract at one of its fixed tariffs. It takes
   its price from the year's limit, so an order the limit cannot cover is
   refused. */
const OrderDialog = ({ contract, open, onClose }: OrderDialogProps) => {
   const { t, i18n } = useTranslation('contracts');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const { deals } = useDeals();
   const details = contract.details;
   const tariffs = details?.tariffs.filter(({ monthly }) => !monthly) ?? [];
   const [tariffId, setTariffId] = useState('');
   const [dealId, setDealId] = useState('');
   const [error, setError] = useState('');
   const active = deals.filter(({ status }) => status === 'active');
   const left = details ? limitUse(details).left : 0;

   const close = () => {
      setTariffId('');
      setDealId('');
      setError('');
      onClose();
   };

   const submit = async () => {
      const tariff = tariffs.find(({ id }) => id === tariffId);
      const deal = active.find(({ id }) => id === dealId);
      if (!tariff || !deal) {
         setError(t('Выберите тариф и сделку'));
         return;
      }
      if (tariff.amount > left) {
         setError(
            t('Остатка лимита не хватает: {{left}} млн сум', {
               left: formatSum(left, language),
            }),
         );
         return;
      }
      const title = `${tariff.title.replace(/ за проект$/, '')} · ${deal.company}`;
      await contracts.addOrder(
         contract.id,
         { title, tariffId: tariff.id, amount: tariff.amount, dealId: deal.id },
         t('Заявка {{title}}', { title }),
      );
      close();
   };

   return (
      <Modal
         open={open}
         subtitle={t('Остаток лимита — {{left}} млн сум', {
            left: formatSum(left, language),
         })}
         title={t('Новая заявка по договору')}
         onClose={close}
      >
         <form
            className={MODAL_FORM}
            onSubmit={(event) => {
               event.preventDefault();
               submit();
            }}
         >
            <ModalBody>
               <div className='flex flex-col gap-4'>
                  <Field label={t('Тариф')}>
                     <select
                        className='field-input'
                        value={tariffId}
                        onChange={(event) => {
                           setTariffId(event.target.value);
                           setError('');
                        }}
                     >
                        <option value=''>{t('Выберите тариф')}</option>
                        {tariffs.map((tariff) => (
                           <option key={tariff.id} value={tariff.id}>
                              {tariff.title} —{' '}
                              {formatSum(tariff.amount, language)}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field error={error} label={t('Сделка')}>
                     <select
                        aria-invalid={!!error}
                        className='field-input'
                        value={dealId}
                        onChange={(event) => {
                           setDealId(event.target.value);
                           setError('');
                        }}
                     >
                        <option value=''>{t('Выберите сделку')}</option>
                        {active.map((deal) => (
                           <option key={deal.id} value={deal.id}>
                              {deal.company}
                           </option>
                        ))}
                     </select>
                  </Field>
               </div>
            </ModalBody>
            <ModalFooter
               note={t('Заявка уйдёт исполнителю, сумма — из годового лимита')}
            >
               <Button variant='ghost' onClick={close}>
                  {t('Отмена')}
               </Button>
               <Button type='submit'>{t('Создать заявку')}</Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default OrderDialog;

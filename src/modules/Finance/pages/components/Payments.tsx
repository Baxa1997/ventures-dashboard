import type { FinanceData } from '@modules/Finance/hooks';
import { Card, NoData } from '@shared/components';
import { useTranslation } from 'react-i18next';
import PaymentCard from './PaymentCard';

interface PaymentsProps {
   data: FinanceData;
}

// Payments for deals: those waiting for their bases first, then those passed
// to the bank and paid.
const Payments = ({ data }: PaymentsProps) => {
   const { t } = useTranslation('finance');
   const order = { waiting: 0, sent: 1, paid: 2 };
   const payments = [...data.payments].sort(
      (a, b) => order[a.status] - order[b.status] || a.due.localeCompare(b.due),
   );

   return (
      <>
         {payments.length ? (
            <div className='gap-section stagger grid lg:grid-cols-2 2xl:grid-cols-3'>
               {payments.map((payment) => (
                  <Card key={payment.id} className='p-5'>
                     <PaymentCard full payment={payment} />
                  </Card>
               ))}
            </div>
         ) : (
            <Card className='flex-1'>
               <NoData>{t('Платежей по сделкам нет')}</NoData>
            </Card>
         )}
         <p className='text-ink-soft mt-section text-xs'>
            {t(
               'Платёжное поручение формирует бухгалтерия (Г. Абдуллаева), когда все основания закрыты. До этого кнопка «Передать в оплату» недоступна.',
            )}
         </p>
      </>
   );
};

export default Payments;

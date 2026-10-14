import { PAYMENT_STATUSES } from '@modules/Finance/constants';
import finance from '@modules/Finance/services';
import { Badge, Button, CheckList } from '@shared/components';
import { DIRECTOR_ID, TEAM } from '@shared/constants';
import { formatDate, formatUsd } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { Payment } from '@shared/types/finance.types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface PaymentCardProps {
   payment: Payment;
   full?: boolean; // with the status and the buttons, on the payments tab
}

const ACCOUNTANT_ID = TEAM.find(({ role }) => role === 'accountant')?.id;

/* A payment for a deal and the bases it waits for. The accountant and the
   director tick a basis when its document is in; the payment order can only
   be formed once all of them are closed. */
const PaymentCard = ({ payment, full = false }: PaymentCardProps) => {
   const { t, i18n } = useTranslation('finance');
   const user = useCurrentUser();
   const language = i18n.resolvedLanguage ?? i18n.language;
   const ready = payment.bases.every(({ done }) => done);
   const canTick =
      payment.status === 'waiting' &&
      (user.id === ACCOUNTANT_ID || user.id === DIRECTOR_ID);
   const status = PAYMENT_STATUSES[payment.status];

   return (
      <div>
         <div className='flex items-baseline justify-between gap-3'>
            {payment.dealId ? (
               <Link
                  className='font-semibold hover:underline'
                  to={`/deals/${payment.dealId}`}
               >
                  {payment.title}
               </Link>
            ) : (
               <span className='font-semibold'>{payment.title}</span>
            )}
            <span className='font-semibold tabular-nums'>
               {formatUsd(payment.amount, language)}
            </span>
         </div>
         <p className='text-ink-soft mt-0.5 text-xs'>
            {[
               payment.condition,
               t('до {{date}}', { date: formatDate(payment.due) }),
            ]
               .filter(Boolean)
               .join(' · ')}
         </p>
         <CheckList
            className='mt-3 gap-2.5'
            items={payment.bases.map(({ id, text, done }) => ({
               id,
               text,
               note: '',
               state: done ? 'done' : 'open',
            }))}
            onToggle={
               canTick ? (id) => finance.toggleBasis(payment.id, id) : undefined
            }
         />
         {full && (
            <div className='mt-4 flex flex-wrap items-center gap-2.5'>
               <Badge tone={status.tone}>
                  {payment.sentAt
                     ? t('{{status}} · {{date}}', {
                          status: t(status.label),
                          date: formatDate(payment.sentAt),
                       })
                     : t(status.label)}
               </Badge>
               <span className='flex-1' />
               {payment.status === 'waiting' && (
                  <Button
                     disabled={!ready}
                     title={
                        ready
                           ? undefined
                           : t('Кнопка доступна, когда закрыты все основания')
                     }
                     onClick={() => finance.sendPayment(payment.id)}
                  >
                     {t('Передать в оплату')}
                  </Button>
               )}
               {payment.status === 'sent' && (
                  <Button
                     variant='ghost'
                     onClick={() => finance.markPaid(payment.id)}
                  >
                     {t('Отметить оплаченным')}
                  </Button>
               )}
            </div>
         )}
      </div>
   );
};

export default PaymentCard;

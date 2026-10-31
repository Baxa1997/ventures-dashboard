import { CapitalBar, CapitalDialog } from '@modules/Deals/components';
import { Card } from '@shared/components';
import type { Deal } from '@shared/types/deals.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CapitalCardProps {
   deal: Deal;
   editable: boolean;
}

// «Структура капитала», as the design has it: who holds what before the deal.
const CapitalCard = ({ deal, editable }: CapitalCardProps) => {
   const { t } = useTranslation('deals');
   const [open, setOpen] = useState(false);

   return (
      <Card
         action={
            editable && (
               <button
                  type='button'
                  className='link'
                  onClick={() => setOpen(true)}
               >
                  {t('Изменить')}
               </button>
            )
         }
         hint={t('до сделки')}
         title={t('Структура капитала')}
      >
         <div className='px-4.5 py-4'>
            {deal.owners.length ? (
               <CapitalBar owners={deal.owners} />
            ) : (
               <p className='text-ink-soft text-meta'>
                  {t('Участники и их доли ещё не внесены.')}
               </p>
            )}
         </div>
         <CapitalDialog
            deal={deal}
            open={open}
            onClose={() => setOpen(false)}
         />
      </Card>
   );
};

export default CapitalCard;

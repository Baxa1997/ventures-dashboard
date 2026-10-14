import { Badge, Card, NoData } from '@shared/components';
import type { Deal } from '@shared/types/deals.types';
import { useTranslation } from 'react-i18next';

interface DecisionsProps {
   deal: Deal;
}

// What the investment committee and the supervisory board have decided.
const Decisions = ({ deal }: DecisionsProps) => {
   const { t } = useTranslation('deals');
   const decisions = deal.decisions ?? [];

   if (!decisions.length)
      return (
         <Card className='grid flex-1 place-items-center'>
            <NoData>{t('Решений ИК и НС по этой сделке пока нет')}</NoData>
         </Card>
      );

   return (
      <Card title={t('Решения ИК и НС')}>
         <ul className='divide-line divide-y px-5 py-1'>
            {decisions.map((decision) => (
               <li
                  key={decision.id}
                  className='flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5'
               >
                  <Badge>{decision.body}</Badge>
                  <div className='min-w-0 flex-1'>
                     <div className='font-semibold'>{decision.outcome}</div>
                     {decision.detail && (
                        <div className='text-ink-soft mt-0.5 text-xs'>
                           {decision.detail}
                        </div>
                     )}
                  </div>
               </li>
            ))}
         </ul>
      </Card>
   );
};

export default Decisions;

import { Badge, Person } from '@shared/components';
import type { Risk } from '@shared/types/deals.types';
import { useTranslation } from 'react-i18next';
import { RISK_LEVEL_LABELS } from '../constants';

interface RiskListProps {
   risks: Risk[];
}

// Open risks: how grave each one is, what it is about and who owns it.
const RiskList = ({ risks }: RiskListProps) => {
   const { t } = useTranslation('deals');

   return (
      <ul className='divide-line divide-y px-5 py-1'>
         {risks.map((risk) => (
            <li
               key={risk.id}
               className='grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[5.5rem_minmax(0,1fr)_9rem]'
            >
               <div>
                  <Badge tone={risk.level === 'high' ? 'danger' : 'warning'}>
                     {t(RISK_LEVEL_LABELS[risk.level])}
                  </Badge>
               </div>
               <div className='min-w-0'>
                  <div className='font-medium'>{risk.title}</div>
                  {risk.note && (
                     <div className='text-ink-soft mt-1 text-xs'>
                        {risk.note}
                     </div>
                  )}
               </div>
               <div className='text-meta max-sm:col-start-2'>
                  <Person id={risk.ownerId} soft />
               </div>
            </li>
         ))}
      </ul>
   );
};

export default RiskList;

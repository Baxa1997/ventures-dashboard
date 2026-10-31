import { Badge, ItemActions, Person } from '@shared/components';
import type { Risk } from '@shared/types/deals.types';
import { useTranslation } from 'react-i18next';
import { RISK_LEVEL_LABELS } from '../constants';

interface RiskListProps {
   risks: Risk[];
   onOpen?: (risk: Risk) => void; // given: a risk opens to be changed
   onRemove?: (risk: Risk) => void; // given: a risk is deleted, after asking
}

// Open risks, the high ones first: how grave each one is, what it is about
// and who owns it; with «Изменить» and «Удалить» for the deal's owner.
const RiskList = ({ risks, onOpen, onRemove }: RiskListProps) => {
   const { t } = useTranslation('deals');
   const sorted = [
      ...risks.filter(({ level }) => level === 'high'),
      ...risks.filter(({ level }) => level !== 'high'),
   ];

   return (
      <ul className='divide-line divide-y px-5 py-1'>
         {sorted.map((risk) => (
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
                  {onOpen ? (
                     <button
                        type='button'
                        className='hover:text-accent text-left font-medium'
                        data-hint={t('Открыть риск, чтобы изменить его')}
                        onClick={() => onOpen(risk)}
                     >
                        {risk.title}
                     </button>
                  ) : (
                     <div className='font-medium'>{risk.title}</div>
                  )}
                  {risk.note && (
                     <div className='text-ink-soft mt-1 text-xs'>
                        {risk.note}
                     </div>
                  )}
                  {(onOpen || onRemove) && (
                     <ItemActions
                        className='mt-1.5 text-xs'
                        name={risk.title}
                        onDelete={onRemove && (() => onRemove(risk))}
                        onEdit={onOpen && (() => onOpen(risk))}
                     />
                  )}
               </div>
               <div className='text-meta max-sm:col-start-2'>
                  {risk.ownerId ? (
                     <Person id={risk.ownerId} soft />
                  ) : (
                     <span className='text-warning-ink text-xs'>
                        {t('нет владельца')}
                     </span>
                  )}
               </div>
            </li>
         ))}
      </ul>
   );
};

export default RiskList;

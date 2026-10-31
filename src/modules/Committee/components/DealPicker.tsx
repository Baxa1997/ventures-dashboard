import { Checkbox } from '@shared/components';
import { formatUsd } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import { useTranslation } from 'react-i18next';

interface DealPickerProps {
   deals: Deal[];
   value: string[]; // the ids of the deals picked
   onChange: (value: string[]) => void;
}

// The deals to put on a meeting's agenda, each with its amount.
const DealPicker = ({ deals, value, onChange }: DealPickerProps) => {
   const { t, i18n } = useTranslation('committee');
   const language = i18n.resolvedLanguage ?? i18n.language;

   return (
      <ul className='mt-2 flex flex-col gap-2.5'>
         {deals.map((deal) => {
            const checked = value.includes(deal.id);
            const toggle = () =>
               onChange(
                  checked
                     ? value.filter((id) => id !== deal.id)
                     : [...value, deal.id],
               );
            return (
               <li key={deal.id} className='flex items-center gap-3'>
                  <Checkbox
                     checked={checked}
                     hint={t('Включить сделку в повестку или убрать из неё')}
                     label={deal.company}
                     onChange={toggle}
                  />
                  <button
                     type='button'
                     className='text-left'
                     data-hint={t(
                        'Включить сделку в повестку или убрать из неё',
                     )}
                     onClick={toggle}
                  >
                     <span className='font-medium'>{deal.company}</span>
                     <span className='text-ink-soft ml-2 text-xs'>
                        {formatUsd(deal.amount, language)}
                     </span>
                  </button>
               </li>
            );
         })}
      </ul>
   );
};

export default DealPicker;

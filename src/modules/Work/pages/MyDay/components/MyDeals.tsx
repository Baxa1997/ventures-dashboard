import { stageName } from '@modules/Settings/services';
import { formatDate } from '@modules/Work/helpers';
import { Badge } from '@shared/components';
import type { MyDeal } from '@shared/types/work.types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface MyDealsProps {
   deals: MyDeal[];
}

// The person's deals with the stage each one is on.
const MyDeals = ({ deals }: MyDealsProps) => {
   const { t } = useTranslation('work');

   return (
      <ul className='divide-line divide-y px-5 py-1'>
         {deals.map((deal) => (
            <li
               key={deal.id}
               className='flex min-h-11.25 items-center justify-between gap-3 py-2'
            >
               <Link
                  className='font-semibold hover:underline'
                  to={`/deals/${deal.id}`}
               >
                  {deal.company}
               </Link>
               <Badge>
                  {stageName(deal.stage)}
                  {deal.stageDate && ` · ${formatDate(deal.stageDate)}`}
               </Badge>
            </li>
         ))}
      </ul>
   );
};

export default MyDeals;

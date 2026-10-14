import type { CheckItem } from '@shared/types/deals.types';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CheckListProps {
   items: CheckItem[];
   className?: string;
}

const BOXES: Record<CheckItem['state'], string> = {
   done: 'border-success-ink bg-success-ink text-white',
   open: 'border-line-strong bg-white text-transparent',
   waiting: 'border-line-strong bg-white text-transparent',
   attention: 'border-warning-ink bg-warning-tint text-transparent',
   blocking: 'border-danger bg-white text-transparent',
};

const NOTES: Record<CheckItem['state'], string> = {
   done: 'text-ink-soft',
   open: 'text-ink-soft',
   waiting: 'text-warning-ink',
   attention: 'text-warning-ink',
   blocking: 'text-danger',
};

/* A checklist the system keeps: its items close when something happens
   (a report is uploaded, a request is sent), not by ticking them here. */
const CheckList = ({ items, className }: CheckListProps) => {
   const { t } = useTranslation('deals');

   return (
      <ul className={clsx('flex flex-col gap-3', className)}>
         {items.map((item) => (
            <li key={item.id} className='flex gap-3'>
               <span
                  className={clsx(
                     'mt-px grid size-4.5 shrink-0 place-items-center rounded-[5px] border',
                     BOXES[item.state],
                  )}
               >
                  <Check aria-hidden className='size-3.5' strokeWidth={3} />
                  <span className='sr-only'>
                     {item.state === 'done' ? t('Выполнено') : t('Не выполнено')}
                  </span>
               </span>
               <div className='min-w-0'>
                  <div>{item.text}</div>
                  {item.note && (
                     <div className={clsx('mt-0.5 text-xs', NOTES[item.state])}>
                        {item.note}
                     </div>
                  )}
               </div>
            </li>
         ))}
      </ul>
   );
};

export default CheckList;

import type { CheckItem } from '@shared/types/deals.types';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CheckListProps {
   items: CheckItem[];
   // when given, a person ticks the items here; otherwise the system closes
   // them when something happens (a report is uploaded, a request is sent)
   onToggle?: (id: string) => void;
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

const CheckList = ({ items, onToggle, className }: CheckListProps) => {
   const { t } = useTranslation('components');

   return (
      <ul className={clsx('flex flex-col gap-3', className)}>
         {items.map((item) => {
            const done = item.state === 'done';
            const box = clsx(
               'mt-px grid size-4.5 shrink-0 place-items-center rounded-[5px] border transition-colors',
               BOXES[item.state],
            );
            return (
               <li key={item.id} className='flex gap-3'>
                  {onToggle ? (
                     <button
                        type='button'
                        role='checkbox'
                        aria-checked={done}
                        aria-label={item.text}
                        className={clsx(
                           box,
                           'relative after:absolute after:-inset-2',
                           !done && 'hover:border-accent',
                        )}
                        onClick={() => onToggle(item.id)}
                     >
                        <Check
                           aria-hidden
                           className='size-3.5'
                           strokeWidth={3}
                        />
                     </button>
                  ) : (
                     <span className={box}>
                        <Check
                           aria-hidden
                           className='size-3.5'
                           strokeWidth={3}
                        />
                        <span className='sr-only'>
                           {done ? t('Выполнено') : t('Не выполнено')}
                        </span>
                     </span>
                  )}
                  <div className='min-w-0'>
                     <div
                        className={clsx(!done && onToggle && 'text-ink-soft')}
                     >
                        {item.text}
                     </div>
                     {item.note && (
                        <div
                           className={clsx('mt-0.5 text-xs', NOTES[item.state])}
                        >
                           {item.note}
                        </div>
                     )}
                  </div>
               </li>
            );
         })}
      </ul>
   );
};

export default CheckList;

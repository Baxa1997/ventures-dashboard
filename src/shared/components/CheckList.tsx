import type { CheckItem } from '@shared/types/deals.types';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from './Button';

interface CheckListProps {
   items: CheckItem[];
   // when given, a person ticks the items here; otherwise the system closes
   // them when something happens (a report is uploaded, a request is sent)
   onToggle?: (id: string) => void;
   busyId?: string; // the item whose tick is being saved; the others wait
   // what a person does to meet an item, by the item's id: a link, a field
   actions?: Partial<Record<string, ReactNode>>;
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

const CheckList = ({
   items,
   onToggle,
   busyId,
   actions,
   className,
}: CheckListProps) => {
   const { t } = useTranslation('components');

   return (
      <ul className={clsx('flex flex-col gap-3', className)}>
         {items.map((item) => {
            const done = item.state === 'done';
            // a box to tick; a round mark when the system keeps the state
            const box = clsx(
               'mt-px grid size-4.5 shrink-0 place-items-center border transition-colors',
               onToggle ? 'rounded-[5px]' : 'rounded-full',
               BOXES[item.state],
            );
            return (
               <li key={item.id} className='flex gap-3'>
                  {onToggle ? (
                     <button
                        type='button'
                        role='checkbox'
                        aria-busy={busyId === item.id || undefined}
                        aria-checked={done}
                        aria-label={item.text}
                        className={clsx(
                           box,
                           'relative after:absolute after:-inset-2 disabled:cursor-progress',
                           !done && 'hover:border-accent',
                        )}
                        data-hint={
                           done
                              ? t('Снять отметку с этого пункта')
                              : t('Отметить этот пункт выполненным')
                        }
                        disabled={!!busyId}
                        onClick={() => onToggle(item.id)}
                     >
                        {busyId === item.id ? (
                           <Spinner
                              className={clsx(
                                 'size-3',
                                 done ? 'text-white' : 'text-ink-soft',
                              )}
                           />
                        ) : (
                           <Check
                              aria-hidden
                              className='size-3.5'
                              strokeWidth={3}
                           />
                        )}
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
                     {actions?.[item.id] && (
                        <div className='mt-2'>{actions[item.id]}</div>
                     )}
                  </div>
               </li>
            );
         })}
      </ul>
   );
};

export default CheckList;

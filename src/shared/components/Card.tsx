import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface CardProps {
   title?: string;
   icon?: LucideIcon; // before the title, as on a DD workstream's card
   hint?: ReactNode; // count or short note after the title
   action?: ReactNode;
   className?: string;
   children: ReactNode;
}

const Card = ({
   title,
   icon: Icon,
   hint,
   action,
   className,
   children,
}: CardProps) => (
   <section
      className={clsx(
         'border-line shadow-card animate-rise rounded-xl border bg-white',
         className,
      )}
   >
      {title && (
         <header className='border-line flex min-h-11 flex-wrap items-center gap-x-2 border-b px-4.5 py-2'>
            <h2 className='text-meta flex items-center gap-2 font-bold'>
               {Icon && <Icon aria-hidden className='size-4 shrink-0' />}
               {title}
            </h2>
            {hint !== undefined && (
               <span className='text-ink-soft text-xs'>{hint}</span>
            )}
            {action && <span className='ml-auto pl-3'>{action}</span>}
         </header>
      )}
      {children}
   </section>
);

/* A column of cards in a row of the page: the column takes the row's height
   and its last card grows, so the columns of a row end level instead of
   leaving a short card above an empty gap. */
export const STACK =
   'gap-section stagger flex min-w-0 flex-col [&>:last-child]:flex-1';

export default Card;

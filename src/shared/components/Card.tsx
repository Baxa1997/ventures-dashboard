import clsx from 'clsx';
import type { ReactNode } from 'react';

interface CardProps {
   title?: string;
   hint?: ReactNode; // count or short note after the title
   action?: ReactNode;
   className?: string;
   children: ReactNode;
}

const Card = ({ title, hint, action, className, children }: CardProps) => (
   <section
      className={clsx(
         'border-line animate-rise rounded-lg border bg-white',
         className,
      )}
   >
      {title && (
         <header className='border-line flex min-h-11.5 flex-wrap items-center gap-x-2 border-b px-5 py-2'>
            <h2 className='text-title font-bold'>{title}</h2>
            {hint !== undefined && (
               <span className='text-ink-soft text-meta'>{hint}</span>
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

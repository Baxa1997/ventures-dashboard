import clsx from 'clsx';
import type { ReactNode } from 'react';

// Classes of the header and body cells; the first and last cells line up with
// the card's padding.
export const TH =
   'px-3 py-2.5 text-xs font-normal text-ink-soft first:pl-5 last:pr-5';
export const TD = 'px-3 py-3 first:pl-5 last:pr-5';

interface TableProps {
   head: ReactNode; // the header cells
   className?: string; // e.g. a min-width, so narrow screens scroll it sideways
   children: ReactNode; // the rows
}

// A table inside a card: a soft header row and hairlines between the rows.
const Table = ({ head, className, children }: TableProps) => (
   <div className='overflow-x-auto'>
      <table
         className={clsx(
            'text-meta w-full border-collapse text-left',
            className,
         )}
      >
         <thead className='bg-ground/70'>
            <tr className='border-line border-b'>{head}</tr>
         </thead>
         <tbody className='divide-line divide-y [&>tr]:transition-colors'>
            {children}
         </tbody>
      </table>
   </div>
);

export default Table;

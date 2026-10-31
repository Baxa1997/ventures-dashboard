import clsx from 'clsx';
import type { ReactNode } from 'react';

// Classes of the header and body cells; the first and last cells line up with
// the card's padding.
export const TH =
   'px-3.5 py-2.5 text-[11px] font-semibold whitespace-nowrap text-ink-soft first:pl-4.5 last:pr-4.5';
export const TD = 'px-3.5 py-2.5 first:pl-4.5 last:pr-4.5';

interface TableProps {
   head: ReactNode; // the header cells
   className?: string; // e.g. a min-width, so narrow screens scroll it sideways
   children: ReactNode; // the rows
}

// A table inside a card: small column names on white and hairlines between
// the rows.
const Table = ({ head, className, children }: TableProps) => (
   <div className='relative overflow-x-auto'>
      <table
         className={clsx('w-full border-collapse text-left text-sm', className)}
      >
         <thead>
            <tr className='border-line border-b'>{head}</tr>
         </thead>
         <tbody className='divide-line divide-y [&>tr]:transition-colors'>
            {children}
         </tbody>
      </table>
   </div>
);

export default Table;

import useStickyHead from '@shared/hooks/useStickyHead';
import clsx from 'clsx';
import { type ReactNode, type RefObject, useRef } from 'react';

// Classes of the header and body cells; the first and last cells line up with
// the card's padding.
export const TH =
   'px-3.5 py-2.5 text-[11px] font-semibold whitespace-nowrap text-ink-soft first:pl-4.5 last:pr-4.5';
export const TD = 'px-3.5 py-2.5 first:pl-4.5 last:pr-4.5';

// For a table not built with Table: its box and its <thead>, with
// useStickyHead on the <table>.
export const TABLE_BOX = 'relative data-wide:overflow-x-auto';
export const STICKY_HEAD = 'sticky-head';

interface TableProps {
   head: ReactNode; // the header cells
   className?: string; // e.g. a min-width, so narrow screens scroll it sideways
   body?: RefObject<HTMLTableSectionElement | null>; // useRowDrag's, for rows that are dragged
   children: ReactNode; // the rows
}

/* A table inside a card: small column names on white and hairlines between
   the rows. The lines belong to the cells, so a dragged row takes its own
   and the column names keep theirs while they stay in view as the page
   scrolls (useStickyHead). Wider than its card, it scrolls sideways. */
const Table = ({ head, className, body, children }: TableProps) => {
   const table = useRef<HTMLTableElement>(null);
   useStickyHead(table);

   return (
      <div className={TABLE_BOX}>
         <table
            ref={table}
            className={clsx(
               'w-full border-separate border-spacing-0 text-left text-sm',
               className,
            )}
         >
            <thead className={STICKY_HEAD}>
               <tr className='[&>th]:border-line [&>th]:border-b'>{head}</tr>
            </thead>
            <tbody
               ref={body}
               className={clsx(
                  '[&>tr+tr>td]:border-line [&>tr+tr>td]:border-t',
                  !body && '[&>tr]:transition-colors',
               )}
            >
               {children}
            </tbody>
         </table>
      </div>
   );
};

export default Table;

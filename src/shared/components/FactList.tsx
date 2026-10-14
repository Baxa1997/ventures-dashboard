import clsx from 'clsx';
import type { ReactNode } from 'react';

export interface FactRow {
   label: string;
   value: ReactNode;
   note?: ReactNode; // smaller line under the value
}

interface FactListProps {
   rows: FactRow[];
   divided?: boolean; // hairlines between the rows
   labelWidth?: string; // a grid track, e.g. '7rem' or '28%'
   className?: string;
}

// Label–value rows, as in "Условия сделки" or "Из заявки".
const FactList = ({
   rows,
   divided = false,
   labelWidth = '7rem',
   className,
}: FactListProps) => (
   <dl className={clsx(divided && 'divide-line divide-y', className)}>
      {rows.map((row) => (
         <div
            key={row.label}
            className={clsx('grid gap-x-4', divided ? 'py-3' : 'py-1.5')}
            style={{ gridTemplateColumns: `${labelWidth} minmax(0, 1fr)` }}
         >
            <dt className='text-ink-soft'>{row.label}</dt>
            <dd>
               {row.value}
               {row.note && (
                  <div className='text-ink-soft mt-1 text-xs'>{row.note}</div>
               )}
            </dd>
         </div>
      ))}
   </dl>
);

export default FactList;

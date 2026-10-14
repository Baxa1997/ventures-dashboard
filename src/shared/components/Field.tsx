import clsx from 'clsx';
import type { ReactNode } from 'react';

interface FieldProps {
   label: string;
   aside?: string; // soft remark right after the label
   strong?: boolean; // the label as a small heading
   hint?: string;
   error?: string;
   className?: string;
   children: ReactNode;
}

const Field = ({
   label,
   aside,
   strong = false,
   hint,
   error,
   className,
   children,
}: FieldProps) => (
   <label
      className={clsx(
         'text-ink-soft flex flex-col gap-1.5 text-xs font-medium',
         className,
      )}
   >
      <span className={strong ? 'text-ink text-sm font-semibold' : undefined}>
         {label}
         {aside && (
            <span className='text-ink-soft text-meta ml-2 font-normal'>
               {aside}
            </span>
         )}
      </span>
      {children}
      {hint && !error && <span className='font-normal'>{hint}</span>}
      {error && (
         <span role='alert' className='text-danger'>
            {error}
         </span>
      )}
   </label>
);

export default Field;

import clsx from 'clsx';
import { Info, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface NoticeProps {
   icon?: LucideIcon;
   warning?: boolean; // something to watch out for, in the warning tint
   className?: string;
   children: ReactNode;
}

// A note in a tinted box with its icon: how a section works, what a choice
// leads to.
const Notice = ({
   icon: Icon = Info,
   warning = false,
   className,
   children,
}: NoticeProps) => (
   <div
      className={clsx(
         'text-meta text-navy flex items-start gap-2.5 rounded-lg px-3 py-2.5',
         warning ? 'bg-warning-tint' : 'bg-accent-tint',
         className,
      )}
   >
      <Icon aria-hidden className='mt-px size-3.75 shrink-0' />
      <div className='min-w-0'>{children}</div>
   </div>
);

export default Notice;

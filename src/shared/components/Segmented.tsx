import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

export interface SegmentedItem<T extends string> {
   id: T;
   label: string;
   icon?: LucideIcon;
}

interface SegmentedProps<T extends string> {
   label: string; // what it switches, for screen readers
   items: SegmentedItem<T>[];
   value: T;
   onChange: (id: T) => void;
}

// A row of buttons of which one is on: a list's view, whose tasks, a scale.
// 36px, like the inputs and filters beside it.
const Segmented = <T extends string>({
   label,
   items,
   value,
   onChange,
}: SegmentedProps<T>) => (
   <div
      role='group'
      aria-label={label}
      className='border-line scrollbar-none flex h-9 max-w-full shrink-0 overflow-x-auto rounded-lg border bg-white p-0.5'
   >
      {items.map(({ id, label: name, icon: Icon }) => (
         <button
            key={id}
            type='button'
            aria-pressed={id === value}
            className={clsx(
               'text-meta flex shrink-0 items-center gap-1.5 rounded-md px-2.5 font-medium transition-colors',
               id === value
                  ? 'bg-accent-tint text-ink-strong'
                  : 'text-ink-soft hover:text-ink',
            )}
            onClick={() => onChange(id)}
         >
            {Icon && <Icon aria-hidden className='size-4' />}
            {name}
         </button>
      ))}
   </div>
);

export default Segmented;

import clsx from 'clsx';

export interface TabItem<T extends string> {
   id: T;
   label: string;
   count?: number;
}

interface TabsProps<T extends string> {
   label: string; // what the tabs switch, for screen readers
   items: TabItem<T>[];
   active: T;
   onChange: (id: T) => void;
}

// Sits at the bottom of a page header; the active tab's line lies on the
// header's border.
const Tabs = <T extends string>({
   label,
   items,
   active,
   onChange,
}: TabsProps<T>) => (
   <div
      role='tablist'
      aria-label={label}
      className='-mb-px flex gap-7 overflow-x-auto'
   >
      {items.map((item) => {
         const selected = item.id === active;
         return (
            <button
               key={item.id}
               type='button'
               role='tab'
               aria-selected={selected}
               className={clsx(
                  'flex shrink-0 items-baseline gap-1.5 border-b-2 px-0.5 pb-2.5 transition-colors',
                  selected
                     ? 'border-accent font-semibold'
                     : 'text-ink-soft hover:text-ink border-transparent',
               )}
               onClick={() => onChange(item.id)}
            >
               {item.label}
               {item.count !== undefined && (
                  <span className='text-ink-soft text-[11px] font-normal tabular-nums'>
                     {item.count}
                  </span>
               )}
            </button>
         );
      })}
   </div>
);

export default Tabs;

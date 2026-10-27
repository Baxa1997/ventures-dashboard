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
// border under the tabs.
const Tabs = <T extends string>({
   label,
   items,
   active,
   onChange,
}: TabsProps<T>) => (
   <div
      role='tablist'
      aria-label={label}
      className='-mb-px flex gap-1 overflow-x-auto'
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
                  'flex shrink-0 items-baseline gap-1.5 border-b-2 px-3.5 py-2.5 font-semibold whitespace-nowrap transition-colors',
                  selected
                     ? 'border-accent text-ink-strong'
                     : 'text-ink-soft hover:text-ink border-transparent',
               )}
               onClick={() => onChange(item.id)}
            >
               {item.label}
               {item.count !== undefined && (
                  <span className='text-ink-faint text-[11px] font-normal tabular-nums'>
                     {item.count}
                  </span>
               )}
            </button>
         );
      })}
   </div>
);

export default Tabs;

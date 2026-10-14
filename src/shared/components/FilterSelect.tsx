import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

interface FilterSelectProps<T extends string> {
   label: string; // names the filter for screen readers
   showLabel?: boolean; // write "Исполнитель: все" rather than just the value
   accent?: boolean; // the highlighted look of a filter that is switched on
   value: T;
   options: { value: T; label: string }[];
   onChange: (value: T) => void;
}

// A compact filter. The native select lies invisibly over the text, so the
// list, the keyboard and screen readers work as usual.
const FilterSelect = <T extends string>({
   label,
   showLabel = true,
   accent = false,
   value,
   options,
   onChange,
}: FilterSelectProps<T>) => {
   const current = options.find((option) => option.value === value)?.label;

   return (
      <div
         className={clsx(
            'has-focus-visible:outline-accent text-meta relative flex h-9 shrink-0 items-center gap-1.5 rounded-lg border pr-2.5 pl-3 font-medium has-focus-visible:outline-2 has-focus-visible:outline-offset-1',
            accent
               ? 'border-accent-soft bg-accent-tint text-accent'
               : 'border-line-strong bg-white',
         )}
      >
         <span aria-hidden>{showLabel ? `${label}: ${current}` : current}</span>
         <ChevronDown
            aria-hidden
            className={clsx('size-4', !accent && 'text-ink-soft')}
         />
         <select
            aria-label={label}
            className='absolute inset-0 w-full opacity-0'
            value={value}
            onChange={(event) => onChange(event.target.value as T)}
         >
            {options.map((option) => (
               <option key={option.value} value={option.value}>
                  {option.label}
               </option>
            ))}
         </select>
      </div>
   );
};

export default FilterSelect;

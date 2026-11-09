import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from './Button';

interface FilterSelectProps<T extends string> {
   label: string; // names the filter for screen readers
   showLabel?: boolean; // write "Исполнитель: все" rather than just the value
   accent?: boolean; // the highlighted look of a filter that is switched on
   value: T;
   options: { value: T; label: string }[];
   onChange: (value: T) => void;
   busy?: boolean; // the choice is being saved: a spinner, and it is off
}

// A compact filter, or a choice saved as it is made. The native select lies
// invisibly over the text, so the list, the keyboard and screen readers work
// as usual.
const FilterSelect = <T extends string>({
   label,
   showLabel = true,
   accent = false,
   value,
   options,
   onChange,
   busy = false,
}: FilterSelectProps<T>) => {
   const { t } = useTranslation('components');
   const current = options.find((option) => option.value === value)?.label;
   /* Browsers count a select opened with the mouse as keyboard focus, so the
      ring stayed after a choice. It shows only when the select was reached
      by the keyboard (Tab), as for the other controls. */
   const [byPointer, setByPointer] = useState(false);

   return (
      <div
         className={clsx(
            'text-meta relative flex h-9 shrink-0 items-center gap-1.5 rounded-lg border pr-2.5 pl-3 font-medium',
            !byPointer &&
               'has-focus-visible:outline-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-1',
            accent
               ? 'border-accent-soft bg-accent-tint text-accent'
               : 'border-line-strong bg-white',
         )}
         data-hint={t('Выбрать: {{name}}', { name: label })}
      >
         <span aria-hidden>{showLabel ? `${label}: ${current}` : current}</span>
         {busy ? (
            <Spinner className={clsx(!accent && 'text-ink-soft')} />
         ) : (
            <ChevronDown
               aria-hidden
               className={clsx('size-4', !accent && 'text-ink-soft')}
            />
         )}
         <select
            aria-busy={busy || undefined}
            aria-label={label}
            className='absolute inset-0 w-full opacity-0 disabled:cursor-progress'
            disabled={busy}
            value={value}
            onBlur={() => setByPointer(false)}
            onKeyDown={() => setByPointer(false)}
            onPointerDown={() => setByPointer(true)}
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

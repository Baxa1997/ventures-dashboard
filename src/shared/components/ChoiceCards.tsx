import clsx from 'clsx';

export interface Choice<T extends string> {
   value: T;
   label: string;
   note?: string;
}

interface ChoiceCardsProps<T extends string> {
   label: string; // names the group for screen readers
   name: string;
   options: Choice<T>[];
   value: T | null;
   disabled?: boolean;
   onChange: (value: T) => void;
}

// A radio group drawn as cards: the chosen one gets the accent border and tint.
const ChoiceCards = <T extends string>({
   label,
   name,
   options,
   value,
   disabled = false,
   onChange,
}: ChoiceCardsProps<T>) => (
   <div role='radiogroup' aria-label={label} className='flex flex-col gap-2'>
      {options.map((option) => {
         const checked = option.value === value;
         return (
            <label
               key={option.value}
               className={clsx(
                  'has-focus-visible:outline-accent flex gap-3 rounded-lg border px-3.5 py-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-1',
                  checked
                     ? 'border-accent-soft bg-accent-tint'
                     : 'border-line-strong bg-white',
                  disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
               )}
            >
               <input
                  checked={checked}
                  className='accent-accent mt-0.5 size-4 shrink-0'
                  disabled={disabled}
                  name={name}
                  type='radio'
                  value={option.value}
                  onChange={() => onChange(option.value)}
               />
               <span className='min-w-0'>
                  <span
                     className={clsx('block', option.note && 'font-semibold')}
                  >
                     {option.label}
                  </span>
                  {option.note && (
                     <span className='text-ink-soft mt-0.5 block text-xs'>
                        {option.note}
                     </span>
                  )}
               </span>
            </label>
         );
      })}
   </div>
);

export default ChoiceCards;

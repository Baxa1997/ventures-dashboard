import { ChevronDown } from 'lucide-react';
import Badge, { type BadgeTone } from './Badge';

export interface BadgeOption<T extends string> {
   value: T;
   label: string;
   tone: BadgeTone;
}

interface BadgeSelectProps<T extends string> {
   label: string; // what is chosen, for screen readers
   value: T;
   options: BadgeOption<T>[];
   onChange: (value: T) => void;
}

// A status that can be changed in place: the badge shows the choice, and the
// native select lies invisibly over it, so the list, the keyboard and screen
// readers work as usual.
const BadgeSelect = <T extends string>({
   label,
   value,
   options,
   onChange,
}: BadgeSelectProps<T>) => {
   const current =
      options.find((option) => option.value === value) ?? options[0];

   return (
      <span className='has-focus-visible:outline-accent relative inline-flex shrink-0 rounded-md has-focus-visible:outline-2 has-focus-visible:outline-offset-1'>
         <Badge tone={current.tone}>
            {current.label}
            <ChevronDown aria-hidden className='-mr-0.5 ml-1 size-3.5' />
         </Badge>
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
      </span>
   );
};

export default BadgeSelect;

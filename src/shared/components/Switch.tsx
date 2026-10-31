import clsx from 'clsx';

interface SwitchProps {
   checked: boolean;
   label: string; // for screen readers; a visible text sits beside it
   onChange: (checked: boolean) => void;
   disabled?: boolean;
   hint?: string; // the note on hover (Hints): the label unless given
   small?: boolean; // 28×16, for a row of small fields
}

// On or off, saved as it is switched: a row in use, a person's access.
// 34×20 with a 14px knob (small: 28×16, 12px), accent when on.
const Switch = ({
   checked,
   label,
   onChange,
   disabled = false,
   hint,
   small = false,
}: SwitchProps) => (
   <button
      type='button'
      role='switch'
      aria-checked={checked}
      aria-label={label}
      className={clsx(
         'relative inline-block shrink-0 rounded-full align-middle transition-colors duration-200 after:absolute after:-inset-1.5 disabled:cursor-not-allowed disabled:opacity-45',
         small ? 'h-4 w-7' : 'h-5 w-8.5',
         checked ? 'bg-accent' : 'bg-line-strong',
      )}
      data-hint={hint ?? label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
   >
      <span
         aria-hidden
         className={clsx(
            'absolute rounded-full bg-white shadow-[0_1px_2px_rgba(27,34,84,0.2)] transition-[left] duration-200',
            small ? 'top-0.5 size-3' : 'top-0.75 size-3.5',
            small && (checked ? 'left-3.5' : 'left-0.5'),
            !small && (checked ? 'left-4.25' : 'left-0.75'),
         )}
      />
   </button>
);

export default Switch;

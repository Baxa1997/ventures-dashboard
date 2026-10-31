import clsx from 'clsx';
import { Check } from 'lucide-react';
import { Spinner } from './Button';

interface CheckboxProps {
   checked: boolean;
   label: string; // for screen readers; the visible text sits beside the box
   hint?: string; // the note on hover (Hints): the label unless given
   onChange: () => void;
   busy?: boolean; // the tick is being saved: a spinner, and it is off
}

const Checkbox = ({
   checked,
   label,
   hint,
   onChange,
   busy = false,
}: CheckboxProps) => (
   <button
      type='button'
      role='checkbox'
      aria-busy={busy || undefined}
      aria-checked={checked}
      aria-label={label}
      className={clsx(
         'relative grid size-4.5 shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-colors after:absolute after:-inset-2 disabled:cursor-progress',
         checked
            ? 'border-success bg-success text-white'
            : 'border-line-strong hover:border-accent bg-white text-transparent',
      )}
      data-hint={hint ?? label}
      disabled={busy}
      onClick={onChange}
   >
      {busy ? (
         <Spinner className={clsx('size-3', !checked && 'text-ink-soft')} />
      ) : (
         <Check aria-hidden className='size-3.5' strokeWidth={3} />
      )}
   </button>
);

export default Checkbox;

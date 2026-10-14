import clsx from 'clsx';
import { Check } from 'lucide-react';

interface CheckboxProps {
   checked: boolean;
   label: string; // for screen readers; the visible text sits beside the box
   onChange: () => void;
}

const Checkbox = ({ checked, label, onChange }: CheckboxProps) => (
   <button
      type='button'
      role='checkbox'
      aria-checked={checked}
      aria-label={label}
      className={clsx(
         'relative grid size-4.5 shrink-0 place-items-center rounded-[5px] border transition-colors after:absolute after:-inset-2',
         checked
            ? 'border-accent bg-accent text-white'
            : 'border-line-strong hover:border-accent bg-white text-transparent',
      )}
      onClick={onChange}
   >
      <Check aria-hidden className='size-3.5' strokeWidth={3} />
   </button>
);

export default Checkbox;

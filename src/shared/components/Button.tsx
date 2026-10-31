import clsx from 'clsx';
import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'ghost' | 'text' | 'danger';
type ButtonSize = 'md' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
   hint: string; // what pressing it does: the note on hover (Hints)
   variant?: ButtonVariant;
   size?: ButtonSize;
   loading?: boolean; // its request is on its way: a spinner, and it is off
}

const VARIANTS: Record<ButtonVariant, string> = {
   primary: 'bg-accent font-bold text-white hover:bg-accent-strong',
   ghost: 'border border-line-strong text-ink hover:bg-hover',
   text: 'text-accent hover:underline',
   danger: 'border border-danger/40 text-danger hover:bg-danger/12',
};

// 36px, like the inputs and filters, so a row of controls lines up; a small
// button sits inside a row of a list or a card.
const SIZES: Record<ButtonSize, string> = {
   md: 'h-9 px-3.5 text-meta',
   sm: 'h-7 px-2.5 text-xs',
};

// Also used to make a link look like a button. A busy button is not faded
// like a disabled one: its spinner says it is working.
export const buttonClass = (
   variant: ButtonVariant = 'primary',
   className?: string,
   busy = false,
   size: ButtonSize = 'md',
) =>
   clsx(
      'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors [&_svg]:size-4 [&_svg]:shrink-0',
      busy
         ? 'cursor-progress opacity-85'
         : 'disabled:cursor-not-allowed disabled:opacity-45',
      SIZES[size],
      VARIANTS[variant],
      className,
   );

// For a small button with no text of its own: in place of its icon.
export const Spinner = ({ className }: { className?: string }) => (
   <LoaderCircle
      aria-hidden
      className={clsx('size-4 animate-spin', className)}
   />
);

const Button = ({
   variant = 'primary',
   size = 'md',
   type = 'button',
   loading = false,
   disabled,
   hint,
   className,
   children,
   ...props
}: ButtonProps) => (
   <button
      type={type}
      aria-busy={loading || undefined}
      className={buttonClass(variant, className, loading, size)}
      data-hint={hint}
      disabled={disabled || loading}
      {...props}
   >
      {loading && <Spinner />}
      {children}
   </button>
);

export default Button;

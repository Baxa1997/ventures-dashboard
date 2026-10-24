import clsx from 'clsx';
import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'ghost' | 'text' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
   variant?: ButtonVariant;
   loading?: boolean; // its request is on its way: a spinner, and it is off
}

const VARIANTS: Record<ButtonVariant, string> = {
   primary: 'bg-accent text-white hover:bg-accent-strong',
   ghost: 'border border-line-strong bg-white text-ink hover:bg-ground',
   text: 'text-accent hover:underline',
   danger: 'bg-danger text-white hover:bg-danger/90',
};

// Also used to make a link look like a button. A busy button is not faded
// like a disabled one: its spinner says it is working.
export const buttonClass = (
   variant: ButtonVariant = 'primary',
   className?: string,
   busy = false,
) =>
   clsx(
      'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold whitespace-nowrap transition-colors',
      busy
         ? 'cursor-progress opacity-85'
         : 'disabled:cursor-not-allowed disabled:opacity-50',
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
   type = 'button',
   loading = false,
   disabled,
   className,
   children,
   ...props
}: ButtonProps) => (
   <button
      type={type}
      aria-busy={loading || undefined}
      className={buttonClass(variant, className, loading)}
      disabled={disabled || loading}
      {...props}
   >
      {loading && <Spinner />}
      {children}
   </button>
);

export default Button;

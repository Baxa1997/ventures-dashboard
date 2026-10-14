import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'ghost' | 'text';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
   variant?: ButtonVariant;
}

const VARIANTS: Record<ButtonVariant, string> = {
   primary: 'bg-accent text-white hover:bg-accent-strong',
   ghost: 'border border-line-strong bg-white text-ink hover:bg-ground',
   text: 'text-accent hover:underline',
};

// Also used to make a link look like a button.
export const buttonClass = (
   variant: ButtonVariant = 'primary',
   className?: string,
) =>
   clsx(
      'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50',
      VARIANTS[variant],
      className,
   );

const Button = ({
   variant = 'primary',
   type = 'button',
   className,
   ...props
}: ButtonProps) => (
   <button type={type} className={buttonClass(variant, className)} {...props} />
);

export default Button;

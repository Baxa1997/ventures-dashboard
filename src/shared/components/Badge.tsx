import clsx from 'clsx';
import type { ReactNode } from 'react';

export type BadgeTone =
   | 'accent'
   | 'warning'
   | 'danger'
   | 'success'
   | 'neutral'
   | 'indigo'
   | 'info';

interface BadgeProps {
   tone?: BadgeTone;
   color?: string; // a colour of its own (#rrggbb), in place of the tone's
   caps?: boolean; // small capitals, as on a document's status
   children?: ReactNode; // none: the dot alone, where the line says the rest
}

// Each tone's own colour, for what is not a pill: a board's column, a bar.
export const TONE_COLORS: Record<BadgeTone, string> = {
   accent: 'var(--color-sky)',
   warning: 'var(--color-warning)',
   danger: 'var(--color-danger)',
   success: 'var(--color-success)',
   neutral: 'var(--color-neutral)',
   indigo: 'var(--color-indigo)',
   info: 'var(--color-info)',
};

// A colour's tint and ink, made as the tones' are: 16% of it on white, and
// 55% of it with navy-deep.
export const tintOf = (color: string) =>
   `color-mix(in srgb, ${color} 16%, white)`;
export const inkOf = (color: string) =>
   `color-mix(in srgb, ${color} 55%, var(--color-navy-deep))`;

// A pill in the tone's tint, its text in the tone's ink, and a dot in the
// tone's own colour; or the same made of a colour of its own.
const TONES: Record<BadgeTone, { pill: string; dot: string }> = {
   accent: { pill: 'bg-accent-tint text-accent-ink', dot: 'bg-sky' },
   warning: { pill: 'bg-warning-tint text-warning-ink', dot: 'bg-warning' },
   danger: { pill: 'bg-danger-tint text-danger-ink', dot: 'bg-danger' },
   success: { pill: 'bg-success-tint text-success-ink', dot: 'bg-success' },
   neutral: { pill: 'bg-neutral-tint text-neutral-ink', dot: 'bg-neutral' },
   indigo: { pill: 'bg-indigo-tint text-indigo-ink', dot: 'bg-indigo' },
   info: { pill: 'bg-info-tint text-info-ink', dot: 'bg-info' },
};

const Badge = ({
   tone = 'accent',
   color,
   caps = false,
   children,
}: BadgeProps) => (
   <span
      className={clsx(
         'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors',
         caps
            ? 'h-5 px-2 text-[10px] font-semibold tracking-wider uppercase'
            : 'h-5.5 px-2.25 text-xs',
         !color && TONES[tone].pill,
      )}
      style={
         color ? { background: tintOf(color), color: inkOf(color) } : undefined
      }
   >
      <span
         aria-hidden
         className={clsx(
            'size-1.5 shrink-0 rounded-full',
            !color && TONES[tone].dot,
         )}
         style={color ? { background: color } : undefined}
      />
      {children}
   </span>
);

export default Badge;

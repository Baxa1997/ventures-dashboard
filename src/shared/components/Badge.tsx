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
   caps?: boolean; // small capitals, as on a document's status
   children?: ReactNode; // none: the dot alone, where the line says the rest
}

// A pill in the tone's tint, its text in the tone's ink, and a dot in the
// tone's own colour.
const TONES: Record<BadgeTone, { pill: string; dot: string }> = {
   accent: { pill: 'bg-accent-tint text-accent-ink', dot: 'bg-sky' },
   warning: { pill: 'bg-warning-tint text-warning-ink', dot: 'bg-warning' },
   danger: { pill: 'bg-danger-tint text-danger-ink', dot: 'bg-danger' },
   success: { pill: 'bg-success-tint text-success-ink', dot: 'bg-success' },
   neutral: { pill: 'bg-neutral-tint text-neutral-ink', dot: 'bg-neutral' },
   indigo: { pill: 'bg-indigo-tint text-indigo-ink', dot: 'bg-indigo' },
   info: { pill: 'bg-info-tint text-info-ink', dot: 'bg-info' },
};

const Badge = ({ tone = 'accent', caps = false, children }: BadgeProps) => (
   <span
      className={clsx(
         'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors',
         caps
            ? 'h-5 px-2 text-[10px] font-semibold tracking-wider uppercase'
            : 'h-5.5 px-2.25 text-xs',
         TONES[tone].pill,
      )}
   >
      <span
         aria-hidden
         className={clsx('size-1.5 shrink-0 rounded-full', TONES[tone].dot)}
      />
      {children}
   </span>
);

export default Badge;

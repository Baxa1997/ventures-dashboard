import clsx from 'clsx';
import type { ReactNode } from 'react';

export type BadgeTone = 'accent' | 'warning' | 'danger' | 'success' | 'neutral';

interface BadgeProps {
   tone?: BadgeTone;
   caps?: boolean; // small capitals, as on a document's status
   children: ReactNode;
}

const TONES: Record<BadgeTone, string> = {
   accent: 'bg-accent-tint text-accent',
   warning: 'bg-warning-tint text-warning-ink',
   danger: 'bg-danger-tint text-danger',
   success: 'bg-success-tint text-success-ink',
   neutral: 'bg-neutral-tint text-neutral-ink',
};

const Badge = ({ tone = 'accent', caps = false, children }: BadgeProps) => (
   <span
      className={clsx(
         'inline-flex items-center rounded-md font-medium whitespace-nowrap transition-colors',
         caps
            ? 'h-5 px-2 text-[10px] font-semibold tracking-wider uppercase'
            : 'h-6.5 px-2.5 text-xs',
         TONES[tone],
      )}
   >
      {children}
   </span>
);

export default Badge;

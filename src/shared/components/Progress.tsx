import clsx from 'clsx';

type ProgressTone = 'accent' | 'warning' | 'danger' | 'neutral';

interface ProgressProps {
   value: number;
   max: number;
   tone?: ProgressTone;
   className?: string;
}

const FILLS: Record<ProgressTone, string> = {
   accent: 'bg-accent',
   warning: 'bg-warning-ink',
   danger: 'bg-danger',
   neutral: 'bg-neutral-ink',
};

// A thin bar that shows how much of something is used. It is always paired
// with the figures in text, so it is hidden from screen readers.
const Progress = ({ value, max, tone = 'accent', className }: ProgressProps) => (
   <span
      aria-hidden
      className={clsx(
         'bg-track block h-1 overflow-hidden rounded-full',
         className,
      )}
   >
      <span
         className={clsx('block h-full rounded-full', FILLS[tone])}
         style={{ width: `${Math.min(1, max ? value / max : 0) * 100}%` }}
      />
   </span>
);

export default Progress;

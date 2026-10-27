import type { BadgeTone } from '@shared/components';
import type { AttentionItem, FunnelGroup } from '@shared/types/work.types';

// How many of my tasks and of «Требует внимания» the dashboard lists; the
// rest are behind their links and in the counts.
export const TASKS_SHOWN = 6;
export const ATTENTION_SHOWN = 7;

// The dot of a «Требует внимания» line: the fund is late, something waits,
// or a deal is not on a committee's agenda. Its text says the same.
export const ATTENTION_TONES = {
   stage: 'danger',
   requests: 'danger',
   inbox: 'warning',
   report: 'warning',
   agenda: 'indigo',
} as const satisfies Record<AttentionItem['kind'], BadgeTone>;

// The funnel's bars as the design draws them: a name (a key of the "work"
// translations) and a colour for each group of deals.
export const FUNNEL_BARS = {
   new: { label: 'Новая заявка', fill: 'bg-sky' },
   work: { label: 'Due Diligence', fill: 'bg-warning' },
   committee: { label: 'Инвесткомитет', fill: 'bg-indigo' },
   invested: { label: 'Инвестировано', fill: 'bg-success' },
   rejected: { label: 'Отказ', fill: 'bg-danger' },
   exit: { label: 'Выход', fill: 'bg-info' },
} as const satisfies Record<FunnelGroup, { label: string; fill: string }>;

// The donut's colours, largest sector first, from the brand palette as the
// design orders them; the sectors past them are summed as «Другие».
export const SECTOR_COLORS = [
   'var(--color-navy)',
   'var(--color-sky)',
   'var(--color-lavender)',
   'var(--color-indigo)',
   'var(--color-info)',
];
export const OTHER_SECTORS_COLOR = 'var(--color-mist)';

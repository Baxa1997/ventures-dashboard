import type {
   DecisionAction,
   MoneyPart,
   Section,
} from '@shared/types/work.types';

// How many decisions the overview lists; the rest are behind "Все решения".
export const DECISIONS_LIMIT = 5;

// The link under a decision: its label (a key of the "work" translations)
// and the section where the document is opened.
export const DECISION_ACTIONS = {
   memo: { label: 'Открыть меморандум', section: 'deals' },
   decide: { label: 'Решить', section: 'deals' },
} as const satisfies Record<
   DecisionAction,
   { label: string; section: Section }
>;

// Parts of the money on the fund's accounts, in the order of the bar.
// Labels are keys of the "work" translations.
export const MONEY_PARTS = {
   free: { label: 'Свободно', fill: 'bg-navy' },
   approved: { label: 'Одобрено, ждёт оплаты', fill: 'bg-accent' },
   reserve: { label: 'Резерв follow-on', fill: 'bg-accent-soft' },
   operating: { label: 'Операционные расходы', fill: 'bg-accent-faint' },
} as const satisfies Record<MoneyPart, { label: string; fill: string }>;

export const QUARTERS = ['I', 'II', 'III', 'IV'];

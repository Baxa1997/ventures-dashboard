import type {
   DealStage,
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
   contract: { label: 'Открыть договор', section: 'contracts' },
   act: { label: 'Открыть акт', section: 'contracts' },
   letter: { label: 'Открыть письмо', section: 'correspondence' },
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

// Working days a deal may stay on a stage, for the stages the footnote names.
export const STAGE_NORM_DAYS = {
   inbox: 2,
   screening: 5,
   analysis: 10,
   dd: 30,
} as const satisfies Partial<Record<DealStage, number>>;

export const QUARTERS = ['I', 'II', 'III', 'IV'];

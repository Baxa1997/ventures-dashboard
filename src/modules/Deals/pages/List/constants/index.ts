// The views of Сделки, as the design has them. Labels are keys of the
// "deals" translations.
export const DEAL_VIEWS = ['table', 'board', 'timeline'] as const;

export type DealView = (typeof DEAL_VIEWS)[number];

export const DEAL_VIEW_LABELS = {
   table: 'Таблица',
   board: 'Воронка',
   timeline: 'Таймлайн',
} as const satisfies Record<DealView, string>;

// The stage filter: the deals in work (new applications and the funnel),
// all of them, one stage («stage:ic1») or one status («status:rejected»).
export type StageFilter = 'work' | 'all' | `stage:${string}` | `status:${string}`;

export const DEFAULT_STAGE_FILTER: StageFilter = 'work';

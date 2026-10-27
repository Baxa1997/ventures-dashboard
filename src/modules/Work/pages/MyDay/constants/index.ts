export const MY_DAY_TABS = ['mine', 'approve'] as const;

export type MyDayTab = (typeof MY_DAY_TABS)[number];

// «Ближайшие сроки» lists this many, the nearest first.
export const UPCOMING_SHOWN = 6;

// The groups of «Мои задачи», in their order. Labels are keys of the "work"
// translations.
export const DAY_GROUP_LABELS = {
   overdue: 'Просрочено',
   today: 'Сегодня',
   week: 'На этой неделе',
   done: 'Выполнено сегодня',
} as const;

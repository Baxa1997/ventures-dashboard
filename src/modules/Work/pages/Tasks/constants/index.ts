// The views of Задачи, as the design has them. Labels are keys of the
// "work" translations.
export const TASK_VIEWS = ['list', 'board', 'calendar', 'timeline'] as const;

export type TaskView = (typeof TASK_VIEWS)[number];

export const TASK_VIEW_LABELS = {
   list: 'Список',
   board: 'Доска',
   calendar: 'Календарь',
   timeline: 'Таймлайн',
} as const satisfies Record<TaskView, string>;

// Whose tasks: the person's (to do or to check), or the whole team's.
export const TASK_WHO = ['me', 'all'] as const;

export type TaskWho = (typeof TASK_WHO)[number];

export const TASK_WHO_LABELS = {
   me: 'Мои',
   all: 'Вся команда',
} as const satisfies Record<TaskWho, string>;

export const TIMELINE_SCALES = ['day', 'week', 'month'] as const;

export type TimelineScale = (typeof TIMELINE_SCALES)[number];

export const TIMELINE_SCALE_LABELS = {
   day: 'День',
   week: 'Неделя',
   month: 'Месяц',
} as const satisfies Record<TimelineScale, string>;

// The columns a scale shows: four weeks of days, sixteen weeks, a year.
export const TIMELINE_COLUMNS: Record<TimelineScale, number> = {
   day: 28,
   week: 16,
   month: 12,
};

// A day of the calendar lists this many tasks, then «ещё N».
export const CALENDAR_SHOWN = 4;

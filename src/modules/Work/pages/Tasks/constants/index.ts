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

// A day of the calendar lists this many tasks, then «ещё N».
export const CALENDAR_SHOWN = 4;

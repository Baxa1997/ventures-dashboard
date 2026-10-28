import type { ItemTone, StatusGroup } from '@shared/types/settings.types';
import type {
   Section,
   SystemTaskStatus,
   TaskPriority,
   TaskRecurrence,
   TaskRelation,
} from '@shared/types/work.types';

export { DATE_FORMAT } from '@shared/constants';

export const TITLE_MAX = 120;
export const CONTEXT_MAX = 80; // the note's text on one line, next to the type
export const CHECKLIST_MAX = 1000; // the checklist's items together
export const COMMENT_MAX = 500;

// Мой день shows the tasks due within this many days as «На этой неделе».
export const MY_DAY_WEEK = 7;

// The system statuses as batch 8 starts them (Настройки → Статусы задач has
// the list the fund keeps): their order, names (keys of the "work"
// translations), colours and groups, for a row the list does not have.
export const TASK_STATUS_ORDER: SystemTaskStatus[] = [
   'assigned',
   'in_progress',
   'waiting',
   'review',
   'postponed',
   'done',
];

export const TASK_STATUS_LABELS = {
   assigned: 'Назначена',
   in_progress: 'В работе',
   waiting: 'Ждёт ответа',
   review: 'На проверке',
   postponed: 'Отложена',
   done: 'Завершена',
} as const satisfies Record<SystemTaskStatus, string>;

export const TASK_STATUS_TONES: Record<SystemTaskStatus, ItemTone> = {
   assigned: 'neutral',
   in_progress: 'accent',
   waiting: 'warning',
   review: 'accent',
   postponed: 'neutral',
   done: 'success',
};

export const TASK_STATUS_GROUPS: Record<SystemTaskStatus, StatusGroup> = {
   assigned: 'todo',
   in_progress: 'progress',
   waiting: 'progress',
   review: 'progress',
   postponed: 'progress',
   done: 'complete',
};

export const TASK_PRIORITY_ORDER: TaskPriority[] = ['high', 'medium', 'low'];

export const TASK_PRIORITY_LABELS = {
   high: 'Высокий',
   medium: 'Средний',
   low: 'Низкий',
} as const satisfies Record<TaskPriority, string>;

export const TASK_RELATION_ORDER: TaskRelation[] = [
   'deal',
   'portfolio',
   'none',
];

// Where the thing a task is attached to lives; its card is under this path.
export const TASK_RELATION_SECTIONS: Record<
   Exclude<TaskRelation, 'none'>,
   Section
> = {
   deal: 'deals',
   portfolio: 'portfolio',
};

export const TASK_RECURRENCE_ORDER: TaskRecurrence[] = [
   'none',
   'monthly',
   'quarterly',
];

export const TASK_RECURRENCE_LABELS = {
   none: 'Не повторяется',
   monthly: 'Ежемесячно',
   quarterly: 'Ежеквартально',
} as const satisfies Record<TaskRecurrence, string>;

// Months between two occurrences of a recurring task.
export const RECURRENCE_MONTHS: Record<
   Exclude<TaskRecurrence, 'none'>,
   number
> = {
   monthly: 1,
   quarterly: 3,
};

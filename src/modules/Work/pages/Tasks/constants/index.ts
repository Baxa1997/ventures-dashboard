import type { TaskRecurrence, TaskStatus } from '@shared/types/work.types';

// Filter value that matches every assignee, type or relation.
export const ALL = 'all' as const;

export const CONTEXT_MAX = 80;

export const CHECKLIST_MAX = 1000;

export const COMMENT_MAX = 500;

export const TASK_TABS = [
   'mine',
   'open',
   'unassigned',
   'recurring',
   'done',
] as const;

export type TaskTab = (typeof TASK_TABS)[number];

export const DEFAULT_TAB: TaskTab = 'open';

// Labels are keys of the "work" translations.
export const TASK_TAB_LABELS = {
   mine: 'Мои',
   open: 'Все открытые',
   unassigned: 'Не распределены',
   recurring: 'Повторяющиеся',
   done: 'Завершённые',
} as const satisfies Record<TaskTab, string>;

export const RECURS_LABELS = {
   monthly: 'Повторяется ежемесячно',
   quarterly: 'Повторяется ежеквартально',
} as const satisfies Record<Exclude<TaskRecurrence, 'none'>, string>;

// The main button of the task card: the status it moves the task to and
// what it says. A task in work that nobody checks is closed straight away;
// see getNextStep.
export const NEXT_STEPS = {
   assigned: { status: 'in_progress', label: 'Взять в работу' },
   in_progress: { status: 'review', label: 'На проверку' },
   waiting: { status: 'in_progress', label: 'Вернуть в работу' },
   postponed: { status: 'in_progress', label: 'Вернуть в работу' },
   review: { status: 'done', label: 'Принять' },
   done: { status: 'in_progress', label: 'Вернуть в работу' },
} as const satisfies Record<TaskStatus, { status: TaskStatus; label: string }>;

export const CLOSE_STEP = { status: 'done', label: 'Завершить' } as const;

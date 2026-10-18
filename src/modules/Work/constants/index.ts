import type {
   DealStage,
   Section,
   TaskPriority,
   TaskRecurrence,
   TaskRelation,
   TaskStatus,
   TaskType,
} from '@shared/types/work.types';

export { DATE_FORMAT } from '@shared/constants';

export const TITLE_MAX = 120;

// A deadline this many days away, or closer, is highlighted.
export const SOON_DAYS = 3;

// Display order, and labels that are keys of the "work" translations.
export const TASK_STATUS_ORDER: TaskStatus[] = [
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
} as const satisfies Record<TaskStatus, string>;

export const TASK_PRIORITY_ORDER: TaskPriority[] = ['high', 'medium', 'low'];

export const TASK_PRIORITY_LABELS = {
   high: 'Высокий',
   medium: 'Средний',
   low: 'Низкий',
} as const satisfies Record<TaskPriority, string>;

export const TASK_TYPE_ORDER: TaskType[] = [
   'acceleration',
   'correspondence',
   'reporting',
   'portfolio',
   'regions',
   'finance',
   'legal',
   'other',
];

export const TASK_TYPE_LABELS = {
   acceleration: 'Акселерация',
   correspondence: 'Корреспонденция',
   reporting: 'Отчётность',
   portfolio: 'Портфель',
   regions: 'Регионы',
   finance: 'Финансы',
   legal: 'Юридическое',
   other: 'Другое',
} as const satisfies Record<TaskType, string>;

export const TASK_RELATION_ORDER: TaskRelation[] = [
   'deal',
   'portfolio',
   'none',
];

export const TASK_RELATION_LABELS = {
   deal: 'Сделка',
   portfolio: 'Компания портфеля',
   none: 'Без связи',
} as const satisfies Record<TaskRelation, string>;

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

export const DEAL_STAGE_LABELS = {
   inbox: 'Входящие',
   screening: 'Скрининг',
   meeting: 'Встреча',
   analysis: 'Анализ',
   ic1: 'ИК-1',
   dd: 'Детальный DD',
   ic2: 'ИК-2',
   board: 'Наблюдательный совет',
   closing: 'Закрытие',
} as const satisfies Record<DealStage, string>;

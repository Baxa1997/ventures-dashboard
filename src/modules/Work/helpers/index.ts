import type { BadgeTone } from '@shared/components';
import { DIRECTOR_ID } from '@shared/constants';
import type { Employee, Task } from '@shared/types/work.types';
import dayjs from 'dayjs';
import type { TFunction } from 'i18next';
import { capitalize, daysUntil, todayISO } from '@shared/helpers';
import { DATE_FORMAT, SOON_DAYS } from '../constants';

export {
   capitalize,
   daysUntil,
   formatDate,
   formatDay,
   shortName,
   todayISO,
} from '@shared/helpers';

export const shiftMonths = (date: string, months: number) =>
   dayjs(date).add(months, 'month').format(DATE_FORMAT);

// Пн, 5 окт
export const formatWeekday = (date: string) =>
   capitalize(dayjs(date).format('dd, D MMM'));

// Пятница, 2 октября 2026
export const formatToday = (withYear = false) =>
   capitalize(
      dayjs(todayISO()).format(withYear ? 'dddd, D MMMM YYYY' : 'dddd, D MMMM'),
   );

// "сегодня", "завтра", "через 3 дня" — or nothing for a date further than a week.
export const relativeDue = (
   t: TFunction<'work'>,
   date: string,
   today = todayISO(),
) => {
   const days = daysUntil(date, today);
   if (days < 0) return t('просрочено');
   if (days === 0) return t('сегодня');
   if (days === 1) return t('завтра');
   if (days < 7) return t('через {{count}} день', { count: days });
   if (days === 7) return t('через неделю');
   return '';
};

export const dueTone = (date: string, today = todayISO()): BadgeTone => {
   const days = daysUntil(date, today);
   if (days < 0) return 'danger';
   return days <= SOON_DAYS ? 'warning' : 'accent';
};

export const isDone = (task: Task) => task.status === 'done';

export const isOverdue = (task: Task, today = todayISO()) =>
   !isDone(task) && !!task.dueDate && task.dueDate < today;

// Earliest deadline first; items without a deadline go last.
export const byDueDate = (a: { dueDate: string }, b: { dueDate: string }) =>
   (a.dueDate || '9').localeCompare(b.dueDate || '9');

export const getEmployee = (employees: Employee[], id: string) =>
   employees.find((employee) => employee.id === id);

// A task nobody is assigned to is the director's by default.
export const getAssigneeId = (task: Task) => task.assigneeId || DIRECTOR_ID;

// "Мои": tasks a person does or checks.
export const isMine = (task: Task, userId: string) =>
   getAssigneeId(task) === userId || task.reviewerId === userId;

// Tasks that wait for this person today: theirs to do, or theirs to check.
export const needsAction = (task: Task, userId: string) =>
   task.status === 'review'
      ? task.reviewerId === userId
      : getAssigneeId(task) === userId &&
        (task.status === 'assigned' || task.status === 'in_progress');

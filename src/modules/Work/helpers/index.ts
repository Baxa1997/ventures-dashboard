import { stageNextLabel } from '@modules/Deals/helpers';
import { itemOf, listOf, nameOf, stageName } from '@modules/Settings/services';
import type { BadgeTone } from '@shared/components';
import { directorId } from '@shared/constants';
import type { ListItem, StatusGroup } from '@shared/types/settings.types';
import type {
   Employee,
   QueueItem,
   SystemTaskStatus,
   Task,
   TaskStatus,
   WeekDeadline,
} from '@shared/types/work.types';
import dayjs from 'dayjs';
import type { TFunction } from 'i18next';
import { capitalize, daysUntil, personName, todayISO } from '@shared/helpers';
import {
   DATE_FORMAT,
   SOON_DAYS,
   TASK_STATUS_GROUPS,
   TASK_STATUS_LABELS,
   TASK_STATUS_ORDER,
   TASK_STATUS_TONES,
} from '../constants';

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

const isSystemStatus = (status: string): status is SystemTaskStatus =>
   status in TASK_STATUS_GROUPS;

// The statuses in their order, as Настройки keep them; the system ones until
// Настройки are read.
export const taskStatuses = (): ListItem[] => {
   const list = listOf('taskStatuses');
   if (list.length) return list;
   return TASK_STATUS_ORDER.map((status, index) => ({
      id: status,
      key: status,
      names: { ru: '', uz: '', en: '' },
      sortOrder: index + 1,
      active: true,
      isSystem: true,
      group: TASK_STATUS_GROUPS[status],
      tone: TASK_STATUS_TONES[status],
   }));
};

// A status's group: what it does to a task (todo, progress or complete).
export const statusGroup = (status: TaskStatus): StatusGroup =>
   itemOf('taskStatuses', status)?.group ??
   (isSystemStatus(status) ? TASK_STATUS_GROUPS[status] : 'progress');

export const statusTone = (status: TaskStatus): BadgeTone =>
   itemOf('taskStatuses', status)?.tone ??
   (isSystemStatus(status) ? TASK_STATUS_TONES[status] : 'neutral');

// A status's name: the fund's, else the system status's own, else its slug.
export const statusName = (t: TFunction<'work'>, status: TaskStatus) => {
   const item = itemOf('taskStatuses', status);
   const own = item && nameOf(item);
   if (own && own !== status) return own;
   return isSystemStatus(status) ? t(TASK_STATUS_LABELS[status]) : status;
};

// A task in a status of the «complete» group is closed.
export const isDone = (task: Task) => statusGroup(task.status) === 'complete';

export const isOverdue = (task: Task, today = todayISO()) =>
   !isDone(task) && !!task.dueDate && task.dueDate < today;

// Earliest deadline first; items without a deadline go last.
export const byDueDate = (a: { dueDate: string }, b: { dueDate: string }) =>
   (a.dueDate || '9').localeCompare(b.dueDate || '9');

export const getEmployee = (employees: Employee[], id: string) =>
   employees.find((employee) => employee.id === id);

// A task nobody is assigned to is the director's by default.
export const getAssigneeId = (task: Task) => task.assigneeId || directorId();

// "Мои": tasks a person does or checks.
export const isMine = (task: Task, userId: string) =>
   getAssigneeId(task) === userId || task.reviewerId === userId;

// Tasks that wait for this person today: theirs to do, or theirs to check.
export const needsAction = (task: Task, userId: string) =>
   task.status === 'review'
      ? task.reviewerId === userId
      : getAssigneeId(task) === userId &&
        (task.status === 'assigned' || task.status === 'in_progress');

// How a Мой день item that comes from a deal reads, in the interface language.
export const queueWording = (
   t: TFunction<'work'>,
   tDeals: TFunction<'deals'>,
   item: QueueItem,
) => {
   const by = personName(item.decision?.preparedById ?? '');
   if (item.kind === 'inbox')
      return {
         title: t('Разобрать заявку'),
         note: t('Заявка {{number}}', { number: item.note }),
      };
   if (item.kind === 'next')
      return {
         title:
            item.title ||
            (item.stage ? stageNextLabel(tDeals, item.stage) : ''),
         note: item.stage ? stageName(item.stage) : '',
      };
   if (item.kind === 'memo')
      return {
         title: t('Утвердить меморандум v{{version}}', { version: item.note }),
         note: by && t('подготовил {{name}}', { name: by }),
      };
   return {
      title: t('Подтвердить решение по скринингу'),
      note: by && t('предложил {{name}}', { name: by }),
   };
};

// How a deadline of the week reads; the deals' and the reports' are worded here.
export const deadlineWording = (
   t: TFunction<'work'>,
   tDeals: TFunction<'deals'>,
   item: WeekDeadline,
) => {
   if (item.kind === 'reports')
      return {
         title: t('Квартальные отчёты компаний'),
         note: item.title.replace(/^(\d{4})-Q(\d)$/, 'Q$2 $1'),
      };
   if (item.kind === 'deal')
      return {
         title: item.title,
         note:
            item.note || (item.stage ? stageNextLabel(tDeals, item.stage) : ''),
      };
   return { title: item.title, note: item.note };
};

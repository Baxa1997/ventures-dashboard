import { stageNextLabel } from '@modules/Deals/helpers';
import {
   itemOf,
   listName,
   listOf,
   nameOf,
   stageName,
} from '@modules/Settings/services';
import { type BadgeTone, TONE_COLORS } from '@shared/components/Badge';
import { directorId } from '@shared/constants';
import type { ListItem, StatusGroup } from '@shared/types/settings.types';
import type {
   ChecklistItem,
   QueueItem,
   SystemTaskStatus,
   Task,
   TaskInput,
   TaskStatus,
   TaskTargets,
} from '@shared/types/work.types';
import dayjs from 'dayjs';
import type { TFunction } from 'i18next';
import {
   daysUntil,
   personName,
   textToHtml,
   todayISO,
} from '@shared/helpers';
import {
   DATE_FORMAT,
   MY_DAY_WEEK,
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

// "сегодня", "завтра", "вчера", "через 3 дн.", "2 дн. назад"
export const relativeDay = (
   t: TFunction<'work'>,
   date: string,
   today = todayISO(),
) => {
   const days = daysUntil(date, today);
   if (days === 0) return t('сегодня');
   if (days === 1) return t('завтра');
   if (days === -1) return t('вчера');
   return days < 0
      ? t('{{days}} дн. назад', { days: -days })
      : t('через {{days}} дн.', { days });
};

// 2026-Q3 → Q3 2026
export const formatQuarter = (quarter: string) => {
   const [year, number] = quarter.split('-Q');
   return number ? `Q${number} ${year}` : quarter;
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

// A status's own colour (#rrggbb), picked in Настройки; none — its tone's.
export const statusColor = (status: TaskStatus) =>
   itemOf('taskStatuses', status)?.color || undefined;

// What a status is drawn in on a board, a calendar, a timeline.
export const statusFill = (status: TaskStatus) =>
   statusColor(status) ?? TONE_COLORS[statusTone(status)];

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

// A task nobody is assigned to is the director's by default.
export const getAssigneeId = (task: Task) => task.assigneeId || directorId();

// "Мои": tasks a person does or checks.
export const isMine = (task: Task, userId: string) =>
   getAssigneeId(task) === userId || task.reviewerId === userId;

// SQV-12: a task's number as the design writes it.
export const taskKey = (task: Task) => `SQV-${task.number}`;

// The name of the deal or the company a task is attached to, '' — none.
export const targetNameOf = (targets: TaskTargets, task: Task) =>
   task.relation === 'none'
      ? ''
      : (targets[task.relation].find(({ id }) => id === task.relationId)
           ?.name ?? '');

// Мой день's tasks: open ones the person does, except those sent to be
// checked, which wait in the reviewer's «Ждут моего согласования».
export const isMyOpenTask = (task: Task, userId: string) =>
   getAssigneeId(task) === userId &&
   !isDone(task) &&
   task.status !== 'review';

// A task sent to the person, who checks it, for approval.
export const awaitsApproval = (task: Task, userId: string) =>
   task.status === 'review' && task.reviewerId === userId;

// Where a piece of work falls in Мой день: past its deadline, due today, due
// within the coming week, or later or with no deadline, which it does not show.
export type DayGroup = 'overdue' | 'today' | 'week' | 'later';

export const dayGroupOf = (dueDate: string, today = todayISO()): DayGroup => {
   if (!dueDate) return 'later';
   if (dueDate < today) return 'overdue';
   if (dueDate === today) return 'today';
   return daysUntil(dueDate, today) <= MY_DAY_WEEK ? 'week' : 'later';
};

// A task the person did and sent to somebody else to check.
export const isSentForApproval = (task: Task, userId: string) =>
   task.status === 'review' &&
   getAssigneeId(task) === userId &&
   task.reviewerId !== userId;

// What a task's tick in a list shows, and the note after it: a task the
// person sent to be checked shows ticked, and unticking takes it back.
export const tickOf = (task: Task, userId: string) => {
   const sent = isSentForApproval(task, userId);
   const done = isDone(task) || sent;
   let note:
      | 'Возвращено в работу'
      | 'Отправлено на согласование'
      | 'Отмечено выполненным' = 'Отмечено выполненным';
   if (done) note = 'Возвращено в работу';
   else if (statusAfterTick(task, userId) === 'review')
      note = 'Отправлено на согласование';
   return { done, sent, note };
};

// The day a task was last sent to be checked, '' if it never was.
const sentOn = (task: Task) =>
   task.history.find(
      (event) => event.kind === 'status' && event.status === 'review',
   )?.date ?? '';

// A line of Мой день's «Мои задачи»: a task, or a piece of work a deal or a
// company brings (an application to take, a next step, an answer to check).
export type DayItem = { key: string; dueDate: string; done: boolean } & (
   { kind: 'queue'; item: QueueItem } | { kind: 'task'; task: Task }
);

// A line of «Ждут моего согласования»: a task sent to the person to check,
// or a decision of a deal that waits for them (a memorandum, a screening).
export type Approval = { key: string; dueDate: string } & (
   { kind: 'task'; task: Task } | { kind: 'decision'; item: QueueItem }
);

export interface MyDayGroups {
   overdue: DayItem[];
   today: DayItem[];
   week: DayItem[];
   done: DayItem[]; // closed today
   approvals: Approval[];
}

/* What waits for the person in Мой день: their tasks and the work their deals
   and companies bring, by deadline, and what they have to approve. A deal's
   piece of work without a deadline is for today; a task without one is not
   shown, as the tasks due later are not. A task sent to be checked today
   stays among the day's done ones. */
export const myDayOf = (
   tasks: Task[],
   queue: QueueItem[],
   userId: string,
   today = todayISO(),
): MyDayGroups => {
   const day: MyDayGroups = {
      overdue: [],
      today: [],
      week: [],
      done: [],
      approvals: [],
   };
   const place = (item: DayItem, dueDate: string) => {
      const group = dayGroupOf(dueDate, today);
      if (group !== 'later') day[group].push(item);
   };
   for (const task of tasks) {
      const line = { key: task.id, dueDate: task.dueDate };
      if (awaitsApproval(task, userId))
         day.approvals.push({ ...line, kind: 'task', task });
      else if (isMyOpenTask(task, userId))
         place({ ...line, kind: 'task', done: false, task }, task.dueDate);
      else if (
         (task.completedAt === today && getAssigneeId(task) === userId) ||
         (isSentForApproval(task, userId) && sentOn(task) === today)
      )
         day.done.push({ ...line, kind: 'task', done: true, task });
   }
   for (const item of queue) {
      const line = { key: item.id, dueDate: item.dueDate };
      if (item.decision)
         day.approvals.push({ ...line, kind: 'decision', item });
      else if (item.completedAt === today)
         day.done.push({ ...line, kind: 'queue', done: true, item });
      else if (!item.completedAt)
         place(
            { ...line, kind: 'queue', done: false, item },
            item.dueDate || today,
         );
   }
   const groups = ['overdue', 'today', 'week', 'done', 'approvals'] as const;
   for (const group of groups) day[group].sort(byDueDate);
   return day;
};

// The figure next to Мой день in the menu: what is due by today, and what
// waits for the person's approval.
export const myDayCount = (day: MyDayGroups) =>
   day.overdue.length + day.today.length + day.approvals.length;

// A task type's badge colour, by its place in Настройки → Типы задач, so a
// type keeps its colour wherever it shows.
const TYPE_TONES: BadgeTone[] = [
   'accent',
   'info',
   'indigo',
   'success',
   'warning',
   'neutral',
];

export const typeTone = (type: string): BadgeTone => {
   const index = listOf('taskTypes', true).findIndex(({ key }) => key === type);
   return index < 0 ? 'neutral' : TYPE_TONES[index % TYPE_TONES.length];
};

// Ticking a task that somebody else checks sends it to them instead of closing
// it; its checker's tick closes it, its doer's takes it back to work.
export const statusAfterTick = (task: Task, userId: string): TaskStatus => {
   if (isDone(task)) return 'in_progress';
   if (task.status === 'review')
      return task.reviewerId === userId ? 'done' : 'in_progress';
   return task.reviewerId && task.reviewerId !== userId ? 'review' : 'done';
};


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
   if (item.kind === 'answer')
      return {
         title: t('Проверить ответ заявителя: {{title}}', { title: item.title }),
         note: t('пришёл из кабинета основателя · {{number}}', {
            number: item.note,
         }),
      };
   if (item.kind === 'company_answer')
      return {
         title: t('Проверить ответ компании: {{title}}', { title: item.title }),
         note: item.note
            ? t('ответил в кабинете {{email}}', { email: item.note })
            : '',
      };
   if (item.kind === 'contract')
      return {
         title: t('Договор {{number}}: {{subject}}', {
            number: item.note,
            subject: item.title,
         }),
         note: item.subject,
      };
   if (item.kind === 'procurement')
      return {
         title: t('Закупка: {{title}}', { title: item.title }),
         note: listName('procCategories', item.note),
      };
   if (item.kind === 'document')
      return {
         title: t('Проверить документ: {{title}}', { title: item.title }),
         note: t('загружен заявителем в кабинете · {{version}}', {
            version: item.note,
         }),
      };
   return {
      title: t('Подтвердить решение по скринингу'),
      note: by && t('предложил {{name}}', { name: by }),
   };
};

// The form edits the checklist as text, one item per line.
export type TaskFormValues = Omit<TaskInput, 'checklist'> & {
   checklist: string;
};

export const getInitialValues = (
   task: Task | undefined,
   userId: string,
): TaskFormValues => ({
   title: task?.title ?? '',
   type: task?.type ?? 'other',
   context: task?.context ?? '',
   // a task from before the rich editor has only the one-line text
   details: task?.details || textToHtml(task?.context ?? ''),
   relation: task?.relation ?? 'none',
   relationId: task?.relationId ?? '',
   assigneeId: task ? task.assigneeId : userId,
   reviewerId: task?.reviewerId ?? '',
   startDate: task?.startDate ?? '',
   dueDate: task?.dueDate ?? '',
   priority: task?.priority ?? 'medium',
   status: task?.status ?? 'assigned',
   recurrence: task?.recurrence ?? 'none',
   checklist: task?.checklist.map(({ text }) => text).join('\n') ?? '',
});

// Items whose text was not changed keep their tick.
export const toChecklist = (
   text: string,
   previous: ChecklistItem[] = [],
): ChecklistItem[] =>
   text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map(
         (line) =>
            previous.find((item) => item.text === line) ?? {
               id: crypto.randomUUID(),
               text: line,
               done: false,
            },
      );

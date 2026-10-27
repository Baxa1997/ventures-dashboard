import { DATE_FORMAT } from '@modules/Work/constants';
import {
   byDueDate,
   formatDate,
   isDone,
   isMine,
   needsAction,
} from '@modules/Work/helpers';
import type { QueueItem, Task } from '@shared/types/work.types';
import dayjs from 'dayjs';

// The work week (Monday to Friday) of the next working day: on a Friday the
// deadlines already look at the week ahead.
export const getDeadlineWeek = (today: string) => {
   let day = dayjs(today).add(1, 'day');
   while (day.day() === 0 || day.day() === 6) day = day.add(1, 'day');
   const monday = day.subtract(day.day() - 1, 'day');
   return {
      start: monday.format(DATE_FORMAT),
      end: monday.add(4, 'day').format(DATE_FORMAT),
   };
};

// 5–9 октября
export const formatRange = (start: string, end: string) =>
   dayjs(start).isSame(end, 'month')
      ? `${dayjs(start).format('D')}–${formatDate(end)}`
      : `${formatDate(start)} – ${formatDate(end)}`;

// A row of "Нужно сделать вам": either an item that comes from a deal, the
// portfolio or a letter, or a task from the task list.
export type DayItem = { key: string; dueDate: string; done: boolean } & (
   { kind: 'queue'; item: QueueItem } | { kind: 'task'; task: Task }
);

// Everything that waits for the person, by deadline. What was ticked today
// stays at the end of the list until tomorrow.
export const toDayItems = (
   queue: QueueItem[],
   tasks: Task[],
   userId: string,
   today: string,
): DayItem[] => {
   const fromQueue = queue
      .filter((item) => !item.completedAt || item.completedAt === today)
      .map((item): DayItem => ({
         kind: 'queue',
         key: item.id,
         dueDate: item.dueDate,
         done: !!item.completedAt,
         item,
      }));
   const fromTasks = tasks
      .filter(
         (task) =>
            needsAction(task, userId) ||
            (task.completedAt === today && isMine(task, userId)),
      )
      .map((task): DayItem => ({
         kind: 'task',
         key: task.id,
         dueDate: task.dueDate,
         done: isDone(task),
         task,
      }));
   return [...fromQueue, ...fromTasks].sort(
      (a, b) => Number(a.done) - Number(b.done) || byDueDate(a, b),
   );
};

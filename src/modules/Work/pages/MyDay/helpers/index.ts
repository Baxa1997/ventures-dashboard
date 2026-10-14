import {
   byDueDate,
   isDone,
   isMine,
   needsAction,
} from '@modules/Work/helpers';
import type { QueueItem, Task, TaskStatus } from '@shared/types/work.types';

// A row of "Нужно сделать вам": either an item that comes from a deal, the
// portfolio or a letter, or a task from the task list.
export type DayItem = { key: string; dueDate: string; done: boolean } & (
   | { kind: 'queue'; item: QueueItem }
   | { kind: 'task'; task: Task }
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
      .map(
         (item): DayItem => ({
            kind: 'queue',
            key: item.id,
            dueDate: item.dueDate,
            done: !!item.completedAt,
            item,
         }),
      );
   const fromTasks = tasks
      .filter(
         (task) =>
            needsAction(task, userId) ||
            (task.completedAt === today && isMine(task, userId)),
      )
      .map(
         (task): DayItem => ({
            kind: 'task',
            key: task.id,
            dueDate: task.dueDate,
            done: isDone(task),
            task,
         }),
      );
   return [...fromQueue, ...fromTasks].sort(
      (a, b) => Number(a.done) - Number(b.done) || byDueDate(a, b),
   );
};

// Ticking a task that somebody else checks sends it to them instead of closing it.
export const statusAfterTick = (task: Task, userId: string): TaskStatus => {
   if (isDone(task)) return 'in_progress';
   const checkedByOther = task.reviewerId && task.reviewerId !== userId;
   return checkedByOther && task.status !== 'review' ? 'review' : 'done';
};

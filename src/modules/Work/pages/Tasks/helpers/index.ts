import { byDueDate, isDone, isMine, taskKey } from '@modules/Work/helpers';
import type { Task } from '@shared/types/work.types';
import {
   TASK_VIEWS,
   TASK_WHO,
   type TaskView,
   type TaskWho,
} from '../constants';

export const toView = (value: string | null): TaskView =>
   TASK_VIEWS.find((view) => view === value) ?? 'list';

export const toWho = (value: string | null): TaskWho =>
   TASK_WHO.find((who) => who === value) ?? 'me';

export interface TaskFilters {
   type: string; // a task type's key, '' — every type
   query: string;
}

// The tasks the toolbar leaves: the person's or the team's, of a type, with
// the words in the number, the title, the description or the deal's name.
export const selectTasks = (
   tasks: Task[],
   who: TaskWho,
   { type, query }: TaskFilters,
   userId: string,
   targetName: (task: Task) => string,
) => {
   const words = query.trim().toLowerCase();
   return tasks.filter(
      (task) =>
         (who === 'all' || isMine(task, userId)) &&
         (!type || task.type === type) &&
         (!words ||
            [taskKey(task), task.title, task.context, targetName(task)]
               .join(' ')
               .toLowerCase()
               .includes(words)),
   );
};

// The open tasks by deadline (those without one last), then the closed ones,
// the latest closed first.
export const byDeadline = (tasks: Task[]) =>
   [...tasks].sort(
      (a, b) =>
         Number(isDone(a)) - Number(isDone(b)) ||
         (isDone(a)
            ? (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
            : byDueDate(a, b)),
   );

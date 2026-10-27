import {
   byDueDate,
   getAssigneeId,
   isDone,
   isOverdue,
   statusAfterTick,
   todayISO,
} from '@modules/Work/helpers';
import { useTasks, useWorkQuery } from '@modules/Work/hooks';
import work from '@modules/Work/services';
import type { Dashboard, Task } from '@shared/types/work.types';
import { useMemo } from 'react';

// What the dashboard shows: the fund's figures, counted by the work service
// from the deals, the portfolio and the meetings, and the signed-in person's
// open tasks, which come from the task list so a tick shows at once.
const useDashboard = (userId: string) => {
   const { tasks, targets, loading, updateTask } = useTasks();
   const board = useWorkQuery<Dashboard | null>(
      () => work.getDashboard(),
      null,
      [],
   );

   const mine = useMemo(() => {
      const today = todayISO();
      const open = tasks
         .filter((task) => !isDone(task) && getAssigneeId(task) === userId)
         .sort(byDueDate);
      return {
         tasks: open,
         overdue: open.filter((task) => isOverdue(task, today)).length,
      };
   }, [tasks, userId]);

   // the deal or the company a task is attached to
   const targetName = (task: Task) =>
      task.relation === 'none'
         ? ''
         : (targets[task.relation].find(({ id }) => id === task.relationId)
              ?.name ?? '');

   return {
      board: board.data,
      myTasks: mine.tasks,
      overdueTasks: mine.overdue,
      targetName,
      loading: board.loading || loading,
      // ticking a task closes it, or sends it to whoever checks it
      tickTask: (task: Task) =>
         updateTask(task.id, { status: statusAfterTick(task, userId) }),
   };
};

export default useDashboard;

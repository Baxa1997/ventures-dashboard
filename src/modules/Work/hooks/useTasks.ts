import { useCurrentUser } from '@shared/hooks';
import type {
   Employee,
   Task,
   TaskInput,
   TaskTargets,
} from '@shared/types/work.types';
import { useMemo } from 'react';
import work from '../services';
import useWorkQuery from './useWorkQuery';

const NO_TASKS: Task[] = [];
const NO_EMPLOYEES: Employee[] = [];
const NO_TARGETS: TaskTargets = { deal: [], portfolio: [] };

// Tasks, employees and what a task can be attached to, with the actions a
// person can take on a task.
const useTasks = () => {
   const user = useCurrentUser();
   const tasks = useWorkQuery(() => work.getTasks(), NO_TASKS, []);
   const employees = useWorkQuery(() => work.getEmployees(), NO_EMPLOYEES, []);
   const targets = useWorkQuery(() => work.getTargets(), NO_TARGETS, []);

   const actions = useMemo(
      () => ({
         createTask: (input: TaskInput) => work.createTask(input, user.id),
         updateTask: (id: string, patch: Partial<TaskInput>) =>
            work.updateTask(id, patch, user.id),
         removeTask: (id: string) => work.deleteTask(id),
         toggleChecklistItem: (taskId: string, itemId: string) =>
            work.toggleChecklistItem(taskId, itemId),
         addComment: (taskId: string, text: string) =>
            work.addComment(taskId, text, user.id),
      }),
      [user.id],
   );

   return {
      tasks: tasks.data,
      employees: employees.data,
      targets: targets.data,
      loading: tasks.loading || employees.loading,
      ...actions,
   };
};

export default useTasks;

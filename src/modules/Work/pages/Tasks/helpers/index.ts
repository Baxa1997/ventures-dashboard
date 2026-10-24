import {
   byDueDate,
   getAssigneeId,
   isDone,
   isMine,
   isOverdue,
   statusGroup,
} from '@modules/Work/helpers';
import { textToHtml } from '@shared/helpers';
import type {
   ChecklistItem,
   SystemTaskStatus,
   Task,
   TaskInput,
   TaskRelation,
   TaskType,
} from '@shared/types/work.types';
import {
   ALL,
   CLOSE_STEP,
   DEFAULT_TAB,
   NEXT_STEPS,
   TASK_TABS,
   type TaskTab,
} from '../constants';

export interface TaskFilters {
   search: string;
   assigneeId: string;
   type: TaskType | typeof ALL;
   relation: TaskRelation | typeof ALL;
}

export const INITIAL_FILTERS: TaskFilters = {
   search: '',
   assigneeId: ALL,
   type: ALL,
   relation: ALL,
};

export const toTab = (value: string | null): TaskTab =>
   TASK_TABS.find((tab) => tab === value) ?? DEFAULT_TAB;

export const matchesTab = (task: Task, tab: TaskTab, userId: string) => {
   if (tab === 'done') return isDone(task);
   if (isDone(task)) return false;
   if (tab === 'mine') return isMine(task, userId);
   if (tab === 'unassigned') return !task.assigneeId;
   if (tab === 'recurring') return task.recurrence !== 'none';
   return true;
};

export const countByTab = (tasks: Task[], userId: string) =>
   Object.fromEntries(
      TASK_TABS.map((tab) => [
         tab,
         tasks.filter((task) => matchesTab(task, tab, userId)).length,
      ]),
   ) as Record<TaskTab, number>;

// The figures in the page header.
export const summarize = (tasks: Task[]) => {
   const open = tasks.filter((task) => !isDone(task));
   return {
      open: open.length,
      overdue: open.filter((task) => isOverdue(task)).length,
      unassigned: open.filter((task) => !task.assigneeId).length,
   };
};

// Tasks of the tab that pass the filters, earliest deadline first.
export const selectTasks = (
   tasks: Task[],
   tab: TaskTab,
   userId: string,
   { search, assigneeId, type, relation }: TaskFilters,
) => {
   const query = search.trim().toLowerCase();
   return tasks
      .filter(
         (task) =>
            matchesTab(task, tab, userId) &&
            (assigneeId === ALL || getAssigneeId(task) === assigneeId) &&
            (type === ALL || task.type === type) &&
            (relation === ALL || task.relation === relation) &&
            (!query ||
               `${task.title} ${task.context} ${task.basis}`
                  .toLowerCase()
                  .includes(query)),
      )
      .sort(byDueDate);
};

const isSystem = (status: string): status is SystemTaskStatus =>
   status in NEXT_STEPS;

// The main button's step; a status the fund added moves on as its group:
// to work, to review or closed, and back to work once closed.
export const getNextStep = (task: Task) => {
   if (task.status === 'in_progress' && !task.reviewerId) return CLOSE_STEP;
   if (isSystem(task.status)) return NEXT_STEPS[task.status];
   const group = statusGroup(task.status);
   if (group === 'todo') return NEXT_STEPS.assigned;
   if (group === 'complete') return NEXT_STEPS.done;
   return task.reviewerId ? NEXT_STEPS.in_progress : CLOSE_STEP;
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

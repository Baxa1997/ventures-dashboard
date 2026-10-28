import type { TaskInput } from '@shared/types/work.types';
import { useSyncExternalStore } from 'react';

// What the form for a new task starts with, e.g. today's deadline for
// Мой день's «Задача на сегодня».
export type NewTaskPreset = Partial<Omit<TaskInput, 'checklist'>>;

// The task card over the page: a new task's form, or a task's card. null —
// closed.
export type TaskDialogState =
   | { kind: 'new'; preset: NewTaskPreset }
   | { kind: 'task'; id: string }
   | null;

/* The task card opens over whatever page is open, so the person stays where
   they were: the top bar's «+», the pages' «Новая задача» and the rows of
   tasks in Задачи, Мой день, the dashboard and the bell open it. */
let state: TaskDialogState = null;
const listeners = new Set<() => void>();

const setState = (value: TaskDialogState) => {
   state = value;
   listeners.forEach((listener) => listener());
};

export const openNewTask = (preset: NewTaskPreset = {}) =>
   setState({ kind: 'new', preset });
export const openTask = (id: string) => setState({ kind: 'task', id });
export const closeTaskDialog = () => setState(null);

const subscribe = (listener: () => void) => {
   listeners.add(listener);
   return () => {
      listeners.delete(listener);
   };
};

const useTaskDialog = () => useSyncExternalStore(subscribe, () => state);

export default useTaskDialog;

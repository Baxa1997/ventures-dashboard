import type { TaskInput } from '@shared/types/work.types';
import { useSyncExternalStore } from 'react';

// What the form for a new task starts with, e.g. today's deadline for
// Мой день's «Задача на сегодня».
export type NewTaskPreset = Partial<Omit<TaskInput, 'checklist'>>;

// Whether the form for a new task is open over the page: the top bar's «+» and
// a page's «Новая задача» open it, wherever the person is. null — closed.
let preset: NewTaskPreset | null = null;
const listeners = new Set<() => void>();

const setPreset = (value: NewTaskPreset | null) => {
   preset = value;
   listeners.forEach((listener) => listener());
};

export const openNewTask = (values: NewTaskPreset = {}) => setPreset(values);
export const closeNewTask = () => setPreset(null);

const subscribe = (listener: () => void) => {
   listeners.add(listener);
   return () => {
      listeners.delete(listener);
   };
};

const useNewTask = () => useSyncExternalStore(subscribe, () => preset);

export default useNewTask;

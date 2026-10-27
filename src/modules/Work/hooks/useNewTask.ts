import { useSyncExternalStore } from 'react';

// Whether the form for a new task is open over the page: the top bar's «+» and
// a page's «Новая задача» open it, wherever the person is.
let open = false;
const listeners = new Set<() => void>();

const setOpen = (value: boolean) => {
   open = value;
   listeners.forEach((listener) => listener());
};

export const openNewTask = () => setOpen(true);
export const closeNewTask = () => setOpen(false);

const subscribe = (listener: () => void) => {
   listeners.add(listener);
   return () => {
      listeners.delete(listener);
   };
};

const useNewTask = () => useSyncExternalStore(subscribe, () => open);

export default useNewTask;

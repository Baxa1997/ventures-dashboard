import { UcodeError } from '@shared/api/ucode';

/* The short notes at the bottom right: a change went through, or it did not
   and why. Any code shows one with toast.success or toast.error; the Toaster
   (@shared/components) draws them and takes each away after a while. */

export type ToastTone = 'success' | 'error';

export interface Toast {
   id: number;
   tone: ToastTone;
   title: string;
   description?: string;
}

const MAX = 4; // the oldest goes when a fifth comes

let toasts: Toast[] = [];
let lastId = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const show = (tone: ToastTone, title: string, description?: string) => {
   const id = ++lastId;
   toasts = [...toasts, { id, tone, title, description }].slice(-MAX);
   notify();
   return id;
};

export const toast = {
   success: (title: string, description?: string) =>
      show('success', title, description),
   error: (title: string, description?: string) =>
      show('error', title, description),
   dismiss: (id: number) => {
      toasts = toasts.filter((item) => item.id !== id);
      notify();
   },
};

export const toastStore = {
   get: () => toasts,
   subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
         listeners.delete(listener);
      };
   },
};

/* A modal dialog sits in the browser's top layer, over everything else; the
   Modal calls this after it opens, so the notes come back on top of it. */
const raisers = new Set<() => void>();

export const raiseToasts = () => raisers.forEach((raise) => raise());

export const onRaiseToasts = (raise: () => void) => {
   raisers.add(raise);
   return () => {
      raisers.delete(raise);
   };
};

// Why a request failed, in words for the person, never ucode's own message.
export type FailureReason =
   | 'Сессия закончилась — войдите снова.'
   | 'Нет прав на это действие.'
   | 'Запись не найдена — возможно, её уже удалили.'
   | 'Нет связи с сервером — проверьте интернет.'
   | 'Сервер не ответил — попробуйте ещё раз.'
   | 'Попробуйте ещё раз.';

export const failureReason = (error: unknown): FailureReason => {
   if (error instanceof UcodeError) {
      if (error.status === 401) return 'Сессия закончилась — войдите снова.';
      if (error.status === 403) return 'Нет прав на это действие.';
      if (error.status === 404)
         return 'Запись не найдена — возможно, её уже удалили.';
      if (error.status >= 500) return 'Сервер не ответил — попробуйте ещё раз.';
   }
   // fetch throws a TypeError when the request never reached the server
   if (error instanceof TypeError || !navigator.onLine)
      return 'Нет связи с сервером — проверьте интернет.';
   return 'Попробуйте ещё раз.';
};

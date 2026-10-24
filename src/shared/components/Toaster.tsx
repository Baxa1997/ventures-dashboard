import {
   failureReason,
   onRaiseToasts,
   type Toast,
   toast,
   toastStore,
} from '@shared/helpers/toast';
import clsx from 'clsx';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

// How long a note stays, in ms: an error longer, so it can be read.
const LASTS = { success: 4000, error: 7000 };

const ToastItem = ({ item }: { item: Toast }) => {
   const { t } = useTranslation('components');
   const [paused, setPaused] = useState(false);
   const left = useRef(LASTS[item.tone]);

   // the time left runs only while the pointer and the focus are elsewhere
   useEffect(() => {
      if (paused) return;
      const started = Date.now();
      const timer = window.setTimeout(
         () => toast.dismiss(item.id),
         left.current,
      );
      return () => {
         window.clearTimeout(timer);
         left.current -= Date.now() - started;
      };
   }, [paused, item.id]);

   const error = item.tone === 'error';
   const Icon = error ? CircleAlert : CircleCheck;

   return (
      <li
         className='border-line shadow-popup animate-rise flex w-full items-start gap-3 rounded-lg border bg-white px-4 py-3'
         role={error ? 'alert' : 'status'}
         onBlur={() => setPaused(false)}
         onFocus={() => setPaused(true)}
         onMouseEnter={() => setPaused(true)}
         onMouseLeave={() => setPaused(false)}
      >
         <Icon
            aria-hidden
            className={clsx(
               'mt-px size-5 shrink-0',
               error ? 'text-danger' : 'text-success-ink',
            )}
         />
         <div className='min-w-0 flex-1'>
            <p className='text-sm font-semibold'>{item.title}</p>
            {item.description && (
               <p className='text-ink-soft text-meta mt-0.5'>
                  {item.description}
               </p>
            )}
         </div>
         <button
            type='button'
            aria-label={t('Закрыть')}
            className='text-ink-soft hover:bg-ground hover:text-ink -mr-1.5 grid size-6 shrink-0 place-items-center rounded'
            onClick={() => toast.dismiss(item.id)}
         >
            <X aria-hidden className='size-4' />
         </button>
      </li>
   );
};

/* The notes, at the bottom right of every page. The list is a popover, so it
   is in the browser's top layer: shown again after a dialog opens, it is over
   the dialog too. A request nobody waited on that failed (an unhandled
   rejection) comes here as well. */
const Toaster = () => {
   const { t } = useTranslation('components');
   const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.get);
   const ref = useRef<HTMLOListElement>(null);

   useEffect(() => {
      const list = ref.current;
      if (!list || typeof list.showPopover !== 'function') return;
      const raise = () => {
         if (list.matches(':popover-open')) list.hidePopover();
         list.showPopover();
      };
      raise();
      return onRaiseToasts(raise);
   }, []);

   useEffect(() => {
      const onRejection = (event: PromiseRejectionEvent) => {
         const error: unknown = event.reason;
         if (!(error instanceof Error)) return;
         event.preventDefault();
         console.error(error);
         toast.error(t('Не удалось выполнить запрос'), t(failureReason(error)));
      };
      window.addEventListener('unhandledrejection', onRejection);
      return () =>
         window.removeEventListener('unhandledrejection', onRejection);
   }, [t]);

   return (
      <ol
         ref={ref}
         aria-label={t('Уведомления')}
         className='print-hidden text-ink fixed inset-auto right-4 bottom-4 left-4 m-0 ml-auto grid w-auto max-w-sm gap-2 overflow-visible border-0 bg-transparent p-0 sm:left-auto sm:w-sm'
         popover='manual'
      >
         {toasts.map((item) => (
            <ToastItem key={item.id} item={item} />
         ))}
      </ol>
   );
};

export default Toaster;

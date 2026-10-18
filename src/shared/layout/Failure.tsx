import { UcodeError } from '@shared/api/ucode';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/* What ucode refused. The services write a change to ucode and throw when it is
   refused; the pages wait on them without catching, so the failure comes here
   as an unhandled rejection and is shown until it is closed. */
const Failure = () => {
   const { t } = useTranslation('layout');
   const [message, setMessage] = useState('');

   useEffect(() => {
      const onRejection = (event: PromiseRejectionEvent) => {
         const error: unknown = event.reason;
         if (!(error instanceof Error)) return;
         event.preventDefault();
         console.error(error);
         setMessage(
            error instanceof UcodeError && error.status === 401
               ? t('Сессия закончилась, войдите снова')
               : t(
                    'ucode не принял изменение или не ответил. Обновите страницу и попробуйте ещё раз.',
                 ),
         );
      };
      window.addEventListener('unhandledrejection', onRejection);
      return () =>
         window.removeEventListener('unhandledrejection', onRejection);
   }, [t]);

   if (!message) return null;
   return (
      <div
         role='alert'
         className='print-hidden bg-danger-tint text-danger shadow-popup animate-pop fixed right-4 bottom-4 z-50 flex max-w-md items-start gap-3 rounded-lg px-4 py-3'
      >
         <p className='flex-1'>{message}</p>
         <button
            type='button'
            aria-label={t('Закрыть')}
            className='grid size-6 shrink-0 place-items-center rounded hover:bg-black/5'
            onClick={() => setMessage('')}
         >
            <X aria-hidden className='size-4' />
         </button>
      </div>
   );
};

export default Failure;

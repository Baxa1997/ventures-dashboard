import { failureReason, toast } from '@shared/helpers/toast';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

// Saves one change after another, so a quick second change cannot overtake
// the first; a failure says so and why. The promise it returns settles when
// the change is saved or has failed, never with an error.
const useSaveQueue = () => {
   const { t } = useTranslation('components');
   const queue = useRef<Promise<unknown>>(Promise.resolve());
   return (save: () => Promise<unknown>, success?: string) => {
      queue.current = queue.current.then(save).then(
         () => success && toast.success(success),
         (failure) => {
            console.error(failure);
            toast.error(
               t('Не удалось сохранить изменения'),
               t(failureReason(failure)),
            );
         },
      );
      return queue.current;
   };
};

export default useSaveQueue;

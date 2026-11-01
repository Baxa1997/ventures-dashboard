import { toast } from '@shared/helpers/toast';
import { useAction, useServiceData } from '@shared/hooks';
import { useTranslation } from 'react-i18next';
import site from '../services';

const load = () => site.getState();
const subscribe = (listener: () => void) => site.subscribe(listener);

export const useSite = () => useServiceData(load, subscribe);

/* A save on the website: its note says when the visitors see it, since the
   website may not have been reachable to be told. */
export const useSiteSave = <Args extends unknown[]>(
   action: (...args: Args) => Promise<boolean>,
) => {
   const { t } = useTranslation('site');
   return useAction(
      async (...args: Args) => {
         const told = await action(...args);
         toast.success(
            told
               ? t('Сохранено и уже на сайте')
               : t('Сохранено. На сайте появится в течение 5 минут'),
         );
      },
      { success: false },
   );
};

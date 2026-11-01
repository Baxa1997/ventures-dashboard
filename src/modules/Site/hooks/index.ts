import { toast } from '@shared/helpers/toast';
import { useAction, useServiceData } from '@shared/hooks';
import { useTranslation } from 'react-i18next';
import site from '../services';

const load = () => site.getState();
const subscribe = (listener: () => void) => site.subscribe(listener);

export const useSite = () => useServiceData(load, subscribe);

// A save on the website: the website reads ucode on every visit.
export const useSiteSave = <Args extends unknown[]>(
   action: (...args: Args) => Promise<unknown>,
) => {
   const { t } = useTranslation('site');
   return useAction(
      async (...args: Args) => {
         await action(...args);
         toast.success(t('Сохранено и уже на сайте'));
      },
      { success: false },
   );
};

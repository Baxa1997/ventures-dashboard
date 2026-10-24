import { failureReason, toast } from '@shared/helpers/toast';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// What the action does, for the note shown after it.
export type ActionKind = 'save' | 'create' | 'delete' | 'send' | 'upload';

const NOTES = {
   save: ['Изменения сохранены', 'Не удалось сохранить изменения'],
   create: ['Добавлено', 'Не удалось добавить'],
   delete: ['Удалено', 'Не удалось удалить'],
   send: ['Отправлено', 'Не удалось отправить'],
   upload: ['Файл загружен', 'Не удалось загрузить файл'],
} as const;

export interface ActionOptions<Args extends unknown[] = []> {
   kind?: ActionKind; // 'save' unless given
   success?: string | false | ((...args: Args) => string); // the note after it, or none
   error?: string; // the note when it fails; why comes under it
}

/* A request a button sends: `pending` while it runs, for the button's
   `loading`; a second click meanwhile does nothing. After it a note says it
   went through, or that it did not and why. `run` resolves to whether it went
   through, so a dialog closes only then and stays open to try again. */
const useAction = <Args extends unknown[]>(
   action: (...args: Args) => unknown,
   { kind = 'save', success, error }: ActionOptions<Args> = {},
) => {
   const { t } = useTranslation('components');
   const [pending, setPending] = useState(false);
   const running = useRef(false);

   const run = async (...args: Args) => {
      if (running.current) return false;
      running.current = true;
      setPending(true);
      try {
         await action(...args);
         if (success !== false)
            toast.success(
               typeof success === 'function'
                  ? success(...args)
                  : (success ?? t(NOTES[kind][0])),
            );
         return true;
      } catch (failure) {
         console.error(failure);
         toast.error(error ?? t(NOTES[kind][1]), t(failureReason(failure)));
         return false;
      } finally {
         running.current = false;
         setPending(false);
      }
   };

   return { run, pending };
};

/* The same for a button whose request is written where it is sent:
   `run(() => deals.addRisk(…))`. */
export const useRequest = (options: ActionOptions = {}) =>
   useAction((request: () => unknown) => request(), {
      ...options,
      success:
         typeof options.success === 'function'
            ? options.success()
            : options.success,
   });

export default useAction;

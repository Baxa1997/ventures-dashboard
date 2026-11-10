import {
   Button,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { useAction } from '@shared/hooks';
import clsx from 'clsx';
import { Folder, FolderKanban } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface MoveTarget {
   value: string; // the place, as the moving thing's service takes it
   label: string;
   depth: number; // how deep in the tree: the indent
   module?: boolean; // a module of its own: its sign
   heading?: boolean; // a level shown only to place the folders under it
}

interface MoveDialogProps {
   open: boolean;
   name: string; // what moves, under the title
   targets: MoveTarget[];
   current: string; // where it lies now
   onMove: (value: string, label: string) => Promise<unknown>;
   onClose: () => void;
}

/* «Переместить» in Документы: the places a document or folder can go, as
   a tree, one of them chosen. Where it lies now is marked and cannot be
   chosen again. */
const MoveDialog = ({
   open,
   name,
   targets,
   current,
   onMove,
   onClose,
}: MoveDialogProps) => {
   const { t } = useTranslation('documents');
   const [chosen, setChosen] = useState(current);
   useEffect(() => {
      if (open) setChosen(current);
   }, [open, current]);
   const target = targets.find(({ value }) => value === chosen);
   const moving = useAction(() => onMove(chosen, target?.label ?? ''), {
      success: t('«{{title}}» перемещён в «{{folder}}»', {
         title: name,
         folder: target?.label ?? '',
      }),
   });
   const submit = async (event: FormEvent) => {
      event.preventDefault();
      if (chosen !== current && target && (await moving.run())) onClose();
   };

   return (
      <Modal open={open} subtitle={name} title={t('Переместить')} onClose={onClose}>
         <form noValidate className={MODAL_FORM} onSubmit={submit}>
            <ModalBody>
               <p className='text-ink-soft text-meta mb-2'>
                  {t('Куда переместить')}
               </p>
               <ul
                  aria-label={t('Куда переместить')}
                  className='border-line max-h-80 overflow-y-auto rounded-lg border'
                  role='radiogroup'
               >
                  {targets.map((one) => {
                     const here = one.value === current;
                     const picked = one.value === chosen;
                     const Icon = one.module ? FolderKanban : Folder;
                     return (
                        <li key={`${one.value}:${one.label}`}>
                           <button
                              type='button'
                              aria-checked={picked}
                              className={clsx(
                                 'text-meta flex w-full items-center gap-2 py-2 pr-3 text-left',
                                 one.heading
                                    ? 'text-ink-faint cursor-default'
                                    : picked
                                      ? 'bg-accent-tint text-ink-strong font-semibold'
                                      : 'hover:bg-hover',
                              )}
                              data-hint={
                                 here
                                    ? t('Здесь лежит сейчас')
                                    : one.heading
                                      ? undefined
                                      : t('Переместить сюда')
                              }
                              disabled={one.heading}
                              role='radio'
                              style={{ paddingLeft: `${0.75 + one.depth * 1.25}rem` }}
                              onClick={() => setChosen(one.value)}
                           >
                              <Icon
                                 aria-hidden
                                 className={clsx(
                                    'size-4 shrink-0',
                                    one.heading ? 'text-ink-faint' : 'text-warning',
                                 )}
                              />
                              <span className='min-w-0 flex-1 truncate'>
                                 {one.label}
                              </span>
                              {here && (
                                 <span className='text-ink-faint text-xs font-normal'>
                                    {t('сейчас здесь')}
                                 </span>
                              )}
                           </button>
                        </li>
                     );
                  })}
               </ul>
            </ModalBody>
            <ModalFooter>
               <Button
                  hint={t('Закрыть окно, ничего не меняя')}
                  variant='text'
                  onClick={onClose}
               >
                  {t('Отмена')}
               </Button>
               <Button
                  disabled={chosen === current || !target || target.heading}
                  hint={
                     chosen === current
                        ? t('Выберите другую папку')
                        : t('Переместить в выбранную папку')
                  }
                  loading={moving.pending}
                  type='submit'
               >
                  {t('Переместить')}
               </Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default MoveDialog;

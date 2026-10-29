import { LISTS } from '@modules/Settings/constants';
import { describeRow } from '@modules/Settings/helpers';
import settings, { listOf, nameOf } from '@modules/Settings/services';
import { ConfirmDialog, Field } from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type { ListItem, ListKind } from '@shared/types/settings.types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DeleteListItemDialogProps {
   kind: ListKind;
   item: ListItem | null; // null: the dialog is closed
   onClose: () => void;
}

// What uses the row, counted when the dialog opens, and the row to move
// those records to.
const Usage = ({
   kind,
   item,
   used,
   replacement,
   onReplace,
}: {
   kind: ListKind;
   item: ListItem;
   used: number | null;
   replacement: string;
   onReplace: (key: string) => void;
}) => {
   const { t } = useTranslation('settings');
   const others = listOf(kind).filter((other) => other.id !== item.id);

   if (used === null) return <p>{t('Проверяем, где используется…')}</p>;
   if (used < 0)
      return (
         <p className='text-danger'>
            {t('Не удалось проверить, где используется строка.')}
         </p>
      );
   if (used === 0) return <p>{t('Строка нигде не используется.')}</p>;
   return (
      <>
         <p>
            {t('«{{name}}» используется в {{count}} записи.', {
               name: nameOf(item),
               count: used,
            })}{' '}
            {t('Перед удалением они перейдут на другую строку списка.')}
         </p>
         {others.length ? (
            <Field label={t('Заменить на')}>
               <select
                  className='field-input'
                  value={replacement}
                  onChange={(event) => onReplace(event.target.value)}
               >
                  {others.map((other) => (
                     <option key={other.id} value={other.key}>
                        {nameOf(other)}
                     </option>
                  ))}
               </select>
            </Field>
         ) : (
            <p className='text-danger'>
               {t('В списке нет другой строки — сначала добавьте её.')}
            </p>
         )}
      </>
   );
};

/* Deleting a row of a list: what uses it (deals, applications, tasks,
   figures) is counted first; a row in use is deleted only together with
   moving those records to another row of the list. */
const DeleteListItemDialog = ({
   kind,
   item,
   onClose,
}: DeleteListItemDialogProps) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   const list = LISTS[kind];
   // the count and the choice belong to the row they were made for
   const [usage, setUsage] = useState({ id: '', count: 0 });
   const [choice, setChoice] = useState({ id: '', key: '' });
   const used = item && usage.id === item.id ? usage.count : null;
   const replacement =
      choice.id === item?.id
         ? choice.key
         : (listOf(kind).find((other) => other.id !== item?.id)?.key ?? '');

   useEffect(() => {
      if (!item) return;
      let active = true;
      const done = (count: number) =>
         active && setUsage({ id: item.id, count });
      settings
         .usageOf(kind, item.id)
         .then(done)
         .catch(() => done(-1));
      return () => {
         active = false;
      };
   }, [kind, item]);

   return (
      <ConfirmDialog
         confirmLabel={used ? t('Заменить и удалить') : t('Удалить')}
         disabled={used === null || used < 0 || (used > 0 && !replacement)}
         note={t('Удаление попадёт в журнал')}
         open={item !== null}
         subtitle={t(list.title)}
         title={t('Удалить «{{name}}»?', { name: item ? nameOf(item) : '' })}
         onClose={onClose}
         onConfirm={() =>
            item &&
            settings.deleteListItem(
               kind,
               item.id,
               used ? replacement : null,
               user.id,
               t('Справочник «{{list}}» · удалено: {{name}}', {
                  list: t(list.title),
                  name: item.names.ru,
               }),
               describeRow(t, kind, item),
            )
         }
      >
         {item && (
            <Usage
               item={item}
               kind={kind}
               replacement={replacement}
               used={used}
               onReplace={(key) => setChoice({ id: item.id, key })}
            />
         )}
      </ConfirmDialog>
   );
};

export default DeleteListItemDialog;

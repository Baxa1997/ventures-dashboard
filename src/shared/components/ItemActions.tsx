import clsx from 'clsx';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ItemActionsProps {
   name: string; // the item, for screen readers: «Изменить: Seed»
   onEdit?: () => void;
   onDelete?: () => void; // not given: the item is not deleted here
   deleteLabel?: string; // «Убрать» where the item is taken off, not deleted
   icons?: boolean; // a pencil and a bin, for a table's last column
   className?: string;
}

const ICON =
   'text-ink-soft hover:bg-ground grid size-7 place-items-center rounded-md';

/* An item's «Изменить» and «Удалить», side by side. The delete only asks:
   the confirmation is a ConfirmDialog of the caller. */
const ItemActions = ({
   name,
   onEdit,
   onDelete,
   deleteLabel,
   icons = false,
   className,
}: ItemActionsProps) => {
   const { t } = useTranslation('components');
   const remove = deleteLabel ?? t('Удалить');

   if (icons)
      return (
         <span className={clsx('flex justify-end', className)}>
            {onEdit && (
               <button
                  type='button'
                  aria-label={t('Изменить: {{name}}', { name })}
                  className={clsx(ICON, 'hover:text-ink')}
                  title={t('Изменить')}
                  onClick={onEdit}
               >
                  <Pencil aria-hidden className='size-3.5' />
               </button>
            )}
            {onDelete ? (
               <button
                  type='button'
                  aria-label={`${remove}: ${name}`}
                  className={clsx(ICON, 'hover:text-danger')}
                  title={remove}
                  onClick={onDelete}
               >
                  <Trash2 aria-hidden className='size-3.5' />
               </button>
            ) : (
               // keeps the pencils of a column in line
               onEdit && <span aria-hidden className='size-7' />
            )}
         </span>
      );

   return (
      // the text takes the size of what is around it
      <span className={clsx('flex flex-wrap gap-x-3 gap-y-1', className)}>
         {onEdit && (
            <button
               type='button'
               aria-label={t('Изменить: {{name}}', { name })}
               className='text-ink-soft hover:text-ink'
               onClick={onEdit}
            >
               {t('Изменить')}
            </button>
         )}
         {onDelete && (
            <button
               type='button'
               aria-label={`${remove}: ${name}`}
               className='text-ink-soft hover:text-danger'
               onClick={onDelete}
            >
               {remove}
            </button>
         )}
      </span>
   );
};

export default ItemActions;

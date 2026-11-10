import documents from '@modules/Documents/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { useAction, useCurrentUser } from '@shared/hooks';
import type { FileFolder } from '@shared/types/documents.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface FolderDraft {
   folder: FileFolder | null; // null: a new one
   parent: string; // where a new one goes: '' a module, 'fund', 'fund:hr', a folder
}

interface FolderDialogProps {
   draft: FolderDraft | null; // null: closed
   onClose: () => void;
}

/* A module or folder of the fund's own in Документы (batch 29), made or
   renamed: its name, and for a module at the top the line under it. Where
   it lies changes with «Переместить». */
const FolderDialog = ({ draft, onClose }: FolderDialogProps) => {
   const { t } = useTranslation('documents');
   const module = draft !== null && (draft.folder?.parent ?? draft.parent) === '';
   const title = draft?.folder
      ? module
         ? t('Модуль')
         : t('Папка')
      : module
        ? t('Новый модуль')
        : t('Новая папка');
   return (
      <Modal open={draft !== null} title={title} onClose={onClose}>
         {draft && <FolderForm draft={draft} onClose={onClose} />}
      </Modal>
   );
};

const FolderForm = ({
   draft,
   onClose,
}: {
   draft: FolderDraft;
   onClose: () => void;
}) => {
   const { t } = useTranslation('documents');
   const user = useCurrentUser();
   const module = (draft.folder?.parent ?? draft.parent) === '';
   const [name, setName] = useState(draft.folder?.name ?? '');
   const [hint, setHint] = useState(draft.folder?.hint ?? '');
   const [tried, setTried] = useState(false);
   const saving = useAction(
      () =>
         draft.folder
            ? documents.updateFolder(draft.folder.id, {
                 name: name.trim(),
                 hint: module ? hint.trim() : '',
              })
            : documents.addFolder(
                 {
                    name: name.trim(),
                    hint: module ? hint.trim() : '',
                    parent: draft.parent,
                 },
                 user.id,
              ),
      {
         kind: draft.folder ? 'save' : 'create',
         success: module ? t('Модуль сохранён') : t('Папка сохранена'),
      },
   );
   const submit = async (event: FormEvent) => {
      event.preventDefault();
      setTried(true);
      if (name.trim() && (await saving.run())) onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               <Field
                  error={
                     tried && !name.trim() ? t('Напишите название') : undefined
                  }
                  label={t('Название')}
               >
                  <input
                     data-autofocus
                     className='field-input'
                     maxLength={120}
                     placeholder={
                        module ? t('например, Юридический отдел') : t('например, Договоры аренды')
                     }
                     value={name}
                     onChange={(event) => setName(event.target.value)}
                  />
               </Field>
               {module && (
                  <Field
                     hint={t('Строка под названием модуля в списке.')}
                     label={t('Описание')}
                  >
                     <input
                        className='field-input'
                        maxLength={200}
                        value={hint}
                        onChange={(event) => setHint(event.target.value)}
                     />
                  </Field>
               )}
            </div>
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
               hint={module ? t('Сохранить модуль') : t('Сохранить папку')}
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

export default FolderDialog;

import { APPROVERS, TAB_LABELS, TABS } from '@modules/Documents/constants';
import documents from '@modules/Documents/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { formatDate, todayISO } from '@shared/helpers';
import type {
   Approver,
   DocCategory,
   FundDocument,
} from '@shared/types/documents.types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DocumentDialogProps {
   mode: 'order' | 'document' | null; // null — closed
   tab: DocCategory; // the tab a new document goes to by default
   onClose: () => void;
   onAdded: (document: FundDocument) => void;
}

/* A new order gets the next number of the year and today's date. Any other
   document is uploaded as a draft of its section; only its file name is kept
   until there is file storage. */
const DocumentDialog = ({
   mode,
   tab,
   onClose,
   onAdded,
}: DocumentDialogProps) => {
   const { t } = useTranslation('documents');
   const order = mode === 'order';
   const [category, setCategory] = useState<DocCategory>(tab);
   const [title, setTitle] = useState('');
   const [note, setNote] = useState('');
   const [approvedBy, setApprovedBy] = useState<Approver>('director');
   const [file, setFile] = useState<string | null>(null);
   const [number, setNumber] = useState('');
   const [error, setError] = useState('');

   useEffect(() => {
      if (mode === 'order') documents.nextOrderNumber().then(setNumber);
      if (mode === 'document')
         setCategory(tab === 'orders' ? 'corporate' : tab);
   }, [mode, tab]);

   const close = () => {
      setTitle('');
      setNote('');
      setFile(null);
      setError('');
      onClose();
   };

   return (
      <Modal
         open={mode !== null}
         subtitle={
            order
               ? t('{{number}} от {{date}}', {
                    number,
                    date: formatDate(todayISO()),
                 })
               : undefined
         }
         title={order ? t('Новый приказ') : t('Загрузить документ')}
         onClose={close}
      >
         <form
            className={MODAL_FORM}
            onSubmit={async (event) => {
               event.preventDefault();
               if (!title.trim()) {
                  setError(
                     order
                        ? t('Напишите, о чём приказ')
                        : t('Укажите название документа'),
                  );
                  return;
               }
               const added = await documents.addDocument(
                  order
                     ? {
                          category: 'orders',
                          title: t('{{number}} от {{date}}', {
                             number,
                             date: todayISO().split('-').reverse().join('.'),
                          }),
                          note: title.trim(),
                          approvedBy: 'director',
                          file,
                       }
                     : {
                          category,
                          title: title.trim(),
                          note: note.trim(),
                          approvedBy,
                          file,
                       },
               );
               close();
               onAdded(added);
            }}
         >
            <ModalBody>
               <div className='flex flex-col gap-4'>
                  {!order && (
                     <Field label={t('Раздел')}>
                        <select
                           className='field-input'
                           value={category}
                           onChange={(event) =>
                              setCategory(event.target.value as DocCategory)
                           }
                        >
                           {TABS.filter((id) => id !== 'orders').map((id) => (
                              <option key={id} value={id}>
                                 {t(TAB_LABELS[id])}
                              </option>
                           ))}
                        </select>
                     </Field>
                  )}
                  <Field
                     error={error}
                     label={order ? t('О чём приказ') : t('Название')}
                  >
                     <input
                        data-autofocus
                        aria-invalid={!!error}
                        className='field-input'
                        value={title}
                        onChange={(event) => {
                           setTitle(event.target.value);
                           setError('');
                        }}
                     />
                  </Field>
                  {!order && (
                     <>
                        <Field label={t('Что изменилось')}>
                           <input
                              className='field-input'
                              value={note}
                              onChange={(event) => setNote(event.target.value)}
                           />
                        </Field>
                        <Field label={t('Кем утверждается')}>
                           <select
                              className='field-input'
                              value={approvedBy}
                              onChange={(event) =>
                                 setApprovedBy(event.target.value as Approver)
                              }
                           >
                              {(Object.keys(APPROVERS) as Approver[]).map(
                                 (value) => (
                                    <option key={value} value={value}>
                                       {t(APPROVERS[value])}
                                    </option>
                                 ),
                              )}
                           </select>
                        </Field>
                     </>
                  )}
                  <Field label={t('Файл')}>
                     <input
                        key={mode ?? 'closed'}
                        className='field-input pt-2'
                        type='file'
                        onChange={(event) =>
                           setFile(event.target.files?.[0]?.name ?? null)
                        }
                     />
                  </Field>
               </div>
            </ModalBody>
            <ModalFooter
               note={t('Сохраняется имя файла: хранилища файлов пока нет')}
            >
               <Button variant='ghost' onClick={close}>
                  {t('Отмена')}
               </Button>
               <Button type='submit'>
                  {order ? t('Создать приказ') : t('Загрузить')}
               </Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default DocumentDialog;

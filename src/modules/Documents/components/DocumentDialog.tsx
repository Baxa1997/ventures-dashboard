import {
   APPROVERS,
   NOTE_MAX,
   STATUS_ORDER,
   STATUSES,
   TAB_LABELS,
   TABS,
   TITLE_MAX,
} from '@modules/Documents/constants';
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
import { useCurrentUser, useRequest } from '@shared/hooks';
import type {
   Approver,
   DocCategory,
   DocStatus,
   DocumentInput,
   FundDocument,
} from '@shared/types/documents.types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type DocumentDialogMode = 'order' | 'document' | FundDocument;

interface DocumentDialogProps {
   mode: DocumentDialogMode | null; // a document: edit it; null — closed
   tab: DocCategory; // the tab a new document goes to by default
   onClose: () => void;
   onSaved: (id: string, category: DocCategory) => void;
}

const EMPTY: DocumentInput = {
   category: 'corporate',
   title: '',
   note: '',
   approvedBy: 'director',
   status: 'draft',
   date: '',
   link: '',
};

const isLink = (value: string) => /^https?:\/\/\S+$/.test(value);

/* A new order gets the next number of the year and today's date, and is in
   force at once. Any other document starts as a draft of its section. The
   file stays where the fund keeps it; the document holds a link to it. */
const DocumentDialog = ({
   mode,
   tab,
   onClose,
   onSaved,
}: DocumentDialogProps) => {
   const { t } = useTranslation('documents');
   const user = useCurrentUser();
   const order = mode === 'order';
   const editing = typeof mode === 'object' && mode !== null ? mode : null;
   const [values, setValues] = useState<DocumentInput>(EMPTY);
   const [number, setNumber] = useState('');
   const [errors, setErrors] = useState<{ title?: string; link?: string }>({});
   const saving = useRequest(
      editing ? {} : { kind: 'create', success: t('Документ добавлен') },
   );

   useEffect(() => {
      setErrors({});
      if (editing) setValues(editing);
      else if (mode === 'order') {
         setValues({ ...EMPTY, category: 'orders', status: 'active' });
         documents.nextOrderNumber().then(setNumber);
      } else if (mode === 'document')
         setValues({
            ...EMPTY,
            category: tab === 'orders' ? 'corporate' : tab,
         });
   }, [mode, tab, editing]);

   const set = <K extends keyof DocumentInput>(
      key: K,
      value: DocumentInput[K],
   ) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
   };

   const submit = async () => {
      const subject = values.title.trim();
      const link = values.link.trim();
      const found = {
         title: subject
            ? undefined
            : order
              ? t('Напишите, о чём приказ')
              : t('Укажите название документа'),
         link:
            !link || isLink(link)
               ? undefined
               : t('Ссылка должна начинаться с https://'),
      };
      if (found.title || found.link) return setErrors(found);
      const today = todayISO();
      const input: DocumentInput = order
         ? {
              ...values,
              // the number is its title, the same in every language; what it
              // is about, its note
              title: number,
              note: subject,
              date: today,
              link,
           }
         : { ...values, title: subject, note: values.note.trim(), link };
      if (
         await saving.run(async () => {
            const id = editing
               ? (await documents.updateDocument(editing.id, input), editing.id)
               : await documents.addDocument(input, user.id);
            onSaved(id, input.category);
         })
      )
         onClose();
   };

   const title = editing
      ? t('Документ')
      : order
        ? t('Новый приказ')
        : t('Добавить документ');

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
         title={title}
         onClose={onClose}
      >
         <form
            className={MODAL_FORM}
            onSubmit={(event) => {
               event.preventDefault();
               void submit();
            }}
         >
            <ModalBody>
               <div className='flex flex-col gap-4'>
                  {!order && (
                     <Field label={t('Раздел')}>
                        <select
                           className='field-input'
                           value={values.category}
                           onChange={(event) =>
                              set('category', event.target.value as DocCategory)
                           }
                        >
                           {TABS.filter((id) => editing || id !== 'orders').map(
                              (id) => (
                                 <option key={id} value={id}>
                                    {t(TAB_LABELS[id])}
                                 </option>
                              ),
                           )}
                        </select>
                     </Field>
                  )}
                  <Field
                     error={errors.title}
                     label={order ? t('О чём приказ') : t('Название')}
                  >
                     <input
                        data-autofocus
                        aria-invalid={!!errors.title}
                        className='field-input'
                        maxLength={TITLE_MAX}
                        value={values.title}
                        onChange={(event) => set('title', event.target.value)}
                     />
                  </Field>
                  {!order && (
                     <>
                        <Field label={t('Примечание')}>
                           <textarea
                              className='field-input'
                              maxLength={NOTE_MAX}
                              rows={2}
                              value={values.note}
                              onChange={(event) =>
                                 set('note', event.target.value)
                              }
                           />
                        </Field>
                        <div className='grid gap-4 sm:grid-cols-2'>
                           <Field label={t('Кем утверждается')}>
                              <select
                                 className='field-input'
                                 value={values.approvedBy}
                                 onChange={(event) =>
                                    set(
                                       'approvedBy',
                                       event.target.value as Approver,
                                    )
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
                           <Field label={t('Статус')}>
                              <select
                                 className='field-input'
                                 value={values.status}
                                 onChange={(event) =>
                                    set(
                                       'status',
                                       event.target.value as DocStatus,
                                    )
                                 }
                              >
                                 {STATUS_ORDER.map((value) => (
                                    <option key={value} value={value}>
                                       {t(STATUSES[value].label)}
                                    </option>
                                 ))}
                              </select>
                           </Field>
                        </div>
                        <Field label={t('Дата редакции')}>
                           <input
                              className='field-input'
                              type='date'
                              value={values.date}
                              onChange={(event) =>
                                 set('date', event.target.value)
                              }
                           />
                        </Field>
                     </>
                  )}
                  <Field
                     error={errors.link}
                     hint={t(
                        'Где файл лежит у фонда: диск, SharePoint, Notion',
                     )}
                     label={t('Ссылка на файл')}
                  >
                     <input
                        aria-invalid={!!errors.link}
                        className='field-input'
                        inputMode='url'
                        placeholder='https://'
                        value={values.link}
                        onChange={(event) => set('link', event.target.value)}
                     />
                  </Field>
               </div>
            </ModalBody>
            <ModalFooter
               note={t(
                  'Файл остаётся там, где его хранит фонд: в ucode Files он был бы открыт любому, у кого есть ссылка',
               )}
            >
               <Button variant='ghost' onClick={onClose}>
                  {t('Отмена')}
               </Button>
               <Button loading={saving.pending} type='submit'>
                  {editing
                     ? t('Сохранить')
                     : order
                       ? t('Создать приказ')
                       : t('Добавить')}
               </Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default DocumentDialog;

import { formatDate, personName } from '@shared/helpers';
import { useAction, useAttachments, useCurrentUser } from '@shared/hooks';
import attachments from '@shared/services/attachments';
import type {
   Attachment,
   AttachmentPlace,
} from '@shared/types/attachments.types';
import clsx from 'clsx';
import { FileText, Link2 } from 'lucide-react';
import { type FormEvent, type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button, { Spinner } from './Button';
import ConfirmDialog from './ConfirmDialog';
import Field from './Field';
import ItemActions from './ItemActions';
import Modal, { MODAL_FORM, ModalBody, ModalFooter } from './Modal';

interface AttachmentsProps {
   place: AttachmentPlace;
   editable: boolean;
   className?: string;
   empty?: string; // what an empty list says; nothing when not given
   extra?: ReactNode; // another way to add, beside «Добавить ссылку»
}

// "example.com/deck" → "https://example.com/deck"; '' when it is no address
const toUrl = (text: string) => {
   const value = text.trim();
   if (!value) return '';
   const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
   try {
      return new URL(url).hostname.includes('.') ? url : '';
   } catch {
      return '';
   }
};

// A link's title and address, or a file's title.
const EditForm = ({
   item,
   onClose,
}: {
   item: Attachment;
   onClose: () => void;
}) => {
   const { t } = useTranslation('components');
   const [title, setTitle] = useState(item.title);
   const [url, setUrl] = useState(item.url);
   const [error, setError] = useState('');
   const link = item.kind === 'link';
   const save = useAction((address: string) =>
      attachments.update(item.id, {
         title: title.trim() || (link ? new URL(address).hostname : ''),
         ...(link && { url: address }),
      }),
   );

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const address = link ? toUrl(url) : item.url;
      if (!address) {
         setError(t('Вставьте адрес: https://…'));
         return;
      }
      if (await save.run(address)) onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               {link && (
                  <Field error={error || undefined} label={t('Адрес ссылки')}>
                     <input
                        aria-invalid={!!error}
                        className='field-input'
                        placeholder='https://'
                        value={url}
                        onChange={(event) => {
                           setUrl(event.target.value);
                           setError('');
                        }}
                     />
                  </Field>
               )}
               <Field label={link ? t('Название ссылки') : t('Название файла')}>
                  <input
                     data-autofocus
                     className='field-input'
                     maxLength={120}
                     value={title}
                     onChange={(event) => setTitle(event.target.value)}
                  />
               </Field>
            </div>
         </ModalBody>
         <ModalFooter>
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button
               disabled={!link && !title.trim()}
               loading={save.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

/* The links and files of one place on a card (a deal's screening, a
   request, a DD workstream, a company): each opens in a new tab. Whoever may
   edit the card adds a link, uploads several files at once, renames one or
   deletes it after confirming. An uploaded file opens for anyone who has its
   address. */
const Attachments = ({
   place,
   editable,
   className,
   empty,
   extra,
}: AttachmentsProps) => {
   const { t } = useTranslation('components');
   const user = useCurrentUser();
   const items = useAttachments(place);
   const input = useRef<HTMLInputElement>(null);
   const [adding, setAdding] = useState(false);
   const [link, setLink] = useState({ url: '', title: '' });
   const [error, setError] = useState('');
   const [uploading, setUploading] = useState(0);
   const [editing, setEditing] = useState<Attachment | null>(null);
   const [removing, setRemoving] = useState<Attachment | null>(null);
   const adder = useAction(
      (url: string) =>
         attachments.addLink(
            place,
            { url, title: link.title.trim() || new URL(url).hostname },
            user.id,
         ),
      { kind: 'create', success: t('Ссылка добавлена') },
   );
   const uploader = useAction(
      (files: File[]) => attachments.uploadFiles(place, files, user.id),
      {
         kind: 'upload',
         success: (files) =>
            files.length > 1
               ? t('Файлы загружены: {{count}}', { count: files.length })
               : t('Файл загружен'),
      },
   );

   const addLink = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const url = toUrl(link.url);
      if (!url) {
         setError(t('Вставьте адрес: https://…'));
         return;
      }
      if (!(await adder.run(url))) return;
      setLink({ url: '', title: '' });
      setAdding(false);
   };

   const upload = async (files: File[]) => {
      if (!files.length) return;
      setUploading(files.length);
      await uploader.run(files);
      setUploading(0);
   };

   return (
      <div className={clsx('text-meta', className)}>
         {items.length > 0 ? (
            <ul className='flex flex-col gap-2'>
               {items.map((item) => {
                  const Icon = item.kind === 'file' ? FileText : Link2;
                  return (
                     <li key={item.id} className='flex items-start gap-2.5'>
                        <Icon
                           aria-hidden
                           className='text-ink-soft mt-0.5 size-4 shrink-0'
                        />
                        <div className='min-w-0 flex-1'>
                           <a
                              className='link break-all'
                              href={item.url}
                              rel='noreferrer'
                              target='_blank'
                           >
                              {item.title}
                           </a>
                           <div className='text-ink-soft text-xs'>
                              {[
                                 personName(item.addedById),
                                 formatDate(item.addedAt.slice(0, 10)),
                              ]
                                 .filter(Boolean)
                                 .join(' · ')}
                           </div>
                        </div>
                        {editable && (
                           <ItemActions
                              icons
                              className='-my-1 shrink-0'
                              name={item.title}
                              onDelete={() => setRemoving(item)}
                              onEdit={() => setEditing(item)}
                           />
                        )}
                     </li>
                  );
               })}
            </ul>
         ) : (
            empty && <p className='text-ink-soft'>{empty}</p>
         )}
         {editable && adding && (
            <form className='mt-3 grid gap-2 sm:grid-cols-2' onSubmit={addLink}>
               <input
                  aria-invalid={!!error}
                  aria-label={t('Адрес ссылки')}
                  className='field-input'
                  data-autofocus
                  placeholder='https://'
                  value={link.url}
                  onChange={(event) => {
                     setLink((prev) => ({ ...prev, url: event.target.value }));
                     setError('');
                  }}
               />
               <input
                  aria-label={t('Название ссылки')}
                  className='field-input'
                  maxLength={120}
                  placeholder={t('Название, если нужно')}
                  value={link.title}
                  onChange={(event) =>
                     setLink((prev) => ({ ...prev, title: event.target.value }))
                  }
               />
               <div className='flex gap-2 sm:col-span-2'>
                  <Button loading={adder.pending} type='submit' variant='ghost'>
                     {t('Добавить ссылку')}
                  </Button>
                  <Button
                     disabled={adder.pending}
                     variant='text'
                     onClick={() => {
                        setAdding(false);
                        setError('');
                     }}
                  >
                     {t('Отмена')}
                  </Button>
               </div>
            </form>
         )}
         {error && (
            <p role='alert' className='text-danger mt-2 text-xs'>
               {error}
            </p>
         )}
         {editable && !adding && (
            <div className='mt-3 flex flex-wrap gap-x-4 gap-y-1'>
               <button
                  type='button'
                  className='link'
                  onClick={() => setAdding(true)}
               >
                  {t('Добавить ссылку')}
               </button>
               <button
                  type='button'
                  aria-busy={uploading > 0 || undefined}
                  className='link disabled:text-ink-soft inline-flex items-center gap-1.5 disabled:no-underline'
                  disabled={uploading > 0}
                  onClick={() => input.current?.click()}
               >
                  {uploading > 0 && <Spinner className='size-3.5' />}
                  {uploading
                     ? t('Загружается: {{count}}', { count: uploading })
                     : t('Загрузить файлы')}
               </button>
               <input
                  ref={input}
                  hidden
                  multiple
                  type='file'
                  onChange={(event) => {
                     upload([...(event.target.files ?? [])]);
                     event.target.value = '';
                  }}
               />
               {extra}
            </div>
         )}
         <Modal
            open={editing !== null}
            title={editing?.kind === 'file' ? t('Файл') : t('Ссылка')}
            onClose={() => setEditing(null)}
         >
            {editing && (
               <EditForm
                  key={editing.id}
                  item={editing}
                  onClose={() => setEditing(null)}
               />
            )}
         </Modal>
         <ConfirmDialog
            open={removing !== null}
            subtitle={removing?.title}
            title={
               removing?.kind === 'file'
                  ? t('Удалить файл?')
                  : t('Удалить ссылку?')
            }
            onClose={() => setRemoving(null)}
            onConfirm={() => removing && attachments.remove(removing.id)}
         >
            {removing?.kind === 'file' && (
               <p>
                  {t(
                     'Файл удалится из хранилища, его ссылка перестанет открываться.',
                  )}
               </p>
            )}
         </ConfirmDialog>
      </div>
   );
};

export default Attachments;

import {
   DOCUMENT_STATUS_LABELS,
   DOCUMENT_STATUS_TONES,
   TEXT_MAX,
} from '@modules/Deals/constants';
import { formatStamp, isOpen, personName } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import {
   Badge,
   Button,
   Card,
   ConfirmDialog,
   Field,
   ItemActions,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   NoData,
   Spinner,
} from '@shared/components';
import { useAction, useCurrentUser, useRequest } from '@shared/hooks';
import type { Deal, DealDocument, DealFolder } from '@shared/types/deals.types';
import { ChevronRight, FileText, Folder, Upload } from 'lucide-react';
import { type DragEvent, type FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DataRoomProps {
   deal: Deal;
   folderId: string; // the open folder, '' for the top of the data room
   onFolder: (folderId: string) => void;
   onRequest: (title: string) => void; // asks the applicant for a document
}

// The folders from the top down to this one.
const pathOf = (folders: DealFolder[], folderId: string) => {
   const path: DealFolder[] = [];
   for (
      let folder = folders.find(({ id }) => id === folderId);
      folder && !path.includes(folder);
      folder = folders.find(({ id }) => id === folder?.parentId)
   )
      path.unshift(folder);
   return path;
};

// Every folder in the order of the tree, with its depth, for a select;
// `without` leaves out a folder and what is inside it.
const treeOf = (
   folders: DealFolder[],
   without = '',
   parentId = '',
   depth = 0,
): { folder: DealFolder; depth: number }[] =>
   folders
      .filter((folder) => folder.parentId === parentId && folder.id !== without)
      .flatMap((folder) => [
         { folder, depth },
         ...treeOf(folders, without, folder.id, depth + 1),
      ]);

interface FolderSelectProps {
   folders: DealFolder[];
   value: string;
   without?: string;
   onChange: (folderId: string) => void;
}

const FolderSelect = ({
   folders,
   value,
   without,
   onChange,
}: FolderSelectProps) => {
   const { t } = useTranslation('deals');

   return (
      <select
         className='field-input'
         value={value}
         onChange={(event) => onChange(event.target.value)}
      >
         <option value=''>{t('Data room — верхний уровень')}</option>
         {treeOf(folders, without).map(({ folder, depth }) => (
            <option key={folder.id} value={folder.id}>
               {`${'— '.repeat(depth + 1)}${folder.name}`}
            </option>
         ))}
      </select>
   );
};

interface FolderFormProps {
   deal: Deal;
   folder: DealFolder | null; // null: a new folder
   parentId: string; // where a new folder goes
   onClose: () => void;
}

// A folder's name and the folder it sits in; Документы uses it too.
export const FolderForm = ({
   deal,
   folder,
   parentId,
   onClose,
}: FolderFormProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   const [name, setName] = useState(folder?.name ?? '');
   const [parent, setParent] = useState(folder?.parentId ?? parentId);
   const saving = useRequest(
      folder ? {} : { kind: 'create', success: t('Папка создана') },
   );

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const value = name.trim();
      if (!value) return;
      const done = await saving.run(() =>
         folder
            ? deals.updateFolder(deal.id, folder.id, {
                 name: value,
                 parentId: parent,
              })
            : deals.addFolder(deal.id, value, parent, user.id),
      );
      if (done) onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               <Field label={t('Название папки')}>
                  <input
                     data-autofocus
                     className='field-input'
                     maxLength={120}
                     placeholder={t('например, Финансы')}
                     value={name}
                     onChange={(event) => setName(event.target.value)}
                  />
               </Field>
               <Field label={t('Где лежит')}>
                  <FolderSelect
                     folders={deal.folders ?? []}
                     value={parent}
                     without={folder?.id}
                     onChange={setParent}
                  />
               </Field>
            </div>
         </ModalBody>
         <ModalFooter>
            <Button disabled={saving.pending} variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button
               disabled={!name.trim()}
               loading={saving.pending}
               type='submit'
            >
               {folder ? t('Сохранить') : t('Создать')}
            </Button>
         </ModalFooter>
      </form>
   );
};

interface DocumentFormProps {
   deal: Deal;
   document: DealDocument;
   onClose: () => void;
}

// A document's name in the data room and its folder; Документы uses it too.
export const DocumentForm = ({
   deal,
   document,
   onClose,
}: DocumentFormProps) => {
   const { t } = useTranslation('deals');
   const [title, setTitle] = useState(document.title);
   const [folderId, setFolderId] = useState(document.folderId);
   const saving = useRequest();

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!title.trim()) return;
      const done = await saving.run(() =>
         deals.updateDocument(deal.id, document.id, {
            title: title.trim(),
            folderId,
         }),
      );
      if (done) onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               <Field label={t('Название документа')}>
                  <input
                     data-autofocus
                     className='field-input'
                     maxLength={160}
                     value={title}
                     onChange={(event) => setTitle(event.target.value)}
                  />
               </Field>
               <Field label={t('Папка')}>
                  <FolderSelect
                     folders={deal.folders ?? []}
                     value={folderId}
                     onChange={setFolderId}
                  />
               </Field>
            </div>
         </ModalBody>
         <ModalFooter>
            <Button disabled={saving.pending} variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button
               disabled={!title.trim()}
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

/* The deal's data room: folders inside folders, and the documents in them —
   the applicant's (from the website, or their filled-in templates) and the
   fund's own. The open folder is in the breadcrumbs; the fund's uploads go
   into it. The applicant's files are checked here: accepted, or rejected
   with a reason. Deleting a folder moves what it holds one level up. */
const DataRoom = ({ deal, folderId, onFolder, onRequest }: DataRoomProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   const writable = isOpen(deal);
   const folders = deal.folders ?? [];
   const documents = deal.documents ?? [];
   const requests = deal.requests ?? [];
   // a document in a folder that is gone is shown at the top
   const known = new Set(folders.map(({ id }) => id));
   const placeOf = (document: DealDocument) =>
      known.has(document.folderId) ? document.folderId : '';
   const current = known.has(folderId) ? folderId : '';
   const path = pathOf(folders, current);
   const subfolders = folders.filter(({ parentId }) => parentId === current);
   const files = documents.filter((item) => placeOf(item) === current);
   const reviewCount = documents.filter(
      ({ status }) => status === 'review',
   ).length;

   // the document being checked, and the reason typed for rejecting it
   const [reviewId, setReviewId] = useState<string | null>(null);
   const [reason, setReason] = useState('');
   // what is being edited or asked to be deleted
   const [editingDocument, setEditingDocument] = useState<DealDocument | null>(
      null,
   );
   const [removingDocument, setRemovingDocument] =
      useState<DealDocument | null>(null);
   // null: closed; 'new': a new folder in the open one
   const [editingFolder, setEditingFolder] = useState<
      DealFolder | 'new' | null
   >(null);
   const [removingFolder, setRemovingFolder] = useState<DealFolder | null>(
      null,
   );

   const reviewing = useAction(
      (document: DealDocument, accepted: boolean) =>
         deals.reviewDocument(
            deal.id,
            document.id,
            accepted,
            reason.trim(),
            user.id,
         ),
      {
         success: (_, accepted) =>
            accepted ? t('Документ принят') : t('Документ отклонён'),
      },
   );
   // the answer being saved, for its spinner
   const [verdict, setVerdict] = useState<boolean | null>(null);

   const review = async (document: DealDocument, accepted: boolean) => {
      setVerdict(accepted);
      const done = await reviewing.run(document, accepted);
      setVerdict(null);
      if (!done) return;
      setReviewId(null);
      setReason('');
   };

   const folderName = (id: string) =>
      folders.find((folder) => folder.id === id)?.name ?? 'Data room';

   // the fund's files, into the open folder: by the button or dropped on the card
   const input = useRef<HTMLInputElement>(null);
   const [uploading, setUploading] = useState(0);
   const [dragging, setDragging] = useState(false);
   const uploader = useAction(
      async (files: File[], folderId: string) => {
         for (const file of files)
            await deals.uploadDocument(deal.id, file, user.id, folderId);
      },
      {
         kind: 'upload',
         success: (files, folderId) =>
            files.length > 1
               ? t('Файлы загружены в «{{folder}}»: {{count}}', {
                    folder: folderName(folderId),
                    count: files.length,
                 })
               : t('Файл загружен в «{{folder}}»', {
                    folder: folderName(folderId),
                 }),
      },
   );
   const upload = async (files: File[]) => {
      if (!files.length || uploader.pending) return;
      setUploading(files.length);
      await uploader.run(files, current);
      setUploading(0);
   };
   const withFiles = (event: DragEvent) =>
      writable && event.dataTransfer.types.includes('Files');
   const choose = () => input.current?.click();

   // what a folder holds, directly
   const contentsOf = (id: string) => {
      const inner = folders.filter(({ parentId }) => parentId === id).length;
      const held = documents.filter((item) => placeOf(item) === id).length;
      return [
         held > 0 && t('{{count}} документ', { count: held }),
         inner > 0 && t('{{count}} папка', { count: inner }),
      ]
         .filter(Boolean)
         .join(' · ');
   };

   // its version, the request it answers, and who handled it and when
   const documentLine = (document: DealDocument) => {
      const { version, handled, requestId } = document;
      const request = requests.find(({ id }) => id === requestId);
      const parts = [
         version > 0 && `v${version}`,
         request && t('ответ на запрос «{{title}}»', { title: request.title }),
      ];
      if (handled) {
         const name = personName(handled.byId);
         const at = formatStamp(handled.at);
         parts.push(
            handled.kind === 'rejected'
               ? t('отклонил {{name}}: {{reason}}', {
                    name,
                    reason: handled.reason,
                 })
               : `${
                    handled.kind === 'uploaded'
                       ? t('загружен от имени фонда · {{name}}', { name })
                       : t('принял {{name}}', { name })
                 } · ${at}`,
         );
      } else if (document.uploadedBy === 'applicant')
         parts.push(
            document.uploadedById
               ? t('файл заявителя, загрузил {{name}} · {{date}}', {
                    name: personName(document.uploadedById),
                    date: formatStamp(document.uploadedAt),
                 })
               : t('загружен заявителем · {{date}}', {
                    date: formatStamp(document.uploadedAt),
                 }),
         );
      else if (document.detail) parts.push(document.detail);
      return parts.filter(Boolean).join(' · ');
   };

   const documentAction = (document: DealDocument) => {
      const open = document.url && (
         <a
            className='link'
            href={document.url}
            rel='noreferrer'
            target='_blank'
         >
            {t('Открыть')}
         </a>
      );
      const main =
         document.status === 'review'
            ? writable && (
                 <button
                    type='button'
                    className='link'
                    onClick={() => setReviewId(document.id)}
                 >
                    {t('Проверить')}
                 </button>
              )
            : document.status !== 'accepted' &&
              writable && (
                 <button
                    type='button'
                    className='link'
                    onClick={() => onRequest(document.title)}
                 >
                    {document.status === 'rejected'
                       ? t('Запросить заново')
                       : t('Запросить')}
                 </button>
              );
      return (
         <span className='flex flex-wrap items-center justify-end gap-x-4 gap-y-1'>
            {open}
            {main}
            {writable && (
               <ItemActions
                  name={document.title}
                  onDelete={() => setRemovingDocument(document)}
                  onEdit={() => setEditingDocument(document)}
               />
            )}
         </span>
      );
   };

   return (
      // files dropped anywhere on the card go into the open folder
      <div
         className='relative flex flex-col'
         onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node))
               setDragging(false);
         }}
         onDragOver={(event) => {
            if (!withFiles(event)) return;
            event.preventDefault();
            setDragging(true);
         }}
         onDrop={(event) => {
            if (!withFiles(event)) return;
            event.preventDefault();
            setDragging(false);
            upload([...event.dataTransfer.files]);
         }}
      >
         {dragging && (
            <div className='border-accent bg-accent-tint/90 text-accent pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-lg border-2 border-dashed p-6 text-center font-semibold'>
               {t('Отпустите — файлы загрузятся в «{{folder}}»', {
                  folder: folderName(current),
               })}
            </div>
         )}
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
         <Card
            className='flex-1'
            hint={`${t('{{count}} документ', { count: documents.length })} · ${t(
               '{{total}} на проверке',
               { total: reviewCount },
            )}`}
            title='Data room'
         >
            <div className='border-line flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-5 py-3'>
               <nav aria-label={t('Папки data room')}>
                  <ol className='text-meta flex flex-wrap items-center gap-1'>
                     {[{ id: '', name: 'Data room' }, ...path].map(
                        (item, index, all) => {
                           const last = index === all.length - 1;
                           return (
                              <li
                                 key={item.id}
                                 className='flex items-center gap-1'
                              >
                                 {index > 0 && (
                                    <ChevronRight
                                       aria-hidden
                                       className='text-ink-faint size-3.5'
                                    />
                                 )}
                                 {last ? (
                                    <span
                                       aria-current='page'
                                       className='font-semibold'
                                    >
                                       {item.name}
                                    </span>
                                 ) : (
                                    <button
                                       type='button'
                                       className='link'
                                       onClick={() => onFolder(item.id)}
                                    >
                                       {item.name}
                                    </button>
                                 )}
                              </li>
                           );
                        },
                     )}
                  </ol>
               </nav>
               {writable && (
                  <span className='text-meta flex flex-wrap items-center gap-x-4 gap-y-1'>
                     <button
                        type='button'
                        aria-busy={uploading > 0 || undefined}
                        className='link disabled:text-ink-soft inline-flex items-center gap-1.5 disabled:no-underline'
                        disabled={uploading > 0}
                        onClick={choose}
                     >
                        {uploading > 0 ? (
                           <Spinner className='size-3.5' />
                        ) : (
                           <Upload aria-hidden className='size-3.5' />
                        )}
                        {uploading > 0
                           ? t('Загружается: {{count}}', { count: uploading })
                           : t('Загрузить файлы')}
                     </button>
                     <button
                        type='button'
                        className='link'
                        onClick={() => setEditingFolder('new')}
                     >
                        {t('Новая папка')}
                     </button>
                  </span>
               )}
            </div>

            {subfolders.length || files.length ? (
               <div className='p-5'>
                  <ul className='flex flex-col gap-2.5'>
                     {subfolders.map((folder) => (
                        <li
                           key={folder.id}
                           className='border-line hover:bg-ground/60 relative flex items-center gap-3.5 rounded-lg border px-4 py-3'
                        >
                           <span className='bg-accent-tint text-accent grid size-9 shrink-0 place-items-center rounded-md'>
                              <Folder aria-hidden className='size-4' />
                           </span>
                           <div className='min-w-0 flex-1'>
                              {/* the whole row opens the folder */}
                              <button
                                 type='button'
                                 className='text-left font-semibold after:absolute after:inset-0'
                                 onClick={() => onFolder(folder.id)}
                              >
                                 {folder.name}
                              </button>
                              <div className='text-ink-soft mt-0.5 text-xs'>
                                 {contentsOf(folder.id) || t('пустая папка')}
                              </div>
                           </div>
                           {writable && (
                              <ItemActions
                                 className='relative text-xs'
                                 name={folder.name}
                                 onDelete={() => setRemovingFolder(folder)}
                                 onEdit={() => setEditingFolder(folder)}
                              />
                           )}
                        </li>
                     ))}
                     {files.map((document) => (
                        <li
                           key={document.id}
                           className='border-line rounded-lg border px-4 py-3'
                        >
                           <div className='flex items-center gap-3.5'>
                              <span className='bg-ground text-ink-faint grid size-9 shrink-0 place-items-center rounded-md'>
                                 <FileText aria-hidden className='size-4' />
                              </span>
                              <div className='min-w-0 flex-1'>
                                 <div className='flex flex-wrap items-center gap-x-2.5 gap-y-1'>
                                    <span className='font-semibold break-words'>
                                       {document.title}
                                    </span>
                                    <Badge
                                       caps
                                       tone={
                                          DOCUMENT_STATUS_TONES[document.status]
                                       }
                                    >
                                       {t(
                                          DOCUMENT_STATUS_LABELS[
                                             document.status
                                          ],
                                       )}
                                    </Badge>
                                 </div>
                                 <div className='text-ink-soft mt-0.5 text-xs'>
                                    {documentLine(document)}
                                 </div>
                              </div>
                              {reviewId !== document.id &&
                                 documentAction(document)}
                           </div>
                           {reviewId === document.id && (
                              <div className='border-line mt-3 border-t pt-3'>
                                 <textarea
                                    aria-label={t('Причина отклонения')}
                                    className='field-input text-meta'
                                    maxLength={TEXT_MAX}
                                    placeholder={t(
                                       'Причина — нужна, только если документ отклоняется',
                                    )}
                                    rows={2}
                                    value={reason}
                                    onChange={(event) =>
                                       setReason(event.target.value)
                                    }
                                 />
                                 <div className='mt-2.5 flex flex-wrap items-center gap-2.5'>
                                    {document.url && (
                                       <a
                                          className='link text-meta mr-auto'
                                          href={document.url}
                                          rel='noreferrer'
                                          target='_blank'
                                       >
                                          {t('Открыть файл')}
                                       </a>
                                    )}
                                    <Button
                                       className='h-9'
                                       disabled={reviewing.pending}
                                       loading={verdict === true}
                                       onClick={() => review(document, true)}
                                    >
                                       {t('Принять')}
                                    </Button>
                                    <Button
                                       className='h-9'
                                       // a rejection always says why
                                       disabled={
                                          !reason.trim() || reviewing.pending
                                       }
                                       loading={verdict === false}
                                       variant='ghost'
                                       onClick={() => review(document, false)}
                                    >
                                       {t('Отклонить')}
                                    </Button>
                                    <Button
                                       className='h-9'
                                       disabled={reviewing.pending}
                                       variant='text'
                                       onClick={() => setReviewId(null)}
                                    >
                                       {t('Отмена')}
                                    </Button>
                                 </div>
                              </div>
                           )}
                        </li>
                     ))}
                  </ul>
                  <p className='text-ink-soft mt-3.5 text-xs'>
                     {t(
                        'Каждая версия хранится с автором и временем. «Загрузить файлы» кладёт файлы в открытую папку, их можно и перетащить на карточку; документ переносят в другую папку кнопкой «Изменить». Отклонение без причины недоступно — иначе заявитель вернётся в почту.',
                     )}
                  </p>
               </div>
            ) : writable ? (
               // an empty folder: where to drop files, or the button
               <div className='p-5'>
                  <div className='border-line-strong text-ink-soft grid place-items-center gap-3 rounded-lg border border-dashed px-4 py-10 text-center'>
                     <p>
                        {current
                           ? t('В этой папке пока пусто')
                           : t('Документов в data room пока нет')}
                        <br />
                        {t(
                           'Перетащите файлы сюда или выберите их на компьютере.',
                        )}
                     </p>
                     <Button
                        className='h-9'
                        loading={uploading > 0}
                        variant='ghost'
                        onClick={choose}
                     >
                        {uploading > 0
                           ? t('Загружается: {{count}}', { count: uploading })
                           : t('Загрузить файлы')}
                     </Button>
                  </div>
               </div>
            ) : (
               <NoData>
                  {current
                     ? t('В этой папке пока пусто')
                     : t('Документов в data room пока нет')}
               </NoData>
            )}

            <Modal
               open={editingFolder !== null}
               subtitle={deal.company}
               title={editingFolder === 'new' ? t('Новая папка') : t('Папка')}
               onClose={() => setEditingFolder(null)}
            >
               {editingFolder && (
                  <FolderForm
                     key={editingFolder === 'new' ? 'new' : editingFolder.id}
                     deal={deal}
                     folder={editingFolder === 'new' ? null : editingFolder}
                     parentId={current}
                     onClose={() => setEditingFolder(null)}
                  />
               )}
            </Modal>
            <ConfirmDialog
               open={removingFolder !== null}
               subtitle={removingFolder?.name}
               success={t('Папка удалена')}
               title={t('Удалить папку?')}
               onClose={() => setRemovingFolder(null)}
               onConfirm={async () => {
                  if (!removingFolder) return;
                  await deals.removeFolder(deal.id, removingFolder.id);
                  // the open folder, or one inside it, is gone: go up
                  if (
                     removingFolder.id === current ||
                     path.some(({ id }) => id === removingFolder.id)
                  )
                     onFolder(removingFolder.parentId);
               }}
            >
               <p>
                  {t(
                     'Файлы и папки из неё не удалятся — они перейдут в «{{parent}}».',
                     { parent: folderName(removingFolder?.parentId ?? '') },
                  )}
               </p>
            </ConfirmDialog>
            <Modal
               open={editingDocument !== null}
               subtitle={deal.company}
               title={t('Документ')}
               onClose={() => setEditingDocument(null)}
            >
               {editingDocument && (
                  <DocumentForm
                     key={editingDocument.id}
                     deal={deal}
                     document={editingDocument}
                     onClose={() => setEditingDocument(null)}
                  />
               )}
            </Modal>
            <ConfirmDialog
               open={removingDocument !== null}
               subtitle={
                  removingDocument &&
                  `${removingDocument.title}${removingDocument.version ? ` · v${removingDocument.version}` : ''}`
               }
               success={t('Документ удалён')}
               title={t('Удалить документ?')}
               onClose={() => setRemovingDocument(null)}
               onConfirm={() =>
                  removingDocument &&
                  deals.removeDocument(deal.id, removingDocument.id)
               }
            >
               <p>
                  {removingDocument?.fileId
                     ? t(
                          'Файл удалится из data room и из хранилища; другие версии документа останутся.',
                       )
                     : t(
                          'Документ уйдёт из data room; другие версии останутся.',
                       )}
               </p>
            </ConfirmDialog>
         </Card>
      </div>
   );
};

export default DataRoom;

import {
   DOCUMENT_STATUS_LABELS,
   DOCUMENT_STATUS_TONES,
   TEXT_MAX,
} from '@modules/Deals/constants';
import {
   formatStamp,
   isOpen,
   isSharedFolder,
   personName,
   placeOf,
   roomFolders,
} from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { hasRoomFields } from '@modules/Deals/services/ucode';
import {
   ActionMenu,
   Badge,
   Button,
   Card,
   ConfirmDialog,
   Field,
   ItemActions,
   type MenuAction,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   NoData,
   Table,
   TD,
   TH,
} from '@shared/components';
import { formatNumber } from '@shared/helpers';
import { useAction, useCurrentUser, useRequest } from '@shared/hooks';
import type { Deal, DealDocument, DealFolder } from '@shared/types/deals.types';
import clsx from 'clsx';
import {
   ClipboardCheck,
   Eye,
   FileText,
   Pencil,
   Send,
   Trash2,
   Upload,
} from 'lucide-react';
import { type DragEvent, type FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DataRoomProps {
   deal: Deal;
   folderId: string; // the open folder; '' opens the first
   onFolder: (folderId: string) => void;
   // asks the applicant for a document; not given — not asked from here
   onRequest?: (title: string) => void;
   // whether it is changed here: by default while the deal is open; a
   // portfolio company's card keeps its data room after the deal is closed
   writable?: boolean;
}

// «Без папки» opened: the files of no folder, listed only while there are any.
export const NO_FOLDER = 'none';

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
   top: string; // what '' stands for
   value: string;
   without?: string;
   onChange: (folderId: string) => void;
}

const FolderSelect = ({
   folders,
   top,
   value,
   without,
   onChange,
}: FolderSelectProps) => {
   return (
      <select
         className='field-input'
         value={value}
         onChange={(event) => onChange(event.target.value)}
      >
         <option value=''>{top}</option>
         {treeOf(folders, without).map(({ folder, depth }) => (
            <option key={folder.id} value={folder.id}>
               {`${'— '.repeat(depth)}${folder.name}`}
            </option>
         ))}
      </select>
   );
};

interface FolderFormProps {
   deal: Deal;
   folder: DealFolder;
   onClose: () => void;
}

// The name of a deal's own older folder and the folder it sits in; new
// folders are made in Настройки. Документы uses it too.
export const FolderForm = ({ deal, folder, onClose }: FolderFormProps) => {
   const { t } = useTranslation('deals');
   const [name, setName] = useState(folder.name);
   const [parent, setParent] = useState(folder.parentId);
   const saving = useRequest();

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const value = name.trim();
      if (!value) return;
      const done = await saving.run(() =>
         deals.updateFolder(deal.id, folder.id, {
            name: value,
            parentId: parent,
         }),
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
                     top={t('Data room — верхний уровень')}
                     value={parent}
                     without={folder.id}
                     onChange={setParent}
                  />
               </Field>
            </div>
         </ModalBody>
         <ModalFooter>
            <Button
               disabled={saving.pending}
               hint={t('Закрыть окно, ничего не меняя')}
               variant='text'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               disabled={!name.trim()}
               hint={t('Сохранить папку')}
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
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
   const [folderId, setFolderId] = useState(placeOf(deal, document));
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
                     folders={roomFolders(deal)}
                     top={t('Без папки')}
                     value={folderId}
                     onChange={setFolderId}
                  />
               </Field>
            </div>
         </ModalBody>
         <ModalFooter>
            <Button
               disabled={saving.pending}
               hint={t('Закрыть окно, ничего не меняя')}
               variant='text'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               disabled={!title.trim()}
               hint={t('Сохранить название и папку документа')}
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

interface FolderButtonProps {
   hint: string;
   name: string;
   count: number; // the documents directly in it
   depth: number; // how far inside other folders
   active: boolean;
   onClick: () => void;
}

// A folder on the left, as the design's list of the data room's folders:
// its name and how many files it has.
const FolderButton = ({
   name,
   count,
   depth,
   active,
   hint,
   onClick,
}: FolderButtonProps) => (
   <button
      type='button'
      aria-current={active || undefined}
      className={clsx(
         'text-meta flex w-full items-center gap-2 rounded-md py-2 pr-3 text-left',
         active
            ? 'bg-accent-tint text-ink-strong font-semibold'
            : 'text-ink hover:bg-hover',
      )}
      data-hint={hint}
      style={{ paddingLeft: `${0.75 + depth * 0.875}rem` }}
      onClick={onClick}
   >
      <span className='min-w-0 flex-1'>{name}</span>
      <span className='text-ink-faint text-xs tabular-nums'>{count}</span>
   </button>
);

/* The deal's data room, as the design draws it: the folders of Настройки on
   the left (a deal's own older folders under them, and «Без папки» while
   files lie outside any) and the open folder's documents on the right, the
   applicant's (from the website, or their filled-in templates) and the
   fund's own, each with its size, status, when and by whom it came. The
   fund's uploads go into the open folder, by «Загрузить» or dropped on the
   list. The applicant's files are checked here: accepted, or rejected with
   a reason. Deleting an older folder moves what it holds one level up. */
const DataRoom = ({
   deal,
   folderId,
   onFolder,
   onRequest,
   writable = isOpen(deal),
}: DataRoomProps) => {
   const { t, i18n } = useTranslation('deals');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const user = useCurrentUser();
   const folders = roomFolders(deal);
   const documents = deal.documents ?? [];
   const requests = deal.requests ?? [];
   const known = new Set(folders.map(({ id }) => id));
   const current =
      folderId !== NO_FOLDER && known.has(folderId)
         ? folderId
         : folderId === NO_FOLDER
           ? ''
           : (folders[0]?.id ?? '');
   const path = pathOf(folders, current);
   // only a deal's own folder is changed here; the others, in Настройки
   const open = isSharedFolder(current)
      ? undefined
      : folders.find(({ id }) => id === current);
   // a folder inside another shows the way to it
   const way =
      path.length > 1 ? path.map(({ name }) => name).join(' › ') : undefined;
   const files = documents.filter((item) => placeOf(deal, item) === current);
   const countIn = (id: string) =>
      documents.filter((item) => placeOf(deal, item) === id).length;
   const reviewCount = documents.filter(
      ({ status }) => status === 'review',
   ).length;

   // the document being checked, and the reason typed for rejecting it
   const [reviewing, setReviewing] = useState<DealDocument | null>(null);
   const [reason, setReason] = useState('');
   // what is being edited or asked to be deleted
   const [editingDocument, setEditingDocument] = useState<DealDocument | null>(
      null,
   );
   const [removingDocument, setRemovingDocument] =
      useState<DealDocument | null>(null);
   const [editingFolder, setEditingFolder] = useState<DealFolder | null>(null);
   const [removingFolder, setRemovingFolder] = useState<DealFolder | null>(
      null,
   );

   const checking = useAction(
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
      const done = await checking.run(document, accepted);
      setVerdict(null);
      if (!done) return;
      setReviewing(null);
      setReason('');
   };

   const folderName = (id: string) =>
      folders.find((folder) => folder.id === id)?.name ?? t('Без папки');

   // the fund's files, into the open folder: by the button or dropped on it
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

   const sizeOf = ({ size }: DealDocument) =>
      !size
         ? '—'
         : size < 1024 ** 2
           ? t('{{value}} КБ', {
                value: formatNumber(Math.max(1, size / 1024), language),
             })
           : t('{{value}} МБ', {
                value: formatNumber(size / 1024 ** 2, language, 1),
             });

   // whose file it is: the applicant's, or the employee who brought it in
   const ownerOf = (document: DealDocument) =>
      document.uploadedBy === 'applicant' && !document.uploadedById
         ? deal.applicantName || t('Заявитель')
         : personName(document.uploadedById || document.handled?.byId || '') ||
           '—';

   // its version, the request it answers, and how it was handled
   const documentLine = (document: DealDocument) => {
      const { version, handled, requestId } = document;
      const request = requests.find(({ id }) => id === requestId);
      const parts = [
         version > 0 && `v${version}`,
         request && t('ответ на запрос «{{title}}»', { title: request.title }),
      ];
      if (handled)
         parts.push(
            handled.kind === 'rejected'
               ? t('отклонил {{name}}: {{reason}}', {
                    name: personName(handled.byId),
                    reason: handled.reason,
                 })
               : handled.kind === 'uploaded'
                 ? t('загружен от имени фонда')
                 : t('принял {{name}} · {{date}}', {
                      name: personName(handled.byId),
                      date: formatStamp(handled.at),
                   }),
         );
      else if (document.uploadedBy === 'applicant' && document.uploadedById)
         parts.push(t('файл заявителя'));
      else if (document.uploadedBy !== 'applicant' && document.detail)
         parts.push(document.detail);
      return parts.filter(Boolean).join(' · ');
   };

   const actionsOf = (document: DealDocument): MenuAction[] => [
      ...(document.url
         ? [
              {
                 label: t('Открыть'),
                 icon: Eye,
                 onSelect: () =>
                    window.open(document.url, '_blank', 'noopener'),
              },
           ]
         : []),
      ...(writable && document.status === 'review'
         ? [
              {
                 label: t('Проверить'),
                 icon: ClipboardCheck,
                 onSelect: () => setReviewing(document),
              },
           ]
         : []),
      ...(writable &&
      onRequest &&
      (document.status === 'rejected' || document.status === 'required')
         ? [
              {
                 label:
                    document.status === 'rejected'
                       ? t('Запросить заново')
                       : t('Запросить'),
                 icon: Send,
                 onSelect: () => onRequest(document.title),
              },
           ]
         : []),
      ...(writable
         ? [
              {
                 label: t('Изменить'),
                 icon: Pencil,
                 onSelect: () => setEditingDocument(document),
              },
              {
                 label: t('Удалить'),
                 icon: Trash2,
                 danger: true,
                 onSelect: () => setRemovingDocument(document),
              },
           ]
         : []),
   ];

   return (
      <div className='gap-section grid items-start lg:grid-cols-[14.375rem_minmax(0,1fr)]'>
         <Card className='p-2'>
            <nav aria-label={t('Папки data room')}>
               <ul className='grid gap-0.5'>
                  {treeOf(folders).map(({ folder, depth }) => (
                     <li key={folder.id}>
                        <FolderButton
                           active={folder.id === current}
                           count={countIn(folder.id)}
                           depth={depth}
                           hint={t('Показать документы этой папки')}
                           name={folder.name}
                           onClick={() => onFolder(folder.id)}
                        />
                     </li>
                  ))}
                  {(countIn('') > 0 || !folders.length) && (
                     <li>
                        <FolderButton
                           active={current === ''}
                           count={countIn('')}
                           depth={0}
                           hint={t('Показать документы этой папки')}
                           name={t('Без папки')}
                           onClick={() => onFolder(NO_FOLDER)}
                        />
                     </li>
                  )}
               </ul>
            </nav>
         </Card>

         {/* files dropped anywhere on the list go into the open folder */}
         <div
            className='relative min-w-0'
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
               action={
                  writable && (
                     <span className='flex items-center gap-1.5'>
                        {open && (
                           <ItemActions
                              icons
                              name={open.name}
                              onDelete={() => setRemovingFolder(open)}
                              onEdit={() => setEditingFolder(open)}
                           />
                        )}
                        <Button
                           className='h-8 px-3 text-xs'
                           hint={t('Выбрать файлы и загрузить их в эту папку')}
                           loading={uploading > 0}
                           onClick={choose}
                        >
                           {uploading > 0 ? (
                              t('Загружается: {{count}}', { count: uploading })
                           ) : (
                              <>
                                 <Upload aria-hidden />
                                 {t('Загрузить')}
                              </>
                           )}
                        </Button>
                     </span>
                  )
               }
               hint={way}
               title={`${folderName(current)} · ${deal.company}`}
            >
               {files.length ? (
                  <Table
                     className='min-w-2xl'
                     head={
                        <>
                           <th className={TH}>{t('Документ')}</th>
                           <th className={clsx(TH, 'text-right')}>
                              {t('Размер')}
                           </th>
                           <th className={TH}>{t('Статус')}</th>
                           <th className={TH}>{t('Загружен')}</th>
                           <th className={TH}>{t('Кем')}</th>
                           <th className={TH}>
                              <span className='sr-only'>{t('Действия')}</span>
                           </th>
                        </>
                     }
                  >
                     {files.map((document) => {
                        const line = documentLine(document);
                        return (
                           <tr
                              key={document.id}
                              className={clsx(
                                 document.url &&
                                    'hover:bg-hover cursor-pointer',
                              )}
                              onClick={() =>
                                 document.url &&
                                 window.open(document.url, '_blank', 'noopener')
                              }
                           >
                              <td className={TD}>
                                 <div className='flex items-center gap-2.5'>
                                    <span className='bg-accent-tint text-accent grid size-8.5 shrink-0 place-items-center rounded-lg'>
                                       <FileText
                                          aria-hidden
                                          className='size-4'
                                       />
                                    </span>
                                    <div className='min-w-0'>
                                       <div className='font-medium break-words'>
                                          {document.title}
                                       </div>
                                       {line && (
                                          <div className='text-ink-soft text-xs'>
                                             {line}
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              </td>
                              <td
                                 className={clsx(
                                    TD,
                                    'text-ink-soft text-right whitespace-nowrap tabular-nums',
                                 )}
                              >
                                 {sizeOf(document)}
                              </td>
                              <td className={clsx(TD, 'whitespace-nowrap')}>
                                 <Badge
                                    tone={
                                       DOCUMENT_STATUS_TONES[document.status]
                                    }
                                 >
                                    {t(DOCUMENT_STATUS_LABELS[document.status])}
                                 </Badge>
                              </td>
                              <td
                                 className={clsx(
                                    TD,
                                    'text-ink-soft whitespace-nowrap',
                                 )}
                              >
                                 {document.uploadedAt
                                    ? formatStamp(document.uploadedAt)
                                    : '—'}
                              </td>
                              <td className={clsx(TD, 'whitespace-nowrap')}>
                                 {ownerOf(document)}
                              </td>
                              <td className={clsx(TD, 'w-0 text-right')}>
                                 <ActionMenu
                                    actions={actionsOf(document)}
                                    name={document.title}
                                 />
                              </td>
                           </tr>
                        );
                     })}
                  </Table>
               ) : writable ? (
                  // an empty folder: where to drop files, or the button
                  <div className='p-5'>
                     <div className='border-line-strong text-ink-soft grid place-items-center gap-3 rounded-lg border border-dashed px-4 py-10 text-center'>
                        <p>
                           {t(
                              'В этой папке пока нет документов. Основатель загружает их в своём кабинете, или загрузите сами.',
                           )}
                        </p>
                        <Button
                           className='h-9'
                           hint={t('Выбрать файлы и загрузить их в эту папку')}
                           loading={uploading > 0}
                           variant='ghost'
                           onClick={choose}
                        >
                           {uploading > 0
                              ? t('Загружается: {{count}}', {
                                   count: uploading,
                                })
                              : t('Загрузить файлы')}
                        </Button>
                     </div>
                  </div>
               ) : (
                  <NoData>{t('В этой папке пока нет документов.')}</NoData>
               )}
               <footer className='border-line text-ink-soft flex flex-wrap justify-between gap-x-4 gap-y-1 border-t px-4.5 py-2.5 text-xs'>
                  <span>
                     {t(
                        'Дата рум общий с кабинетом основателя: заявитель видит свои файлы, файлы фонда — только команда.',
                     )}
                  </span>
                  <span>
                     {t('{{total}} на проверке', { total: reviewCount })}
                  </span>
                  {!hasRoomFields() && (
                     <span className='basis-full'>
                        {t(
                           'Папка файла и его размер сохранятся, когда в ucode будет партия 16.',
                        )}
                     </span>
                  )}
               </footer>
            </Card>
         </div>

         <Modal
            open={reviewing !== null}
            subtitle={reviewing?.title}
            title={t('Проверка документа')}
            onClose={() => setReviewing(null)}
         >
            {reviewing && (
               <>
                  <ModalBody>
                     <div className='grid gap-4'>
                        {reviewing.url && (
                           <a
                              className='link text-meta'
                              data-hint={t('Открыть файл в новой вкладке')}
                              href={reviewing.url}
                              rel='noreferrer'
                              target='_blank'
                           >
                              {t('Открыть файл')}
                           </a>
                        )}
                        <Field label={t('Причина отклонения')}>
                           <textarea
                              data-autofocus
                              className='field-input text-meta'
                              maxLength={TEXT_MAX}
                              placeholder={t(
                                 'Причина — нужна, только если документ отклоняется',
                              )}
                              rows={3}
                              value={reason}
                              onChange={(event) =>
                                 setReason(event.target.value)
                              }
                           />
                        </Field>
                     </div>
                  </ModalBody>
                  <ModalFooter
                     note={t(
                        'Отклонение без причины недоступно — иначе заявитель вернётся в почту.',
                     )}
                  >
                     <Button
                        disabled={checking.pending}
                        hint={t('Закрыть окно, ничего не меняя')}
                        variant='text'
                        onClick={() => setReviewing(null)}
                     >
                        {t('Отмена')}
                     </Button>
                     <Button
                        // a rejection always says why
                        disabled={!reason.trim() || checking.pending}
                        hint={
                           reason.trim()
                              ? t(
                                   'Отклонить документ: основатель увидит причину',
                                )
                              : t('Чтобы отклонить, напишите причину')
                        }
                        loading={verdict === false}
                        variant='ghost'
                        onClick={() => review(reviewing, false)}
                     >
                        {t('Отклонить')}
                     </Button>
                     <Button
                        disabled={checking.pending}
                        hint={t('Принять документ: проверка закончена')}
                        loading={verdict === true}
                        onClick={() => review(reviewing, true)}
                     >
                        {t('Принять')}
                     </Button>
                  </ModalFooter>
               </>
            )}
         </Modal>
         <Modal
            open={editingFolder !== null}
            subtitle={deal.company}
            title={t('Папка')}
            onClose={() => setEditingFolder(null)}
         >
            {editingFolder && (
               <FolderForm
                  key={editingFolder.id}
                  deal={deal}
                  folder={editingFolder}
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
               // the open folder, or one it is inside, is gone: go up
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
                  : t('Документ уйдёт из data room; другие версии останутся.')}
            </p>
         </ConfirmDialog>
      </div>
   );
};

export default DataRoom;

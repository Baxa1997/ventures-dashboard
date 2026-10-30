import { COMMITTEE_PATH } from '@modules/Committee/constants';
import { DEALS_PATH } from '@modules/Deals/constants';
import { isOpen } from '@modules/Deals/helpers';
import {
   DocumentForm,
   FolderForm,
} from '@modules/Deals/pages/Deal/components/DataRoom';
import deals from '@modules/Deals/services';
import DocumentDialog, {
   type DocumentDialogMode,
} from '@modules/Documents/components/DocumentDialog';
import {
   CATEGORIES,
   RECORDING,
   type SortKey,
} from '@modules/Documents/constants';
import {
   type FileNode,
   type FilePath,
   sortNodes,
} from '@modules/Documents/helpers';
import { type FilesData, useFileTree } from '@modules/Documents/hooks';
import documents from '@modules/Documents/services';
import {
   Button,
   Card,
   ConfirmDialog,
   type MenuAction,
   Modal,
   NoData,
   SearchField,
   Segmented,
} from '@shared/components';
import { toast } from '@shared/helpers/toast';
import { useAction, useCurrentUser } from '@shared/hooks';
import attachments from '@shared/services/attachments';
import type { Meeting } from '@shared/types/committee.types';
import type { Deal, DealDocument, DealFolder } from '@shared/types/deals.types';
import type { DocCategory } from '@shared/types/documents.types';
import {
   Eye,
   FolderOpen,
   FolderPlus,
   Gavel,
   Handshake,
   LayoutGrid,
   Link as LinkIcon,
   List,
   Pencil,
   Plus,
   Trash2,
   Upload,
} from 'lucide-react';
import { type DragEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import FileCrumbs from './FileCrumbs';
import FileGrid from './FileGrid';
import FileList from './FileList';

export type FileView = 'list' | 'grid';

interface FileManagerProps {
   data: FilesData;
   path: FilePath; // as the address has it; one that is gone opens the top
   view: FileView;
   marked: string; // a fund document's id to show marked, '' for none
   onGo: (path: FilePath) => void;
   onView: (view: FileView) => void;
   onSaved: (id: string, category: DocCategory) => void; // a fund document
}

// a data room's folder (null: a new one in parentId) or document being edited
type Editing =
   | {
        kind: 'folder';
        deal: Deal;
        folder: DealFolder | null;
        parentId: string;
     }
   | { kind: 'document'; deal: Deal; document: DealDocument };

// the deal's «Запросы и документы», its data room open at the folder
const dealPage = (deal: Deal, folderId = '') => {
   const folder = folderId ? `&folder=${folderId}` : '';
   return `${DEALS_PATH}/${deal.id}?tab=requests${folder}`;
};
const meetingPage = (meeting: Meeting) =>
   `${COMMITTEE_PATH}/${meeting.id}?tab=voting`;
const openUrl = (url: string) => window.open(url, '_blank', 'noopener');

/* «Файлы и документы», as the design draws them: one manager over the
   fund's documents, the deals' data rooms and the committee's materials.
   The path, the search (in the open folder and below it, or everywhere),
   the list or tiles, the new folder and the upload are on one line. Files
   go where the panel keeps them: into the open folder of a data room of a
   deal in work, or onto a question of a meeting; the fund's own documents
   are links, added with «Добавить документ» or «Новый приказ». */
const FileManager = ({
   data,
   path: asked,
   view,
   marked,
   onGo,
   onView,
   onSaved,
}: FileManagerProps) => {
   const { t } = useTranslation('documents');
   const { t: td } = useTranslation('deals');
   const navigate = useNavigate();
   const user = useCurrentUser();
   const tree = useFileTree(data);
   const found = tree.crumbs(asked);
   const path = found ? asked : [];
   const crumbs = found ?? [];
   const [area, first = '', second = ''] = path;
   const [query, setQuery] = useState('');
   const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
      key: 'name',
      dir: 1,
   });
   const [documentMode, setDocumentMode] = useState<DocumentDialogMode | null>(
      null,
   );
   const [editing, setEditing] = useState<Editing | null>(null);
   const [removing, setRemoving] = useState<FileNode | null>(null);
   const input = useRef<HTMLInputElement>(null);
   const [dragging, setDragging] = useState(false);

   const go = (next: FilePath) => {
      setQuery('');
      onGo(next);
   };

   // where files may go: the data room of a deal in work, or a question
   const deal =
      area === 'deals' ? data.deals.find(({ id }) => id === first) : undefined;
   const meeting =
      area === 'ic'
         ? data.committee.meetings.find(({ id }) => id === first)
         : undefined;
   const item = meeting?.agenda.find(({ id }) => id === second);
   const writable = deal !== undefined && isOpen(deal);
   const canUpload = writable || item !== undefined;
   const category =
      area === 'fund' ? CATEGORIES.find((id) => id === first) : undefined;

   const text = query.trim().toLowerCase();
   const matches = (node: FileNode) => node.name.toLowerCase().includes(text);
   const here = tree.children(path);
   const nodes = text
      ? [
           ...here.filter((node) => node.folder && matches(node)),
           ...tree.filesUnder(path).filter(matches),
        ]
      : here;
   // the modules keep their order
   const ownOrder = !path.length && !text;
   const shown = ownOrder ? nodes : sortNodes(nodes, sort.key, sort.dir);

   const whereOf = (where: FilePath) =>
      [
         t('Все модули'),
         ...(tree.crumbs(where) ?? []).map(({ label }) => label),
      ].join(' › ');
   const hintOf = (node: FileNode) =>
      text && node.where ? whereOf(node.where) : node.hint;

   const uploader = useAction(
      async (files: File[]) => {
         if (writable) {
            for (const file of files)
               await deals.uploadDocument(deal.id, file, user.id, second);
            return;
         }
         if (!item) return;
         const place = {
            section: 'committee',
            itemId: item.id,
            dealId: item.dealId,
         };
         const records = files.filter(({ name }) => RECORDING.test(name));
         const materials = files.filter(({ name }) => !RECORDING.test(name));
         if (materials.length)
            await attachments.uploadFiles(place, materials, user.id);
         if (records.length)
            await attachments.uploadFiles(
               { ...place, section: 'committee_record' },
               records,
               user.id,
            );
      },
      {
         kind: 'upload',
         success: (files) =>
            t('Загружено файлов: {{count}}', { count: files.length }),
      },
   );
   const upload = (files: File[]) => {
      if (files.length && canUpload && !uploader.pending)
         void uploader.run(files);
   };
   const withFiles = (event: DragEvent) =>
      canUpload && event.dataTransfer.types.includes('Files');

   const copyLink = async (url: string) => {
      try {
         await navigator.clipboard.writeText(url);
         toast.success(t('Ссылка скопирована'));
      } catch {
         toast.error(t('Не удалось скопировать ссылку'), url);
      }
   };

   // a folder opens here, a fund document its card, a file its address
   const openNode = (node: FileNode) => {
      const { subject } = node;
      if (node.folder) go(node.folder.path);
      else if (subject.type === 'fund_document')
         setDocumentMode(subject.document);
      else if (node.url) openUrl(node.url);
      else if (subject.type === 'deal_document')
         navigate(dealPage(subject.deal, subject.document.folderId));
   };

   const actionsOf = (node: FileNode): MenuAction[] => {
      const { subject } = node;
      const open: MenuAction = {
         label: t('Открыть'),
         icon: FolderOpen,
         onSelect: () => openNode(node),
      };
      const file: MenuAction[] = node.url
         ? [
              {
                 label: t('Открыть'),
                 icon: Eye,
                 onSelect: () => openUrl(node.url),
              },
              {
                 label: t('Скопировать ссылку'),
                 icon: LinkIcon,
                 onSelect: () => void copyLink(node.url),
              },
           ]
         : [];
      const edit = (onSelect: () => void): MenuAction => ({
         label: t('Изменить'),
         icon: Pencil,
         onSelect,
      });
      const remove: MenuAction = {
         label: t('Удалить'),
         icon: Trash2,
         danger: true,
         onSelect: () => setRemoving(node),
      };
      const toMeeting = (meeting: Meeting): MenuAction => ({
         label: t('Открыть заседание'),
         icon: Gavel,
         onSelect: () => navigate(meetingPage(meeting)),
      });
      const toDeal = (deal: Deal, folderId = ''): MenuAction => ({
         label: t('Открыть в сделке'),
         icon: Handshake,
         onSelect: () => navigate(dealPage(deal, folderId)),
      });

      switch (subject.type) {
         case 'folder':
            return [open];
         case 'deal':
            return [open, toDeal(subject.deal)];
         case 'meeting':
            return [open, toMeeting(subject.meeting)];
         case 'deal_folder':
            return [
               open,
               toDeal(subject.deal, subject.folder.id),
               ...(isOpen(subject.deal)
                  ? [
                       edit(() =>
                          setEditing({
                             kind: 'folder',
                             deal: subject.deal,
                             folder: subject.folder,
                             parentId: subject.folder.parentId,
                          }),
                       ),
                       remove,
                    ]
                  : []),
            ];
         case 'fund_document':
            return [
               ...file,
               edit(() => setDocumentMode(subject.document)),
               remove,
            ];
         case 'deal_document':
            return [
               ...file,
               toDeal(subject.deal, subject.document.folderId),
               ...(isOpen(subject.deal)
                  ? [
                       edit(() =>
                          setEditing({
                             kind: 'document',
                             deal: subject.deal,
                             document: subject.document,
                          }),
                       ),
                       remove,
                    ]
                  : []),
            ];
         case 'ic_file':
         case 'protocol':
            return [...file, toMeeting(subject.meeting)];
      }
   };

   // what deleting the row does, by what it is
   const removal = (() => {
      const subject = removing?.subject;
      if (subject?.type === 'fund_document')
         return {
            title: t('Удалить документ?'),
            body: t(
               'Документ уйдёт из реестра фонда; сам файл останется там, где его хранит фонд.',
            ),
            success: t('Документ удалён'),
            run: () => documents.removeDocument(subject.document.id),
         };
      if (subject?.type === 'deal_document') {
         const { deal, document } = subject;
         return {
            title: td('Удалить документ?'),
            body: [
               document.fileId
                  ? td(
                       'Файл удалится из data room и из хранилища; другие версии документа останутся.',
                    )
                  : td(
                       'Документ уйдёт из data room; другие версии останутся.',
                    ),
               document.uploadedBy === 'applicant' &&
                  t('Он пропадёт и из кабинета основателя.'),
            ]
               .filter(Boolean)
               .join(' '),
            success: td('Документ удалён'),
            run: () => deals.removeDocument(deal.id, document.id),
         };
      }
      if (subject?.type === 'deal_folder') {
         const { deal, folder } = subject;
         const parent = deal.folders?.find(({ id }) => id === folder.parentId);
         return {
            title: td('Удалить папку?'),
            body: td(
               'Файлы и папки из неё не удалятся — они перейдут в «{{parent}}».',
               { parent: parent?.name ?? deal.company },
            ),
            success: td('Папка удалена'),
            run: async () => {
               await deals.removeFolder(deal.id, folder.id);
               // the open folder, or one it is inside, is gone: go up
               if (crumbs.some((crumb) => crumb.path[2] === folder.id))
                  go(['deals', deal.id, folder.parentId].filter(Boolean));
            },
         };
      }
      return null;
   })();

   const note = !area
      ? t('Поиск ищет по всем модулям сразу.')
      : area === 'fund'
        ? t(
             'Документы фонда хранятся ссылками: в ucode Files файл был бы открыт любому, у кого есть ссылка.',
          )
        : area === 'deals'
          ? t(
               'Файлы заявителя видны и в его кабинете; файлы фонда — только команде.',
            )
          : t(
               'Те же материалы и записи, что во вкладке «Голосование» заседания.',
            );

   return (
      <>
         <div className='mb-3 flex flex-wrap items-center gap-2.5'>
            <FileCrumbs crumbs={crumbs} onGo={go} />
            <span className='flex-1' />
            <SearchField
               label={t('Поиск в файлах')}
               value={query}
               onChange={setQuery}
            />
            <Segmented<FileView>
               items={[
                  {
                     id: 'list',
                     label: t('Список'),
                     icon: List,
                     iconOnly: true,
                  },
                  {
                     id: 'grid',
                     label: t('Плитка'),
                     icon: LayoutGrid,
                     iconOnly: true,
                  },
               ]}
               label={t('Вид')}
               value={view}
               onChange={onView}
            />
            <Button
               disabled={!writable}
               title={
                  writable
                     ? undefined
                     : deal
                       ? t('Сделка закрыта: её дата рум только для чтения')
                       : t('Папки создаются в дата руме сделки')
               }
               variant='ghost'
               onClick={() =>
                  deal &&
                  setEditing({
                     kind: 'folder',
                     deal,
                     folder: null,
                     parentId: second,
                  })
               }
            >
               <FolderPlus aria-hidden />
               {t('Папка')}
            </Button>
            {area === 'fund' ? (
               <Button
                  onClick={() =>
                     setDocumentMode(
                        category === 'orders' ? 'order' : 'document',
                     )
                  }
               >
                  <Plus aria-hidden />
                  {category === 'orders'
                     ? t('Новый приказ')
                     : t('Добавить документ')}
               </Button>
            ) : (
               <Button
                  disabled={!canUpload}
                  loading={uploader.pending}
                  title={
                     canUpload
                        ? undefined
                        : deal
                          ? t('Сделка закрыта: её дата рум только для чтения')
                          : t(
                               'Откройте дата рум сделки или вопрос заседания, чтобы загрузить файлы',
                            )
                  }
                  onClick={() => input.current?.click()}
               >
                  <Upload aria-hidden />
                  {t('Загрузить')}
               </Button>
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
         </div>

         {/* files dropped on the card go where «Загрузить» puts them */}
         <div
            className='relative'
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
                     folder: crumbs.at(-1)?.label ?? '',
                  })}
               </div>
            )}
            <Card>
               {shown.length ? (
                  view === 'list' ? (
                     <FileList
                        actionsOf={actionsOf}
                        dir={sort.dir}
                        hintOf={hintOf}
                        marked={marked && `fd:${marked}`}
                        nodes={shown}
                        sort={ownOrder ? null : sort.key}
                        onOpen={openNode}
                        onSort={(key) =>
                           setSort((prev) => ({
                              key,
                              dir: prev.key === key && prev.dir === 1 ? -1 : 1,
                           }))
                        }
                     />
                  ) : (
                     <FileGrid
                        actionsOf={actionsOf}
                        hintOf={hintOf}
                        marked={marked && `fd:${marked}`}
                        nodes={shown}
                        onOpen={openNode}
                     />
                  )
               ) : (
                  <NoData>
                     {text
                        ? t('Ничего не найдено по запросу «{{query}}».', {
                             query: query.trim(),
                          })
                        : [
                             t('Папка пуста.'),
                             canUpload
                                ? t(
                                     'Перетащите файлы сюда или нажмите «Загрузить».',
                                  )
                                : category && t('Добавьте первый документ.'),
                          ]
                             .filter(Boolean)
                             .join(' ')}
                  </NoData>
               )}
               <footer className='border-line text-ink-soft flex flex-wrap justify-between gap-x-4 gap-y-1 border-t px-4.5 py-2.5 text-xs'>
                  <span>
                     {text
                        ? t('Найдено: {{count}}', { count: shown.length })
                        : t('{{count}} элемент', { count: shown.length })}
                  </span>
                  <span>{note}</span>
               </footer>
            </Card>
         </div>

         <DocumentDialog
            category={category ?? 'corporate'}
            mode={documentMode}
            onClose={() => setDocumentMode(null)}
            onSaved={onSaved}
         />
         <Modal
            open={editing?.kind === 'folder'}
            subtitle={editing?.deal.company}
            title={
               editing?.kind === 'folder' && !editing.folder
                  ? td('Новая папка')
                  : td('Папка')
            }
            onClose={() => setEditing(null)}
         >
            {editing?.kind === 'folder' && (
               <FolderForm
                  key={editing.folder?.id ?? 'new'}
                  deal={editing.deal}
                  folder={editing.folder}
                  parentId={editing.parentId}
                  onClose={() => setEditing(null)}
               />
            )}
         </Modal>
         <Modal
            open={editing?.kind === 'document'}
            subtitle={editing?.deal.company}
            title={td('Документ')}
            onClose={() => setEditing(null)}
         >
            {editing?.kind === 'document' && (
               <DocumentForm
                  key={editing.document.id}
                  deal={editing.deal}
                  document={editing.document}
                  onClose={() => setEditing(null)}
               />
            )}
         </Modal>
         <ConfirmDialog
            open={removal !== null}
            subtitle={removing?.name}
            success={removal?.success}
            title={removal?.title ?? ''}
            onClose={() => setRemoving(null)}
            onConfirm={() => removal?.run()}
         >
            <p>{removal?.body}</p>
         </ConfirmDialog>
      </>
   );
};

export default FileManager;

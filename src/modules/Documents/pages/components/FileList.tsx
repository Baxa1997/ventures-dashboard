import {
   SORT_LABELS,
   SORTS,
   type SortKey,
} from '@modules/Documents/constants';
import type { FileNode } from '@modules/Documents/helpers';
import {
   ActionMenu,
   Avatar,
   Badge,
   type MenuAction,
   Table,
   TD,
   TH,
} from '@shared/components';
import { formatDayYear } from '@shared/helpers';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, FolderInput, GripVertical } from 'lucide-react';
import { type DragEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import NodeIcon from './NodeIcon';

export interface FileViewProps {
   nodes: FileNode[];
   marked: string; // the key of a row to show marked, '' for none
   hintOf: (node: FileNode) => string; // the line under the name
   onOpen: (node: FileNode) => void;
   actionsOf: (node: FileNode) => MenuAction[];
}

interface FileListProps extends FileViewProps {
   sort: SortKey | null; // null: the modules, in their own order
   dir: 1 | -1;
   onSort: (key: SortKey) => void;
   // a row dragged by its handle onto a folder row moves there
   canDrag?: (node: FileNode) => boolean;
   canDrop?: (dragged: FileNode, target: FileNode) => boolean;
   onDropNode?: (dragged: FileNode, target: FileNode) => void;
}

// What a row carries while it is dragged to a folder.
const DRAGGED_NODE = 'application/x-sqb-node';

/* «Список», as the design draws it: name, owner, when it changed and, in
   place of a size the panel does not keep, a folder's count or a file's
   status. A column's name sorts by it; pressed again, the other way. A row
   opens its folder or file; «⋯» holds the rest. */
const FileList = ({
   nodes,
   marked,
   hintOf,
   onOpen,
   actionsOf,
   sort,
   dir,
   onSort,
   canDrag,
   canDrop,
   onDropNode,
}: FileListProps) => {
   const { t } = useTranslation('documents');
   const markedRow = useRef<HTMLTableRowElement>(null);
   const [dragged, setDragged] = useState<FileNode | null>(null);
   const [over, setOver] = useState('');
   const handles = !!canDrag && nodes.some((node) => canDrag(node));
   // a folder row that takes the row being dragged
   const takes = (node: FileNode) =>
      !!dragged && !!canDrop?.(dragged, node);
   const dragOver = (node: FileNode) => (event: DragEvent) => {
      if (!event.dataTransfer.types.includes(DRAGGED_NODE) || !takes(node))
         return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setOver(node.key);
   };

   useEffect(() => {
      markedRow.current?.scrollIntoView({ block: 'center' });
   }, [marked]);

   return (
      <Table
         className='min-w-2xl'
         head={
            <>
               {handles && (
                  <th className={clsx(TH, 'w-0 pr-0')}>
                     <span className='sr-only'>{t('Переместить')}</span>
                  </th>
               )}
               {SORTS.map((key) => (
                  <th
                     key={key}
                     aria-sort={
                        sort === key
                           ? dir > 0
                              ? 'ascending'
                              : 'descending'
                           : undefined
                     }
                     className={clsx(TH, key === 'status' && 'text-right')}
                  >
                     <button
                        type='button'
                        className={clsx(
                           'hover:text-ink inline-flex items-center gap-1',
                           sort === key && 'text-ink',
                        )}
                        data-hint={t('Сортировать по этому столбцу')}
                        onClick={() => onSort(key)}
                     >
                        {t(SORT_LABELS[key])}
                        {sort === key &&
                           (dir > 0 ? (
                              <ArrowUp aria-hidden className='size-3' />
                           ) : (
                              <ArrowDown aria-hidden className='size-3' />
                           ))}
                     </button>
                  </th>
               ))}
               <th className={TH}>
                  <span className='sr-only'>{t('Действия')}</span>
               </th>
            </>
         }
      >
         {nodes.map((node) => {
            const hint = hintOf(node);
            const movable = !!canDrag?.(node);
            const target = takes(node);
            return (
               <tr
                  key={node.key}
                  ref={node.key === marked ? markedRow : undefined}
                  className={clsx(
                     'hover:bg-hover cursor-pointer',
                     node.key === marked && 'bg-accent-tint/60',
                     dragged?.key === node.key && 'opacity-50',
                     target &&
                        (over === node.key
                           ? 'bg-accent-tint outline-accent outline-2 -outline-offset-2 outline-dashed'
                           : 'outline-accent-soft outline-1 -outline-offset-2 outline-dashed'),
                  )}
                  draggable={movable}
                  tabIndex={0}
                  onClick={() => onOpen(node)}
                  onDragEnd={() => {
                     setDragged(null);
                     setOver('');
                  }}
                  onDragLeave={() => over === node.key && setOver('')}
                  onDragOver={dragOver(node)}
                  onDragStart={(event) => {
                     if (!movable) return;
                     event.dataTransfer.setData(DRAGGED_NODE, node.key);
                     event.dataTransfer.effectAllowed = 'move';
                     setDragged(node);
                  }}
                  onDrop={(event) => {
                     if (!dragged || !takes(node)) return;
                     event.preventDefault();
                     onDropNode?.(dragged, node);
                     setDragged(null);
                     setOver('');
                  }}
                  onKeyDown={(event) => {
                     if (event.key === 'Enter') onOpen(node);
                  }}
               >
                  {handles && (
                     <td className={clsx(TD, 'w-0 pr-0')}>
                        {movable && (
                           <span
                              aria-hidden
                              className='text-ink-faint hover:bg-ground hover:text-ink grid h-8 w-5 cursor-grab place-items-center rounded active:cursor-grabbing'
                              data-hint={t(
                                 'Перетащите на папку, чтобы переместить документ',
                              )}
                              onClick={(event) => event.stopPropagation()}
                           >
                              <GripVertical className='size-4' />
                           </span>
                        )}
                     </td>
                  )}
                  <td className={TD}>
                     <div className='flex min-w-0 items-center gap-2.5'>
                        {target && (
                           <FolderInput
                              aria-hidden
                              className='text-accent size-4 shrink-0'
                           />
                        )}
                        <NodeIcon node={node} />
                        <div className='min-w-0'>
                           <div className='max-w-md truncate font-medium'>
                              {node.name}
                           </div>
                           {hint && (
                              <div className='text-ink-soft max-w-md truncate text-xs'>
                                 {hint}
                              </div>
                           )}
                        </div>
                     </div>
                  </td>
                  <td className={TD}>
                     <span className='flex items-center gap-2 whitespace-nowrap'>
                        <Avatar name={node.owner} />
                        {node.owner}
                     </span>
                  </td>
                  <td className={clsx(TD, 'text-ink-soft whitespace-nowrap')}>
                     {formatDayYear(node.date.slice(0, 10))}
                  </td>
                  <td className={clsx(TD, 'text-right whitespace-nowrap')}>
                     {node.folder ? (
                        <span className='text-ink-soft tabular-nums'>
                           {t('{{count}} элемент', {
                              count: node.folder.count,
                           })}
                        </span>
                     ) : node.status ? (
                        <Badge tone={node.status.tone}>
                           {node.status.label}
                        </Badge>
                     ) : (
                        <span className='text-ink-faint'>—</span>
                     )}
                  </td>
                  <td className={clsx(TD, 'w-0 text-right')}>
                     <ActionMenu actions={actionsOf(node)} name={node.name} />
                  </td>
               </tr>
            );
         })}
      </Table>
   );
};

export default FileList;

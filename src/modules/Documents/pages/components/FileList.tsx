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
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useRef } from 'react';
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
}

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
}: FileListProps) => {
   const { t } = useTranslation('documents');
   const markedRow = useRef<HTMLTableRowElement>(null);

   useEffect(() => {
      markedRow.current?.scrollIntoView({ block: 'center' });
   }, [marked]);

   return (
      <Table
         className='min-w-2xl'
         head={
            <>
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
            return (
               <tr
                  key={node.key}
                  ref={node.key === marked ? markedRow : undefined}
                  className={clsx(
                     'hover:bg-hover cursor-pointer',
                     node.key === marked && 'bg-accent-tint/60',
                  )}
                  tabIndex={0}
                  onClick={() => onOpen(node)}
                  onKeyDown={(event) => {
                     if (event.key === 'Enter') onOpen(node);
                  }}
               >
                  <td className={TD}>
                     <div className='flex min-w-0 items-center gap-2.5'>
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

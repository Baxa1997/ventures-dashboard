import { ActionMenu } from '@shared/components';
import { formatDayYear } from '@shared/helpers';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { FileViewProps } from './FileList';
import NodeIcon from './NodeIcon';

/* «Плитка», as the design draws it: a tile for each folder and file with
   its sign, its name, and its count or status with the date; «⋯» in its
   corner. */
const FileGrid = ({
   nodes,
   marked,
   hintOf,
   onOpen,
   actionsOf,
}: FileViewProps) => {
   const { t } = useTranslation('documents');

   return (
      <ul className='grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3 p-3.5'>
         {nodes.map((node) => {
            const line = [
               node.folder
                  ? t('{{count}} элемент', { count: node.folder.count })
                  : node.status?.label,
               node.date && formatDayYear(node.date.slice(0, 10)),
            ]
               .filter(Boolean)
               .join(' · ');
            return (
               <li
                  key={node.key}
                  className={clsx(
                     'border-line hover:border-accent focus-visible:border-accent relative min-w-0 cursor-pointer rounded-lg border bg-white px-3 pt-3.5 pb-3 outline-none',
                     node.key === marked && 'border-accent bg-accent-tint/60',
                  )}
                  tabIndex={0}
                  title={hintOf(node) || undefined}
                  onClick={() => onOpen(node)}
                  onKeyDown={(event) => {
                     if (event.key === 'Enter') onOpen(node);
                  }}
               >
                  <ActionMenu
                     actions={actionsOf(node)}
                     className='absolute top-1.5 right-1.5'
                     name={node.name}
                  />
                  <div className='bg-ground grid h-16 place-items-center rounded-lg'>
                     <NodeIcon large node={node} />
                  </div>
                  <div className='mt-2 truncate font-medium'>{node.name}</div>
                  <div className='text-ink-soft truncate text-xs'>
                     {line || '—'}
                  </div>
               </li>
            );
         })}
      </ul>
   );
};

export default FileGrid;

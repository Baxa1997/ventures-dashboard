import { useBoardDrag } from '@shared/hooks';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import BoardGap from './BoardGap';

export interface KanbanColumn {
   id: string;
   label: string;
   color: string; // the line on top of it
   aside: string; // at the end of its heading: how many, how much
}

interface KanbanBoardProps<T> {
   columns: KanbanColumn[];
   items: T[];
   idOf: (item: T) => string;
   nameOf: (item: T) => string; // the card, for screen readers
   columnOf: (item: T) => string;
   renderCard: (item: T) => ReactNode;
   onOpen: (item: T) => void;
   onMove: (item: T, column: string) => void;
}

const cardClass = (lifted: boolean) =>
   clsx(
      'border-line grid grid-cols-[minmax(0,1fr)] gap-1.5 rounded-lg border bg-white px-3 py-2.75',
      lifted
         ? 'shadow-popup animate-lift scale-[1.02] rotate-2'
         : 'hover:border-line-strong hover:shadow-raised transition-shadow',
   );

/* A board whose columns are a record's statuses or stages. A card is carried
   as on Задачи's board, and takes the column it is dropped in; a click opens
   it. A column keeps its cards in the list's own order. */
const KanbanBoard = <T,>({
   columns,
   items,
   idOf,
   nameOf,
   columnOf,
   renderCard,
   onOpen,
   onMove,
}: KanbanBoardProps<T>) => {
   const { t } = useTranslation('components');
   const { board, carried, press, clickable } = useBoardDrag(
      (item: T, { column }) => {
         if (column !== columnOf(item)) onMove(item, column);
      },
   );

   return (
      <>
         <div
            ref={board}
            className='relative grid auto-cols-[minmax(13.5rem,1fr)] grid-flow-col items-start gap-3 overflow-x-auto pb-2'
         >
            {columns.map(({ id, label, color, aside }) => {
               const cards = items.filter((item) => columnOf(item) === id);
               const carriedId = carried ? idOf(carried.item) : null;
               const shown = cards.filter((item) => idOf(item) !== carriedId);
               const gap = carried?.over?.column === id ? carried.over.index : -1;
               const height = carried?.height ?? 0;
               return (
                  <section
                     key={id}
                     aria-label={label}
                     className={clsx(
                        'border-line min-w-0 rounded-xl border border-t-3 transition-colors',
                        gap >= 0 ? 'bg-ground' : 'bg-white',
                     )}
                     data-column={id}
                     style={{ borderTopColor: color }}
                  >
                     <header className='text-meta flex justify-between gap-2 px-3.5 py-2.75 font-bold'>
                        <span className='min-w-0'>{label}</span>
                        <span className='text-ink-faint shrink-0 font-medium tabular-nums'>
                           {aside}
                        </span>
                     </header>
                     <ul className='grid min-h-12.5 grid-cols-[minmax(0,1fr)] gap-2 px-2 pb-2'>
                        {shown.flatMap((item, index) => [
                           ...(index === gap
                              ? [<BoardGap key='gap' height={height} />]
                              : []),
                           <li
                              key={idOf(item)}
                              className='cursor-grab select-none'
                              data-card={idOf(item)}
                              onClick={() => clickable() && onOpen(item)}
                              onPointerDown={(event) => press(item, event)}
                           >
                              <button
                                 type='button'
                                 aria-label={nameOf(item)}
                                 className='block w-full text-left'
                                 data-hint={t(
                                    'Нажмите, чтобы открыть; перетащите в другую колонку',
                                 )}
                              >
                                 <div className={cardClass(false)}>
                                    {renderCard(item)}
                                 </div>
                              </button>
                           </li>,
                        ])}
                        {gap === shown.length && <BoardGap height={height} />}
                     </ul>
                  </section>
               );
            })}
         </div>
         {carried &&
            createPortal(
               <div
                  aria-hidden
                  className='pointer-events-none fixed z-120'
                  style={{
                     left: carried.x - carried.dx,
                     top: carried.y - carried.dy,
                     width: carried.width,
                  }}
               >
                  <div className={cardClass(true)}>
                     {renderCard(carried.item)}
                  </div>
               </div>,
               document.body,
            )}
      </>
   );
};

export default KanbanBoard;

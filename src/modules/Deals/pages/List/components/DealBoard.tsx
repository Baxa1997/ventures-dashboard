import {
   formatAmount,
   industryText,
   roundText,
} from '@modules/Deals/helpers';
import { BoardGap, CompanyMark, TONE_COLORS } from '@shared/components';
import { personName } from '@shared/helpers';
import {
   type BoardPlace,
   useBoardDrag,
   useBoardOrder,
   useCurrentUser,
} from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import clsx from 'clsx';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { StageFilter } from '../constants';
import {
   boardColumns,
   columnName,
   columnOf,
   columnTone,
   scoreClass,
   scoreOf,
} from '../helpers';

interface DealBoardProps {
   deals: Deal[];
   stage: StageFilter;
   onDrop: (deal: Deal, column: string) => void;
}

interface CardFaceProps {
   deal: Deal;
   lifted?: boolean; // carried across the board
}

// What a deal's card shows: the startup, its industry and round, the ask,
// the screening's score and the manager.
const CardFace = ({ deal, lifted = false }: CardFaceProps) => {
   const { i18n } = useTranslation('deals');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const score = scoreOf(deal);
   const owner = deal.ownerId || deal.proposedOwnerId;

   return (
      <div
         className={clsx(
            'border-line grid grid-cols-[minmax(0,1fr)] gap-2 rounded-lg border bg-white px-3 py-2.75',
            lifted
               ? 'shadow-popup animate-lift scale-[1.02] rotate-2'
               : 'hover:border-line-strong hover:shadow-raised transition-shadow',
         )}
      >
         <div className='flex items-center gap-2.5'>
            <CompanyMark name={deal.company} />
            <div className='min-w-0'>
               <div className='truncate font-bold'>{deal.company}</div>
               <div className='text-ink-faint truncate text-xs'>
                  {[industryText(deal), roundText(deal)]
                     .filter(Boolean)
                     .join(' · ')}
               </div>
            </div>
         </div>
         <div className='text-ink-faint flex items-center justify-between gap-2 text-xs tabular-nums'>
            <span>{formatAmount(deal.amount, language)}</span>
            {score !== null && (
               <b className={scoreClass(score)}>{score.toFixed(1)}</b>
            )}
            <span className='truncate'>
               {owner ? personName(owner).split(' ')[0] : '—'}
            </span>
         </div>
      </div>
   );
};

/* «Воронка»: a column per stage (and per closed status when all deals are
   shown), coloured by its part of the way. A card is carried as on a
   Notion board: it follows the pointer and a gap opens where it would
   drop. Dropped in another column the page asks how to move it there;
   inside its column it keeps its place (in this browser). */
const DealBoard = ({ deals, stage, onDrop }: DealBoardProps) => {
   const { t } = useTranslation('deals');
   const navigate = useNavigate();
   const user = useCurrentUser();
   const { arrange, place } = useBoardOrder('deals_board', user.id);
   const columnDeals = (column: string) =>
      arrange(
         column,
         deals.filter((deal) => columnOf(deal) === column),
      );

   const { board, carried, press, clickable } = useBoardDrag(
      (deal: Deal, { column, index }: BoardPlace) => {
         place(column, columnDeals(column), deal.id, index);
         if (column !== columnOf(deal)) onDrop(deal, column);
      },
   );

   return (
      <>
         <div
            ref={board}
            className='grid auto-cols-[minmax(15.625rem,1fr)] grid-flow-col items-start gap-3 overflow-x-auto pb-2'
         >
            {boardColumns(stage).map((column) => {
               const cards = columnDeals(column);
               const shown = cards.filter(({ id }) => id !== carried?.item.id);
               const gap =
                  carried?.over?.column === column ? carried.over.index : -1;
               const height = carried?.height ?? 0;
               return (
                  <section
                     key={column}
                     aria-label={columnName(t, column)}
                     className={clsx(
                        'border-line min-w-0 rounded-xl border border-t-3 transition-colors',
                        gap >= 0 ? 'bg-ground' : 'bg-white',
                     )}
                     data-column={column}
                     style={{ borderTopColor: TONE_COLORS[columnTone(column)] }}
                  >
                     <header className='text-meta flex justify-between px-3.5 py-2.75 font-bold'>
                        <span>{columnName(t, column)}</span>
                        <span className='text-ink-faint font-medium tabular-nums'>
                           {cards.length}
                        </span>
                     </header>
                     <ul className='grid min-h-12.5 grid-cols-[minmax(0,1fr)] gap-2 px-2 pb-2'>
                        {shown.flatMap((deal, index) => [
                           ...(index === gap
                              ? [<BoardGap key='gap' height={height} />]
                              : []),
                           <li
                              key={deal.id}
                              className='cursor-grab select-none'
                              data-card={deal.id}
                              onClick={() =>
                                 clickable() && navigate(`/deals/${deal.id}`)
                              }
                              onPointerDown={(event) => press(deal, event)}
                           >
                              <button
                                 type='button'
                                 aria-label={deal.company}
                                 className='block w-full text-left'
                              >
                                 <CardFace deal={deal} />
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
                  <CardFace lifted deal={carried.item} />
               </div>,
               document.body,
            )}
      </>
   );
};

export default DealBoard;

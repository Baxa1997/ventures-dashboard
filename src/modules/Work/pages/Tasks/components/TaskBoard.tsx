import { listName } from '@modules/Settings/services';
import {
   getAssigneeId,
   isOverdue,
   statusName,
   statusTone,
   taskKey,
   taskStatuses,
   typeTone,
} from '@modules/Work/helpers';
import { openTask } from '@modules/Work/hooks';
import { Avatar, Badge, TONE_COLORS } from '@shared/components';
import { formatNumericDate, personName } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { Task, TaskStatus } from '@shared/types/work.types';
import clsx from 'clsx';
import {
   type PointerEvent as ReactPointerEvent,
   useEffect,
   useRef,
   useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { inBoardOrder } from '../helpers';
import { useBoardOrder } from '../hooks';

interface TaskBoardProps {
   tasks: Task[];
   targetName: (task: Task) => string;
   onMove: (task: Task, status: TaskStatus) => Promise<unknown>;
}

// Where a carried card would drop: a column, and its place among the cards.
interface Place {
   status: TaskStatus;
   index: number;
}

// A card being carried: its size, where the pointer holds it, where the
// pointer is, and where it would drop.
interface Carried {
   task: Task;
   width: number;
   height: number;
   dx: number;
   dy: number;
   x: number;
   y: number;
   over: Place | null;
}

const DRAG_FROM = 5; // px the pointer moves before a press becomes a drag
const EDGE = 56; // px from an edge where the board and the page scroll
const STEP = 14; // px they scroll per frame

interface CardFaceProps {
   task: Task;
   target: string;
   lifted?: boolean; // carried across the board
}

// What a card shows: its number, title, type and deal, who does it, when.
const CardFace = ({ task, target, lifted = false }: CardFaceProps) => {
   const assignee = personName(getAssigneeId(task));

   return (
      <div
         className={clsx(
            'border-line grid gap-1.5 rounded-lg border bg-white px-3 py-2.75',
            lifted
               ? 'shadow-popup animate-lift scale-[1.02] rotate-2'
               : 'hover:border-line-strong hover:shadow-raised transition-shadow',
         )}
      >
         <span className='text-ink-faint text-xs tabular-nums'>
            {taskKey(task)}
         </span>
         <span className='font-semibold'>{task.title}</span>
         <div className='text-ink-faint flex flex-wrap items-center gap-1.5 text-xs'>
            <Badge tone={typeTone(task.type)}>
               {listName('taskTypes', task.type)}
            </Badge>
            {target && <span className='truncate'>{target}</span>}
         </div>
         <div className='text-ink-faint flex items-center justify-between gap-2 text-xs'>
            <span className='flex' title={assignee}>
               <Avatar name={assignee} />
               <span className='sr-only'>{assignee}</span>
            </span>
            {task.dueDate && (
               <time
                  className={clsx(isOverdue(task) && 'text-danger')}
                  dateTime={task.dueDate}
               >
                  {formatNumericDate(task.dueDate)}
               </time>
            )}
         </div>
      </div>
   );
};

/* «Доска»: a column per status, in the order Настройки give them, each
   topped with its colour. A card is carried as on a Notion board: it lifts
   and follows the pointer, its place closes, and a gap opens where it would
   drop. Dropped in another column it takes that status; anywhere it keeps
   the place it was dropped at (in this browser). The card's own status
   select does the same from the keyboard. */
const TaskBoard = ({ tasks, targetName, onMove }: TaskBoardProps) => {
   const { t } = useTranslation('work');
   const user = useCurrentUser();
   const { order, setColumn } = useBoardOrder(user.id);
   const [carried, setCarried] = useState<Carried | null>(null);
   const board = useRef<HTMLDivElement>(null);
   // a press that ended a drag is not a click on the card
   const dropped = useRef(false);
   // the end of a drag under way, for when the board leaves the page
   const stop = useRef<(() => void) | null>(null);
   useEffect(() => () => stop.current?.(), []);

   const listed = taskStatuses().map(({ key }) => key);
   const columns = [
      ...listed,
      ...new Set(
         tasks
            .map(({ status }) => status)
            .filter((key) => !listed.includes(key)),
      ),
   ];
   const columnOf = (status: TaskStatus) =>
      inBoardOrder(
         tasks.filter((task) => task.status === status),
         order[status],
      );

   // the column under the pointer, and the place among its cards
   const placeAt = (x: number, y: number): Place | null => {
      const column = document
         .elementFromPoint(x, y)
         ?.closest<HTMLElement>('[data-column]');
      if (!column || !board.current?.contains(column)) return null;
      const cards = [...column.querySelectorAll<HTMLElement>('[data-card]')];
      const index = cards.findIndex((card) => {
         const box = card.getBoundingClientRect();
         return y < box.top + box.height / 2;
      });
      return {
         status: column.dataset.column ?? '',
         index: index < 0 ? cards.length : index,
      };
   };

   const drop = ({ task, over }: Carried) => {
      if (!over) return;
      const ids = columnOf(over.status)
         .map(({ id }) => id)
         .filter((id) => id !== task.id);
      ids.splice(over.index, 0, task.id);
      setColumn(over.status, ids);
      if (over.status !== task.status) onMove(task, over.status);
   };

   const press = (task: Task, event: ReactPointerEvent<HTMLLIElement>) => {
      // a mouse or a pen carries cards; a finger scrolls the board
      if (event.button !== 0 || event.pointerType === 'touch') return;
      const box = event.currentTarget.getBoundingClientRect();
      const start = { x: event.clientX, y: event.clientY };
      let current: Carried | null = null;
      let pointer = start;
      let frame = 0;

      // near an edge, the board scrolls sideways and the page up or down;
      // what is under the pointer then changes, and so does the drop place
      const scroll = () => {
         const area = board.current?.getBoundingClientRect();
         const before = [board.current?.scrollLeft, window.scrollY];
         if (board.current && area) {
            if (pointer.x < area.left + EDGE) board.current.scrollLeft -= STEP;
            if (pointer.x > area.right - EDGE) board.current.scrollLeft += STEP;
         }
         if (pointer.y < EDGE) window.scrollBy(0, -STEP);
         if (pointer.y > window.innerHeight - EDGE) window.scrollBy(0, STEP);
         const after = [board.current?.scrollLeft, window.scrollY];
         if (current && (before[0] !== after[0] || before[1] !== after[1])) {
            current = { ...current, over: placeAt(pointer.x, pointer.y) };
            setCarried(current);
         }
         frame = requestAnimationFrame(scroll);
      };

      const move = (next: PointerEvent) => {
         pointer = { x: next.clientX, y: next.clientY };
         if (!current) {
            if (
               Math.hypot(pointer.x - start.x, pointer.y - start.y) < DRAG_FROM
            )
               return;
            current = {
               task,
               width: box.width,
               height: box.height,
               dx: start.x - box.left,
               dy: start.y - box.top,
               ...pointer,
               over: null,
            };
            document.body.classList.add('dragging');
            frame = requestAnimationFrame(scroll);
         }
         current = {
            ...current,
            ...pointer,
            over: placeAt(pointer.x, pointer.y),
         };
         setCarried(current);
      };

      const end = (cancelled: boolean) => {
         window.removeEventListener('pointermove', move);
         window.removeEventListener('pointerup', up);
         window.removeEventListener('keydown', key);
         cancelAnimationFrame(frame);
         document.body.classList.remove('dragging');
         stop.current = null;
         if (current) {
            dropped.current = true;
            setTimeout(() => {
               dropped.current = false;
            });
            if (!cancelled) drop(current);
         }
         setCarried(null);
      };
      const up = () => end(false);
      const key = (next: KeyboardEvent) => {
         if (next.key === 'Escape') end(true);
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('keydown', key);
      stop.current = () => end(true);
   };

   return (
      <>
         <div
            ref={board}
            className='grid auto-cols-[minmax(15.625rem,1fr)] grid-flow-col items-start gap-3 overflow-x-auto pb-2'
         >
            {columns.map((status) => {
               const cards = columnOf(status);
               const shown = cards.filter(
                  ({ id }) => id !== carried?.task.id,
               );
               const gap =
                  carried?.over?.status === status ? carried.over.index : -1;
               return (
                  <section
                     key={status}
                     aria-label={statusName(t, status)}
                     className={clsx(
                        'border-line min-w-0 rounded-xl border border-t-3 transition-colors',
                        gap >= 0 ? 'bg-ground' : 'bg-white',
                     )}
                     data-column={status}
                     style={{ borderTopColor: TONE_COLORS[statusTone(status)] }}
                  >
                     <header className='text-meta flex justify-between px-3.5 py-2.75 font-bold'>
                        <span>{statusName(t, status)}</span>
                        <span className='text-ink-faint font-medium tabular-nums'>
                           {cards.length}
                        </span>
                     </header>
                     <ul className='grid min-h-12.5 gap-2 px-2 pb-2'>
                        {shown.map((task, index) => (
                           <BoardSlot
                              key={task.id}
                              gapBefore={index === gap}
                              height={carried?.height ?? 0}
                              task={task}
                              target={targetName(task)}
                              onOpen={() => {
                                 if (!dropped.current) openTask(task.id);
                              }}
                              onPress={(event) => press(task, event)}
                           />
                        ))}
                        {gap === shown.length && (
                           <Gap height={carried?.height ?? 0} />
                        )}
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
                  <CardFace
                     lifted
                     target={targetName(carried.task)}
                     task={carried.task}
                  />
               </div>,
               document.body,
            )}
      </>
   );
};

// The place a carried card would drop into, the height of the card.
const Gap = ({ height }: { height: number }) => (
   <li
      aria-hidden
      className='animate-open border-accent/45 bg-accent-tint rounded-lg border-2 border-dashed'
      style={{ height }}
   />
);

interface BoardSlotProps {
   task: Task;
   target: string;
   gapBefore: boolean; // the carried card would drop above this one
   height: number;
   onOpen: () => void;
   onPress: (event: ReactPointerEvent<HTMLLIElement>) => void;
}

// A card in its column, and the gap above it while a card is carried there.
const BoardSlot = ({
   task,
   target,
   gapBefore,
   height,
   onOpen,
   onPress,
}: BoardSlotProps) => (
   <>
      {gapBefore && <Gap height={height} />}
      <li
         className='cursor-grab select-none'
         data-card={task.id}
         onClick={onOpen}
         onPointerDown={onPress}
      >
         <button
            type='button'
            aria-label={`${taskKey(task)} ${task.title}`}
            className='block w-full text-left'
         >
            <CardFace target={target} task={task} />
         </button>
      </li>
   </>
);

export default TaskBoard;

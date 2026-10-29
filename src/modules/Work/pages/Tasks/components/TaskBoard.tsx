import { listName } from '@modules/Settings/services';
import {
   getAssigneeId,
   isOverdue,
   statusFill,
   statusName,
   taskKey,
   taskStatuses,
   typeTone,
} from '@modules/Work/helpers';
import { openTask } from '@modules/Work/hooks';
import { Avatar, Badge, BoardGap } from '@shared/components';
import { formatNumericDate, personName } from '@shared/helpers';
import {
   type BoardPlace,
   useBoardDrag,
   useBoardOrder,
   useCurrentUser,
} from '@shared/hooks';
import type { Task, TaskStatus } from '@shared/types/work.types';
import clsx from 'clsx';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface TaskBoardProps {
   tasks: Task[];
   targetName: (task: Task) => string;
   onMove: (task: Task, status: TaskStatus) => Promise<unknown>;
}

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
   const { arrange, place } = useBoardOrder('board', user.id);
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
      arrange(
         status,
         tasks.filter((task) => task.status === status),
      );

   const { board, carried, press, clickable } = useBoardDrag(
      (task: Task, { column, index }: BoardPlace) => {
         place(column, columnOf(column), task.id, index);
         if (column !== task.status) onMove(task, column);
      },
   );

   return (
      <>
         <div
            ref={board}
            className='grid auto-cols-[minmax(15.625rem,1fr)] grid-flow-col items-start gap-3 overflow-x-auto pb-2'
         >
            {columns.map((status) => {
               const cards = columnOf(status);
               const shown = cards.filter(({ id }) => id !== carried?.item.id);
               const gap =
                  carried?.over?.column === status ? carried.over.index : -1;
               const height = carried?.height ?? 0;
               return (
                  <section
                     key={status}
                     aria-label={statusName(t, status)}
                     className={clsx(
                        'border-line min-w-0 rounded-xl border border-t-3 transition-colors',
                        gap >= 0 ? 'bg-ground' : 'bg-white',
                     )}
                     data-column={status}
                     style={{ borderTopColor: statusFill(status) }}
                  >
                     <header className='text-meta flex justify-between px-3.5 py-2.75 font-bold'>
                        <span>{statusName(t, status)}</span>
                        <span className='text-ink-faint font-medium tabular-nums'>
                           {cards.length}
                        </span>
                     </header>
                     <ul className='grid min-h-12.5 gap-2 px-2 pb-2'>
                        {shown.flatMap((task, index) => [
                           ...(index === gap
                              ? [<BoardGap key='gap' height={height} />]
                              : []),
                           <li
                              key={task.id}
                              className='cursor-grab select-none'
                              data-card={task.id}
                              onClick={() => clickable() && openTask(task.id)}
                              onPointerDown={(event) => press(task, event)}
                           >
                              <button
                                 type='button'
                                 aria-label={`${taskKey(task)} ${task.title}`}
                                 className='block w-full text-left'
                              >
                                 <CardFace
                                    target={targetName(task)}
                                    task={task}
                                 />
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
                  <CardFace
                     lifted
                     target={targetName(carried.item)}
                     task={carried.item}
                  />
               </div>,
               document.body,
            )}
      </>
   );
};

export default TaskBoard;

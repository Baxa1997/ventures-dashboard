import { Button, Card } from '@shared/components';
import { useSaveQueue } from '@shared/hooks';
import clsx from 'clsx';
import { GripVertical, Lock, Plus, Trash2 } from 'lucide-react';
import {
   type CSSProperties,
   type InputHTMLAttributes,
   type PointerEvent as ReactPointerEvent,
   type ReactNode,
   type RefObject,
   useEffect,
   useRef,
   useState,
} from 'react';
import { useTranslation } from 'react-i18next';

/* A list edited where it stands, as the prototype draws its reference lists:
   a row of fields for each item, each saved as it is changed, a handle to
   drag the row by, a bin (or a lock) at the end, «Добавить» below.

   The first and the last column hold the handle and the bin: 44px and 52px
   with the card's 18px inside them, so neither runs over its cell. */

export const HEAD =
   'text-ink-soft px-1 py-2 text-left text-[11px] font-semibold whitespace-nowrap first:pl-4.5 last:pr-4.5';
export const CELL = 'px-1 py-1.5 first:pl-4.5 last:pr-4.5';
export const HANDLE_COLUMN = 'w-11';
export const ACTION_COLUMN = 'w-13';

// The last column, kept in view while a wide table scrolls sideways.
export const STICKY_END =
   'sticky right-0 z-[1] bg-white shadow-[-8px_0_8px_-8px_rgba(38,47,112,0.18)]';
// a field in a row: 28px, smaller than a form's
export const ROW_INPUT =
   'field-input text-meta h-7 rounded-md px-2 transition-colors disabled:text-ink-soft disabled:cursor-not-allowed';
// a select keeps the room its chevron needs on the right
export const ROW_SELECT =
   'field-input text-meta h-7 rounded-md pl-2 transition-colors disabled:text-ink-soft disabled:cursor-not-allowed';

interface RowInputProps
   extends Omit<
      InputHTMLAttributes<HTMLInputElement>,
      'value' | 'onChange' | 'onBlur'
   > {
   value: string;
   label: string;
   onSave: (value: string) => void; // when the field is left changed
}

// A text saved when the field is left (or Enter pressed); Esc puts it back.
export const RowInput = ({
   value,
   label,
   onSave,
   className,
   ...props
}: RowInputProps) => {
   // what is being typed; null while the field is not being edited
   const [text, setText] = useState<string | null>(null);
   const cancelled = useRef(false);

   return (
      <input
         {...props}
         aria-label={label}
         className={clsx(ROW_INPUT, className)}
         value={text ?? value}
         onBlur={(event) => {
            const next = event.target.value.trim();
            setText(null);
            if (cancelled.current) cancelled.current = false;
            else if (next !== value) onSave(next);
         }}
         onChange={(event) => setText(event.target.value)}
         onFocus={() => setText(value)}
         onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key !== 'Escape') return;
            cancelled.current = true;
            event.currentTarget.blur();
         }}
      />
   );
};

/* Rows moved by dragging their handle, as on the boards: the row follows the
   pointer, the others make room for it, the scrolling area (the element
   marked data-scroll-area) scrolls near its edges, and Esc puts it back. */

interface Drag {
   from: number; // the dragged row's place
   over: number; // the place it would take
   dy: number; // how far it has moved, px
   height: number;
}

const EDGE = 40; // px from the area's edge where it scrolls
const STEP = 10; // px it scrolls per frame

export const useRowDrag = (onDrop: (from: number, to: number) => void) => {
   const body = useRef<HTMLTableSectionElement>(null);
   const [drag, setDrag] = useState<Drag | null>(null);
   const drop = useRef(onDrop);
   drop.current = onDrop;
   // the end of a drag under way, for when the list leaves the page
   const stop = useRef<(() => void) | null>(null);
   useEffect(() => () => stop.current?.(), []);

   const press = (from: number, event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || !body.current) return;
      event.preventDefault();
      const rows = [...body.current.rows];
      // where each row's middle was when the drag began
      const middles = rows.map((row) => {
         const box = row.getBoundingClientRect();
         return box.top + box.height / 2;
      });
      const own = rows[from].getBoundingClientRect();
      const area = body.current.closest<HTMLElement>('[data-scroll-area]');
      const startY = event.clientY;
      const startScroll = area?.scrollTop ?? 0;
      let pointer = startY;
      let current: Drag = { from, over: from, dy: 0, height: own.height };
      let frame = 0;

      // the row's place from how far it has moved, scrolling counted in
      const place = () => {
         const dy =
            pointer - startY + (area ? area.scrollTop - startScroll : 0);
         const middle = own.top + own.height / 2 + dy;
         const over = middles.filter(
            (other, index) => index !== from && other < middle,
         ).length;
         current = { ...current, dy, over };
         setDrag(current);
      };
      const scroll = () => {
         if (area) {
            const box = area.getBoundingClientRect();
            const before = area.scrollTop;
            if (pointer < box.top + EDGE) area.scrollTop -= STEP;
            if (pointer > box.bottom - EDGE) area.scrollTop += STEP;
            if (area.scrollTop !== before) place();
         }
         frame = requestAnimationFrame(scroll);
      };
      const move = (next: PointerEvent) => {
         pointer = next.clientY;
         place();
      };
      const end = (cancelled: boolean) => {
         window.removeEventListener('pointermove', move);
         window.removeEventListener('pointerup', up);
         window.removeEventListener('keydown', key);
         cancelAnimationFrame(frame);
         document.body.classList.remove('dragging');
         stop.current = null;
         setDrag(null);
         if (!cancelled && current.over !== from)
            drop.current(from, current.over);
      };
      const up = () => end(false);
      const key = (next: KeyboardEvent) => {
         if (next.key === 'Escape') end(true);
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('keydown', key);
      document.body.classList.add('dragging');
      frame = requestAnimationFrame(scroll);
      stop.current = () => end(true);
   };

   // where a row is drawn while another is dragged: the dragged one under
   // the pointer, the ones it passed moved aside by its height
   const rowStyle = (index: number): CSSProperties | undefined => {
      if (!drag) return undefined;
      const { from, over, dy, height } = drag;
      if (index === from) return { transform: `translateY(${dy}px)` };
      const shift =
         from < over && index > from && index <= over
            ? -height
            : from > over && index >= over && index < from
              ? height
              : 0;
      return {
         transform: `translateY(${shift}px)`,
         transition: 'transform 160ms ease',
      };
   };

   return { body, dragged: drag?.from ?? null, press, rowStyle };
};

// What a row needs from the drag: its handle, where it is drawn, whether it
// is the one dragged.
export interface RowDragProps {
   handle: ReactNode; // none for whoever only reads the list
   style?: CSSProperties;
   dragged: boolean;
}

// The row being dragged: lifted above the others.
export const DRAGGED_ROW = 'relative z-10 shadow-raised [&>td]:bg-white';

/* The rows in the order shown: a move shows at once and is saved in its
   turn; once every move is saved, the store's order takes over. */
export const useRowOrder = <T,>(
   items: T[],
   idOf: (item: T) => string,
   save: (id: string, to: number) => Promise<unknown>,
) => {
   const queue = useSaveQueue();
   const [order, setOrder] = useState<string[] | null>(null);
   const pending = useRef(0);
   const rows = order
      ? [
           ...order.flatMap((id) => items.filter((item) => idOf(item) === id)),
           ...items.filter((item) => !order.includes(idOf(item))),
        ]
      : items;

   const move = (from: number, to: number) => {
      const ids = rows.map(idOf);
      const [id] = ids.splice(from, 1);
      ids.splice(to, 0, id);
      setOrder(ids);
      pending.current += 1;
      void queue(() => save(id, to)).then(() => {
         pending.current -= 1;
         if (!pending.current) setOrder(null);
      });
   };

   return { rows, move };
};

interface RowHandleProps {
   name: string;
   index: number;
   count: number;
   onPress: (event: ReactPointerEvent<HTMLElement>) => void;
   onMove: (from: number, to: number) => void; // ↑ and ↓ from the keyboard
}

// The handle a row is dragged by; ↑ and ↓ move it one place too.
export const RowHandle = ({
   name,
   index,
   count,
   onPress,
   onMove,
}: RowHandleProps) => {
   const { t } = useTranslation('settings');

   return (
      <button
         type='button'
         aria-label={t('Переместить: {{name}}', { name })}
         className='text-ink-faint hover:bg-hover hover:text-ink grid h-7 w-5 cursor-grab touch-none place-items-center rounded-md transition-colors active:cursor-grabbing'
         title={t('Перетащите, чтобы изменить порядок')}
         onKeyDown={(event) => {
            const to =
               event.key === 'ArrowUp'
                  ? index - 1
                  : event.key === 'ArrowDown'
                    ? index + 1
                    : -1;
            if (to < 0 || to > count - 1) return;
            event.preventDefault();
            onMove(index, to);
         }}
         onPointerDown={onPress}
      >
         <GripVertical aria-hidden className='size-4' />
      </button>
   );
};

interface RowDeleteProps {
   name: string;
   locked?: string; // why the row is not deleted: a lock instead of the bin
   onDelete: () => void; // asks first
}

export const RowDelete = ({ name, locked, onDelete }: RowDeleteProps) => {
   const { t } = useTranslation('settings');

   if (locked)
      return (
         <span
            role='img'
            aria-label={locked}
            className='text-ink-faint grid size-7 place-items-center'
            title={locked}
         >
            <Lock aria-hidden className='size-3.5' />
         </span>
      );
   return (
      <button
         type='button'
         aria-label={t('Удалить: {{name}}', { name })}
         className='text-ink-soft hover:bg-hover hover:text-danger grid size-7 place-items-center rounded-md transition-colors'
         title={t('Удалить')}
         onClick={onDelete}
      >
         <Trash2 aria-hidden className='size-3.5' />
      </button>
   );
};

interface DictCardProps {
   head: ReactNode; // the header cells
   body?: RefObject<HTMLTableSectionElement | null>; // useRowDrag's
   className?: string; // the table's min-width, so it scrolls on narrow screens
   editable: boolean;
   addLabel: string;
   onAdd: () => void;
   note: string; // beside «Добавить»
   extra?: ReactNode; // a line between the rows and the foot
   children: ReactNode; // the rows
}

export const DictCard = ({
   head,
   body,
   className,
   editable,
   addLabel,
   onAdd,
   note,
   extra,
   children,
}: DictCardProps) => (
   <Card>
      <div className='overflow-x-auto'>
         {/* the lines belong to the cells, so a dragged row takes its own */}
         <table
            className={clsx(
               'w-full table-fixed border-separate border-spacing-0 text-sm',
               className,
            )}
         >
            <thead>
               <tr className='[&>th]:border-line [&>th]:border-b'>{head}</tr>
            </thead>
            <tbody
               ref={body}
               className='[&>tr+tr>td]:border-line [&>tr+tr>td]:border-t'
            >
               {children}
            </tbody>
         </table>
      </div>
      {extra}
      <div className='border-line text-ink-soft flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4.5 py-2 text-xs'>
         {editable && (
            <Button size='sm' variant='ghost' onClick={onAdd}>
               <Plus aria-hidden />
               {addLabel}
            </Button>
         )}
         <span className='max-w-[72ch]'>{note}</span>
      </div>
   </Card>
);

/* A row's changes, shown at once and saved one after another. Each save
   writes the row as the store has it now with every change made here
   (`persist`), so a quick second change builds on the first; the changes
   are let go once every save has settled — the store has them by then, or a
   failure said so and the row shows what is saved. */
export const useRowDraft = <T,>(
   persist: (draft: Partial<T>) => Promise<unknown>,
) => {
   const save = useSaveQueue();
   const [draft, setDraft] = useState<Partial<T>>({});
   const latest = useRef<Partial<T>>({});
   const pending = useRef(0);
   const write = useRef(persist);
   write.current = persist;

   // `work` saves in its turn; the note after it says it did
   const run = (work: () => Promise<unknown>, success: string) => {
      pending.current += 1;
      void save(work, success).then(() => {
         pending.current -= 1;
         if (pending.current) return;
         latest.current = {};
         setDraft({});
      });
   };

   // a change shown now, saved by the next persist
   const add = (next: Partial<T>) => {
      latest.current = { ...latest.current, ...next };
      setDraft(latest.current);
   };

   return {
      draft,
      add,
      run,
      persist: () => write.current(latest.current),
      change: (next: Partial<T>, success: string) => {
         add(next);
         run(() => write.current(latest.current), success);
      },
   };
};

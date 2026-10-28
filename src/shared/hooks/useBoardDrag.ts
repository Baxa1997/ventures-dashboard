import {
   type PointerEvent as ReactPointerEvent,
   useEffect,
   useRef,
   useState,
} from 'react';

// Where a carried card would drop: a column, and its place among the cards.
export interface BoardPlace {
   column: string;
   index: number;
}

// A card being carried: its size, where the pointer holds it, where the
// pointer is, and where it would drop.
export interface Carried<T> {
   item: T;
   width: number;
   height: number;
   dx: number;
   dy: number;
   x: number;
   y: number;
   over: BoardPlace | null;
}

const DRAG_FROM = 5; // px the pointer moves before a press becomes a drag
const EDGE = 56; // px from an edge where the board and the page scroll
const STEP = 14; // px they scroll per frame

/* Cards carried across a board as on a Notion board. The board is the
   element the ref goes on; its columns carry data-column (their id) and
   their cards data-card. A press that moves becomes a drag: the card lifts
   and follows the pointer, and the place under the pointer is where it
   would drop. Near an edge the board scrolls sideways and the page up or
   down. Esc puts it back. A mouse or a pen carries cards; a finger scrolls. */
const useBoardDrag = <T>(onDrop: (item: T, place: BoardPlace) => void) => {
   const board = useRef<HTMLDivElement>(null);
   const [carried, setCarried] = useState<Carried<T> | null>(null);
   // a press that ended a drag is not a click on the card
   const dropped = useRef(false);
   // the end of a drag under way, for when the board leaves the page
   const stop = useRef<(() => void) | null>(null);
   const drop = useRef(onDrop);
   drop.current = onDrop;
   useEffect(() => () => stop.current?.(), []);

   // the column under the pointer, and the place among its cards
   const placeAt = (x: number, y: number): BoardPlace | null => {
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
         column: column.dataset.column ?? '',
         index: index < 0 ? cards.length : index,
      };
   };

   const press = (item: T, event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || event.pointerType === 'touch') return;
      const box = event.currentTarget.getBoundingClientRect();
      const start = { x: event.clientX, y: event.clientY };
      let current: Carried<T> | null = null;
      let pointer = start;
      let frame = 0;

      // what is under the pointer changes as things scroll, and so does
      // the drop place
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
            const far = Math.hypot(pointer.x - start.x, pointer.y - start.y);
            if (far < DRAG_FROM) return;
            current = {
               item,
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
            if (!cancelled && current.over)
               drop.current(current.item, current.over);
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

   return {
      board,
      carried,
      press,
      // a click right after a drop does not open the card
      clickable: () => !dropped.current,
   };
};

export default useBoardDrag;

import {
   type FocusEvent,
   type PointerEvent,
   useCallback,
   useRef,
   useState,
} from 'react';

export interface TooltipRow {
   color: string; // the mark's colour, beside its value
   value: string;
   label?: string; // what the value is, when there are several
}

interface Hover<T> {
   item: T;
   x: number; // in the chart's box
   y: number;
   width: number; // the box's width, to keep the note inside it
}

/* Which mark of a chart the pointer (or the keyboard) is on, and where: the
   chart's box takes `box`; each mark takes `track(item)` for the pointer
   and `focus(item)` for the keyboard, and `leave` when it is left. */
export const useChartHover = <T,>() => {
   const box = useRef<HTMLDivElement>(null);
   const [hover, setHover] = useState<Hover<T> | null>(null);

   const place = useCallback((item: T, x: number, y: number) => {
      const rect = box.current?.getBoundingClientRect();
      if (!rect) return;
      setHover({
         item,
         x: x - rect.left,
         y: y - rect.top,
         width: rect.width,
      });
   }, []);

   const track = (item: T) => (event: PointerEvent) =>
      place(item, event.clientX, event.clientY);
   // from the keyboard the note stands at the mark's middle
   const focus = (item: T) => (event: FocusEvent<Element>) => {
      const mark = event.currentTarget.getBoundingClientRect();
      place(item, mark.left + mark.width / 2, mark.top + mark.height / 2);
   };
   const leave = () => setHover(null);

   return { box, hover, track, focus, leave };
};

interface ChartTooltipProps {
   x: number;
   y: number;
   width: number;
   title: string;
   rows: TooltipRow[];
}

/* The note a chart shows over the mark under the pointer: what it is, and
   its value beside its colour. It stays inside the chart: past the box's
   middle it opens to the pointer's left. The values are also in the
   chart's text for screen readers, so the note itself is hidden from
   them. */
const ChartTooltip = ({ x, y, width, title, rows }: ChartTooltipProps) => {
   const shift = x > width * 0.6 ? 'calc(-100% - 14px)' : '14px';
   return (
      <div
         aria-hidden
         className='border-line shadow-raised pointer-events-none absolute z-10 rounded-lg border bg-white px-2.5 py-1.5 text-xs whitespace-nowrap'
         style={{ left: x, top: y, transform: `translate(${shift}, -50%)` }}
      >
         <div className='text-ink-soft'>{title}</div>
         {rows.map((row) => (
            <div
               key={`${row.label ?? ''}${row.value}`}
               className='text-ink mt-0.5 flex items-center gap-1.5 font-semibold tabular-nums'
            >
               <span
                  className='size-2.5 shrink-0 rounded-sm'
                  style={{ background: row.color }}
               />
               {row.label && (
                  <span className='text-ink-soft font-normal'>{row.label}</span>
               )}
               {row.value}
            </div>
         ))}
      </div>
   );
};

export default ChartTooltip;

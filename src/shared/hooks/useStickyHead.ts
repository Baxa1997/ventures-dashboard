import { type RefObject, useEffect } from 'react';

const SCROLLS = /auto|scroll|overlay/;

// --sticky-top (tailwind.css) in pixels: where column names stop
const stickyTop = (node: HTMLElement) => {
   const value = getComputedStyle(node).getPropertyValue('--sticky-top').trim();
   const size = parseFloat(value) || 0;
   return value.endsWith('rem')
      ? size * parseFloat(getComputedStyle(document.documentElement).fontSize)
      : size;
};

// The top of the box the table scrolls in: a window's body, a section's own
// scrolling pane, or the page under its header.
const edgeOf = (box: HTMLElement) => {
   for (
      let node = box.parentElement;
      node && node !== document.body;
      node = node.parentElement
   ) {
      if (node instanceof HTMLDialogElement)
         return node.getBoundingClientRect().top;
      if (
         SCROLLS.test(getComputedStyle(node).overflowY) &&
         node.scrollHeight > node.clientHeight
      )
         return node.getBoundingClientRect().top + node.clientTop;
   }
   return stickyTop(box);
};

/* Keeps a table's column names in view while its rows scroll past. CSS does
   it (.sticky-head in tailwind.css) while the table fits its card. A table
   wider than its card scrolls sideways in its own box (marked data-wide
   here), which CSS stickiness cannot see past; then this moves the names
   along itself. A table inside another table's row keeps its names in
   place, under the outer table's. The box is the table's parent. */
const useStickyHead = (table: RefObject<HTMLTableElement | null>) => {
   useEffect(() => {
      const grid = table.current;
      const box = grid?.parentElement;
      if (!grid || !box) return;
      const nested = !!box.closest('td');
      let wide = false;
      let frame = 0;

      const place = () => {
         frame = 0;
         const head = grid.tHead;
         if (!head) return;
         let shift = 0;
         if (wide && !nested) {
            const rect = grid.getBoundingClientRect();
            shift = Math.min(
               Math.max(0, edgeOf(box) - rect.top),
               Math.max(0, rect.height - head.offsetHeight),
            );
         }
         head.style.transform = shift ? `translateY(${shift}px)` : '';
      };
      const schedule = () => {
         if (!frame) frame = requestAnimationFrame(place);
      };
      const measure = () => {
         const next = grid.offsetWidth > box.clientWidth + 1;
         if (next !== wide) {
            wide = next;
            box.toggleAttribute('data-wide', wide);
         }
         schedule();
      };

      const observer = new ResizeObserver(measure);
      observer.observe(box);
      observer.observe(grid);
      observer.observe(document.body); // something above it grew or shrank
      const options = { capture: true, passive: true };
      document.addEventListener('scroll', schedule, options);
      return () => {
         observer.disconnect();
         document.removeEventListener('scroll', schedule, options);
         cancelAnimationFrame(frame);
         box.removeAttribute('data-wide');
         if (grid.tHead) grid.tHead.style.transform = '';
      };
   }, [table]);
};

export default useStickyHead;

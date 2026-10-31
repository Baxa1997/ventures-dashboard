import { useEffect, useId, useRef } from 'react';

const WAIT = 350; // ms the pointer rests on a button before its note shows
const AGAIN = 300; // ms after a note in which the next one shows at once
const GAP = 6; // between the button and the note
const EDGE = 8; // kept from the window's edges

const holderOf = (node: EventTarget | null) =>
   node instanceof Element ? node.closest<HTMLElement>('[data-hint]') : null;

/* What a button does, in a note beside it when the pointer rests on it or the
   keyboard reaches it. A button says it in data-hint (Button's `hint`); this,
   mounted once, finds it. The note is a popover, so it is in the browser's top
   layer: shown again each time, it is over an open dialog too. It goes when
   the button is pressed and when the page moves, and touch screens do not
   get it. */
const Hints = () => {
   const id = useId();
   const ref = useRef<HTMLDivElement>(null);

   useEffect(() => {
      const note = ref.current;
      if (!note || typeof note.showPopover !== 'function') return;
      let target: HTMLElement | null = null; // whom the note is for
      let pressed: HTMLElement | null = null; // no note until the pointer leaves
      let timer = 0;
      let closedAt = 0;

      const hide = () => {
         window.clearTimeout(timer);
         target?.removeAttribute('aria-describedby');
         target = null;
         if (!note.matches(':popover-open')) return;
         note.hidePopover();
         closedAt = Date.now();
      };

      const show = () => {
         if (!target?.isConnected) {
            hide();
            return;
         }
         note.textContent = target.dataset.hint ?? '';
         note.showPopover();
         const box = target.getBoundingClientRect();
         const { offsetWidth: width, offsetHeight: height } = note;
         // under the button, or above it when there is no room
         const top =
            box.bottom + GAP + height <= innerHeight - EDGE
               ? box.bottom + GAP
               : box.top - GAP - height;
         const left = box.left + box.width / 2 - width / 2;
         note.style.top = `${Math.max(EDGE, top)}px`;
         note.style.left = `${Math.max(EDGE, Math.min(left, innerWidth - EDGE - width))}px`;
         target.setAttribute('aria-describedby', id);
      };

      const aim = (next: HTMLElement | null) => {
         if (next === target) return;
         hide();
         if (!next?.dataset.hint) return;
         target = next;
         timer = window.setTimeout(
            show,
            Date.now() - closedAt < AGAIN ? 0 : WAIT,
         );
      };

      const onOver = (event: PointerEvent) => {
         if (event.pointerType === 'touch') return;
         // a card or a row being carried passes over others in silence
         if (event.buttons) {
            hide();
            return;
         }
         const over = holderOf(event.target);
         if (over !== pressed) pressed = null;
         aim(pressed ? null : over);
      };
      const onOut = (event: PointerEvent) => {
         if (!event.relatedTarget) hide(); // out of the window
      };
      const onDown = (event: PointerEvent) => {
         pressed = holderOf(event.target);
         hide();
      };
      const onFocus = (event: FocusEvent) => {
         if (event.target instanceof Element)
            if (event.target.matches(':focus-visible'))
               aim(holderOf(event.target));
      };

      document.addEventListener('pointerover', onOver);
      document.addEventListener('pointerout', onOut);
      document.addEventListener('pointerdown', onDown, true);
      document.addEventListener('focusin', onFocus);
      document.addEventListener('focusout', hide);
      document.addEventListener('keydown', hide, true);
      addEventListener('scroll', hide, true);
      addEventListener('resize', hide);
      addEventListener('blur', hide);
      return () => {
         hide();
         document.removeEventListener('pointerover', onOver);
         document.removeEventListener('pointerout', onOut);
         document.removeEventListener('pointerdown', onDown, true);
         document.removeEventListener('focusin', onFocus);
         document.removeEventListener('focusout', hide);
         document.removeEventListener('keydown', hide, true);
         removeEventListener('scroll', hide, true);
         removeEventListener('resize', hide);
         removeEventListener('blur', hide);
      };
   }, [id]);

   return (
      <div
         ref={ref}
         id={id}
         role='tooltip'
         className='print-hidden bg-navy-deep shadow-popup animate-fade pointer-events-none fixed inset-auto m-0 w-max max-w-72 rounded-md border-0 px-2.5 py-1.5 text-xs leading-4 text-white'
         popover='manual'
      />
   );
};

export default Hints;

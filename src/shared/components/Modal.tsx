import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ModalProps {
   open: boolean;
   title: string;
   subtitle?: ReactNode; // shown under the title
   onClose: () => void;
   children: ReactNode;
}

interface ModalPartProps {
   children: ReactNode;
}

interface ModalFooterProps extends ModalPartProps {
   note?: ReactNode; // short remark at the left, e.g. what happens next
}

/* Built on the native <dialog>, which traps focus and closes on Escape.
   The title stays at the top and the buttons at the bottom; only the content
   between them scrolls. Put the content in ModalBody and the buttons in
   ModalFooter; a form wraps both with the MODAL_FORM class. */
const Modal = ({ open, title, subtitle, onClose, children }: ModalProps) => {
   const { t } = useTranslation('components');
   const ref = useRef<HTMLDialogElement>(null);

   useEffect(() => {
      const dialog = ref.current;
      if (!dialog) return;
      if (open && !dialog.open) {
         dialog.showModal();
         // showModal focuses the close button; move to the marked field if any
         dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
      }
      if (!open && dialog.open) dialog.close();
   }, [open]);

   return (
      <dialog
         ref={ref}
         aria-labelledby='modal-title'
         className='border-line text-ink shadow-popup backdrop:bg-navy/50 m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border bg-white p-0 open:flex'
         onClose={onClose}
         onClick={(event) => {
            if (event.target === ref.current) onClose();
         }}
      >
         <header className='border-line flex shrink-0 items-start justify-between gap-3 border-b px-5 py-3.5'>
            <div className='min-w-0'>
               <h2 id='modal-title' className='text-lg leading-6 font-bold'>
                  {title}
               </h2>
               {subtitle && (
                  <div className='text-ink-soft text-meta mt-1'>{subtitle}</div>
               )}
            </div>
            <button
               type='button'
               aria-label={t('Закрыть')}
               className='text-ink-soft hover:bg-ground -mr-1.5 grid size-8 place-items-center rounded-lg'
               onClick={onClose}
            >
               <X aria-hidden className='size-4' />
            </button>
         </header>
         {children}
      </dialog>
   );
};

// For the <form> (or other wrapper) that holds a ModalBody and a ModalFooter.
export const MODAL_FORM = 'flex min-h-0 flex-auto flex-col';

// The scrolling part of a modal.
export const ModalBody = ({ children }: ModalPartProps) => (
   <div className='min-h-0 flex-auto overflow-y-auto p-5'>{children}</div>
);

// The buttons of a modal; always in view.
export const ModalFooter = ({ note, children }: ModalFooterProps) => (
   <div className='border-line bg-ground flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t px-5 py-3.5'>
      {note && (
         <span className='text-ink-soft mr-auto text-xs'>{note}</span>
      )}
      {children}
   </div>
);

export default Modal;

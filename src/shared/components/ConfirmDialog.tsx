import useAction from '@shared/hooks/useAction';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import Modal, { ModalBody, ModalFooter } from './Modal';

interface ConfirmDialogProps {
   open: boolean;
   title: string; // the question: «Удалить запрос?»
   subtitle?: ReactNode; // whose it is: the deal, the meeting
   children?: ReactNode; // what deleting does, or a choice to make first
   confirmLabel?: string; // «Удалить» unless given
   success?: string; // the note after it: «Удалено» unless given
   error?: string; // the note when it fails: «Не удалось удалить» unless given
   note?: ReactNode; // at the left of the buttons
   disabled?: boolean; // not yet: a count still loading, a choice missing
   onConfirm: () => Promise<unknown> | unknown;
   onClose: () => void;
}

const ConfirmBody = ({
   children,
   confirmLabel,
   success,
   error,
   note,
   disabled = false,
   onConfirm,
   onClose,
}: Omit<ConfirmDialogProps, 'open' | 'title' | 'subtitle'>) => {
   const { t } = useTranslation('components');
   const confirm = useAction(onConfirm, { kind: 'delete', success, error });

   return (
      <>
         {children && (
            <ModalBody>
               <div className='text-meta grid gap-4'>{children}</div>
            </ModalBody>
         )}
         <ModalFooter note={note}>
            {/* the safe answer is the one under the cursor */}
            <Button
               data-autofocus
               disabled={confirm.pending}
               variant='text'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               disabled={disabled}
               loading={confirm.pending}
               variant='danger'
               onClick={async () => {
                  if (await confirm.run()) onClose();
               }}
            >
               {confirmLabel ?? t('Удалить')}
            </Button>
         </ModalFooter>
      </>
   );
};

/* Asks before something is deleted or taken off: what goes, what happens to
   what depends on it, and a choice to make first when there is one. The
   button stays off while `disabled` and spins while the request runs; a note
   says how it went, and a failure keeps the dialog open to try again. */
const ConfirmDialog = ({
   open,
   title,
   subtitle,
   onClose,
   ...props
}: ConfirmDialogProps) => (
   <Modal open={open} subtitle={subtitle} title={title} onClose={onClose}>
      {open && <ConfirmBody {...props} onClose={onClose} />}
   </Modal>
);

export default ConfirmDialog;

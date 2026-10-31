import { categoryLimit } from '@modules/Procurement/helpers';
import procurement from '@modules/Procurement/services';
import { listName } from '@modules/Settings/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { formatUsd } from '@shared/helpers';
import { useCurrentUser, useRequest } from '@shared/hooks';
import type { Procurement } from '@shared/types/procurement.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ApproveDialogProps {
   request: Procurement | null; // null: closed
   onClose: () => void;
}

// The approver's decision on a request over its category's limit: on to the
// next stage, or back to whoever asked for it, with a word on why.
const ApproveDialog = ({ request, onClose }: ApproveDialogProps) => {
   const { t, i18n } = useTranslation('procurement');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const user = useCurrentUser();
   const [note, setNote] = useState('');
   const approving = useRequest({ success: t('Закупка согласована') });
   const returning = useRequest({ success: t('Закупка возвращена инициатору') });

   const close = () => {
      setNote('');
      onClose();
   };

   const approve = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!request) return;
      const done = await approving.run(() =>
         procurement.approve(request.id, user.id, note.trim()),
      );
      if (done) close();
   };

   const sendBack = async () => {
      if (!request) return;
      const done = await returning.run(() =>
         procurement.sendBack(request.id, note.trim()),
      );
      if (done) close();
   };

   return (
      <Modal
         open={request !== null}
         title={t('Согласование закупки')}
         onClose={close}
      >
         {request && (
            <form className={MODAL_FORM} onSubmit={approve}>
               <ModalBody>
                  <div className='text-meta grid gap-3'>
                     <p>
                        <b>{request.title}</b> ·{' '}
                        {formatUsd(request.amount, language)}
                     </p>
                     <p className='text-ink-soft'>
                        {t(
                           'Сумма выше лимита категории «{{category}}» ({{limit}}). Без вашего решения закупка не перейдёт на следующий этап.',
                           {
                              category: listName(
                                 'procCategories',
                                 request.category,
                              ),
                              limit: formatUsd(
                                 categoryLimit(request.category),
                                 language,
                              ),
                           },
                        )}
                     </p>
                     <Field label={t('Комментарий')}>
                        <textarea
                           data-autofocus
                           className='field-input min-h-24'
                           placeholder={t('Необязательно')}
                           value={note}
                           onChange={(event) => setNote(event.target.value)}
                        />
                     </Field>
                  </div>
               </ModalBody>
               <ModalFooter
                  note={
                     <Button
                        loading={returning.pending}
                        variant='danger'
                        onClick={sendBack}
                     >
                        {t('Вернуть инициатору')}
                     </Button>
                  }
               >
                  <Button variant='ghost' onClick={close}>
                     {t('Отмена')}
                  </Button>
                  <Button loading={approving.pending} type='submit'>
                     {t('Согласовать')}
                  </Button>
               </ModalFooter>
            </form>
         )}
      </Modal>
   );
};

export default ApproveDialog;

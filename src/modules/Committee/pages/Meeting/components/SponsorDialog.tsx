import committee from '@modules/Committee/services';
import {
   Button,
   ChoiceCards,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { personName } from '@shared/helpers';
import { useRequest } from '@shared/hooks';
import type { AgendaItem } from '@shared/types/committee.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SponsorDialogProps {
   meetingId: string;
   item: AgendaItem | null; // null — closed
   sponsorId: string;
   onClose: () => void;
}

type Choice = 'sponsor_approved' | 'rejected';

/* With one vote against, the question goes to the deal's sponsor. The
   secretary records what the sponsor decided; a refusal needs a reason. */
const SponsorDialog = ({
   meetingId,
   item,
   sponsorId,
   onClose,
}: SponsorDialogProps) => {
   const { t } = useTranslation('committee');
   const [choice, setChoice] = useState<Choice | null>(null);
   const [note, setNote] = useState('');
   const [error, setError] = useState('');
   const deciding = useRequest({
      success: t('Решение спонсора зафиксировано'),
   });

   const close = () => {
      setChoice(null);
      setNote('');
      setError('');
      onClose();
   };

   const submit = async () => {
      if (!item || !choice) return;
      if (choice === 'rejected' && !note.trim()) {
         setError(t('Напишите, почему спонсор отказал'));
         return;
      }
      if (
         await deciding.run(() =>
            committee.decide(meetingId, item.id, choice, note.trim()),
         )
      )
         close();
   };

   return (
      <Modal
         open={item !== null}
         subtitle={t(
            'Спонсор сделки — {{name}}. При одном голосе «против» решение принимает он.',
            {
               name: personName(sponsorId),
            },
         )}
         title={t('Решение спонсора: {{title}}', { title: item?.title ?? '' })}
         onClose={close}
      >
         <form
            className={MODAL_FORM}
            onSubmit={(event) => {
               event.preventDefault();
               submit();
            }}
         >
            <ModalBody>
               <ChoiceCards
                  label={t('Решение спонсора')}
                  name='sponsor-choice'
                  options={[
                     {
                        value: 'sponsor_approved',
                        label: t('Продолжить сделку'),
                        note: t('на условиях из протокола'),
                     },
                     {
                        value: 'rejected',
                        label: t('Отказать'),
                        note: t('сделка закрывается с причиной'),
                     },
                  ]}
                  value={choice}
                  onChange={(value) => {
                     setChoice(value);
                     setError('');
                  }}
               />
               <Field
                  className='mt-4'
                  error={error}
                  label={t('Комментарий спонсора')}
               >
                  <textarea
                     aria-invalid={!!error}
                     className='field-input min-h-20'
                     value={note}
                     onChange={(event) => {
                        setNote(event.target.value);
                        setError('');
                     }}
                  />
               </Field>
            </ModalBody>
            <ModalFooter
               note={t('Решение уйдёт в протокол, реестр и карточку сделки')}
            >
               <Button variant='ghost' onClick={close}>
                  {t('Отмена')}
               </Button>
               <Button
                  disabled={!choice}
                  loading={deciding.pending}
                  type='submit'
               >
                  {t('Зафиксировать')}
               </Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default SponsorDialog;

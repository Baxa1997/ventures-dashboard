import { stageName } from '@modules/Settings/services';
import DealPicker from '@modules/Committee/components/DealPicker';
import { meetingName, waitingDeals } from '@modules/Committee/helpers';
import type { CommitteeData } from '@modules/Committee/hooks';
import committee from '@modules/Committee/services';
import {
   Button,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import type { Meeting } from '@shared/types/committee.types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRequest } from '@shared/hooks';

interface AgendaDialogProps {
   data: CommitteeData;
   meeting: Meeting;
   open: boolean;
   onClose: () => void;
}

// Adds deals to the agenda of a meeting that has not opened yet: the deals on
// the meeting's stage that no other planned meeting has on its agenda.
const AgendaDialog = ({ data, meeting, open, onClose }: AgendaDialogProps) => {
   const { t } = useTranslation('committee');
   const [dealIds, setDealIds] = useState<string[]>([]);
   const saving = useRequest({
      kind: 'create',
      success: t('Добавлено в повестку'),
   });
   const waiting = waitingDeals(
      data.meetings,
      data.deals,
      meeting.body,
      meeting.stage,
   );
   const stage =
      meeting.body === 'board'
         ? t('Наблюдательный совет')
         : meeting.stage && stageName(meeting.stage);

   useEffect(() => {
      if (open) setDealIds([]);
   }, [open]);

   const submit = async () => {
      if (
         await saving.run(async () => {
            await committee.addToAgenda(meeting.id, dealIds);
         })
      )
         onClose();
   };

   return (
      <Modal
         open={open}
         subtitle={meetingName(t, meeting)}
         title={t('Добавить в повестку')}
         onClose={onClose}
      >
         <form
            className={MODAL_FORM}
            onSubmit={(event) => {
               event.preventDefault();
               void submit();
            }}
         >
            <ModalBody>
               {waiting.length ? (
                  <DealPicker
                     deals={waiting}
                     value={dealIds}
                     onChange={setDealIds}
                  />
               ) : (
                  <p className='text-ink-soft'>
                     {t('Сделок, которые ждут этого заседания, сейчас нет.')}
                  </p>
               )}
               <p className='text-ink-soft mt-4 text-xs'>
                  {t(
                     'Сюда попадают сделки на стадии «{{stage}}», которых нет в повестке другого заседания.',
                     { stage },
                  )}
               </p>
            </ModalBody>
            <ModalFooter>
               <Button variant='ghost' onClick={onClose}>
                  {t('Отмена')}
               </Button>
               <Button
                  disabled={!dealIds.length}
                  loading={saving.pending}
                  type='submit'
               >
                  {t('Добавить')}
               </Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default AgendaDialog;

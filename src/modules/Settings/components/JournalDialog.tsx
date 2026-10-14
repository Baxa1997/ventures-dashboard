import {
   Button,
   Modal,
   ModalBody,
   ModalFooter,
   NoData,
} from '@shared/components';
import { formatDayYear, personName } from '@shared/helpers';
import type { SettingsState } from '@shared/types/settings.types';
import { useTranslation } from 'react-i18next';

interface JournalDialogProps {
   data: SettingsState;
   open: boolean;
   onClose: () => void;
}

// Every change of the rules: who, when, what it was and what it became.
const JournalDialog = ({ data, open, onClose }: JournalDialogProps) => {
   const { t } = useTranslation('settings');

   return (
      <Modal open={open} title={t('Журнал изменений')} onClose={onClose}>
         <ModalBody>
            {data.journal.length ? (
               <ol className='divide-line divide-y'>
                  {data.journal.map((change) => (
                     <li key={change.id} className='py-3'>
                        <div className='text-ink-soft text-xs'>
                           {formatDayYear(change.date)} ·{' '}
                           {personName(change.userId)}
                        </div>
                        <div className='mt-0.5 font-medium'>{change.field}</div>
                        <div className='mt-0.5'>
                           <span className='text-ink-soft line-through'>
                              {change.from || '—'}
                           </span>
                           {' → '}
                           {change.to || '—'}
                        </div>
                     </li>
                  ))}
               </ol>
            ) : (
               <NoData>{t('Правила ещё не менялись')}</NoData>
            )}
         </ModalBody>
         <ModalFooter>
            <Button variant='ghost' onClick={onClose}>
               {t('Закрыть')}
            </Button>
         </ModalFooter>
      </Modal>
   );
};

export default JournalDialog;

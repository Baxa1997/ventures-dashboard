import { STATUSES } from '@modules/Correspondence/constants';
import correspondence from '@modules/Correspondence/services';
import { letterDate, letterNumber } from '@modules/Correspondence/helpers';
import {
   Badge,
   Button,
   FactList,
   Field,
   Modal,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { DIRECTOR_ID } from '@shared/constants';
import { formatDate, personName } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { Letter } from '@shared/types/correspondence.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface LetterDialogProps {
   letter: Letter | null; // null — closed
   onClose: () => void;
}

/* A letter and its next step: the director signs a draft out with its
   number, an incoming letter is taken into work and closed. A letter without
   a number, an answer date or an owner cannot be closed. */
const LetterDialog = ({ letter, onClose }: LetterDialogProps) => {
   const { t } = useTranslation('correspondence');
   const user = useCurrentUser();
   const [number, setNumber] = useState('');
   const [error, setError] = useState('');

   const close = () => {
      setNumber('');
      setError('');
      onClose();
   };

   if (!letter)
      return (
         <Modal open={false} title='' onClose={close}>
            {null}
         </Modal>
      );

   const missing = [
      !letter.number && t('номер'),
      letter.direction === 'in' && !letter.replyDue && t('срок ответа'),
      !letter.ownerId && t('ответственный'),
   ].filter(Boolean);

   const sign = async () => {
      if (!number.trim()) {
         setError(t('Укажите исходящий номер'));
         return;
      }
      await correspondence.send(letter.id, number.trim());
      close();
   };

   return (
      <Modal
         open
         subtitle={letter.party}
         title={letterNumber(t, letter)}
         onClose={close}
      >
         <ModalBody>
            <p className='font-medium'>{letter.subject}</p>
            <FactList
               className='mt-3'
               labelWidth='9rem'
               rows={[
                  { label: t('Дата'), value: letterDate(t, letter) },
                  {
                     label: t('Статус'),
                     value: (
                        <Badge tone={STATUSES[letter.status].tone}>
                           {t(STATUSES[letter.status].label)}
                        </Badge>
                     ),
                  },
                  { label: t('Связано с'), value: letter.link.label },
                  {
                     label: t('Ответственный'),
                     value: personName(letter.ownerId) || '—',
                  },
                  {
                     label: t('Срок ответа'),
                     value: letter.replyDue ? formatDate(letter.replyDue) : '—',
                  },
               ]}
            />
            {letter.status === 'signing' && (
               <Field
                  className='mt-4'
                  error={error}
                  label={t('Исходящий номер')}
               >
                  <input
                     aria-invalid={!!error}
                     className='field-input'
                     placeholder={t('например, № 52')}
                     value={number}
                     onChange={(event) => {
                        setNumber(event.target.value);
                        setError('');
                     }}
                  />
               </Field>
            )}
         </ModalBody>
         <ModalFooter
            note={
               letter.status !== 'closed' &&
               letter.status !== 'signing' &&
               missing.length > 0 &&
               t('Чтобы закрыть, нужны: {{fields}}', {
                  fields: missing.join(', '),
               })
            }
         >
            <Button variant='ghost' onClick={close}>
               {t('Закрыть окно')}
            </Button>
            {letter.status === 'signing' && (
               <Button
                  disabled={user.id !== DIRECTOR_ID}
                  title={
                     user.id === DIRECTOR_ID
                        ? undefined
                        : t('Подписывает директор')
                  }
                  onClick={sign}
               >
                  {t('Подписано, отправить')}
               </Button>
            )}
            {letter.status === 'awaiting_fund' && (
               <Button onClick={() => correspondence.takeInWork(letter.id)}>
                  {t('Взять в работу')}
               </Button>
            )}
            {(letter.status === 'in_work' ||
               letter.status === 'awaiting_reply') && (
               <Button
                  disabled={missing.length > 0}
                  onClick={async () => {
                     await correspondence.close(letter.id);
                     close();
                  }}
               >
                  {t('Закрыть письмо')}
               </Button>
            )}
         </ModalFooter>
      </Modal>
   );
};

export default LetterDialog;

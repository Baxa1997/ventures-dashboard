import work from '@modules/Work/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { addWorkingDays, personName, todayISO } from '@shared/helpers';
import { useCurrentUser, useRequest } from '@shared/hooks';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface DataRequestDialogProps {
   company: PortfolioCompany;
   open: boolean;
   onClose: () => void;
}

/* Data the fund wants from a company outside the quarterly report. It becomes
   a task for the company's owner, so it shows in Задачи and Мой день. */
const DataRequestDialog = ({
   company,
   open,
   onClose,
}: DataRequestDialogProps) => {
   const { t } = useTranslation('portfolio');
   const user = useCurrentUser();
   const [text, setText] = useState('');
   const [dueDate, setDueDate] = useState(() => addWorkingDays(todayISO(), 5));
   const [error, setError] = useState('');
   const [done, setDone] = useState(false);
   const creating = useRequest({
      kind: 'create',
      success: t('Задача создана'),
   });

   const close = () => {
      setText('');
      setError('');
      setDone(false);
      onClose();
   };

   const submit = async () => {
      if (!text.trim()) {
         setError(t('Напишите, какие данные нужны'));
         return;
      }
      const created = await creating.run(() =>
         work.createTask(
            {
               title: t('Запросить у {{company}}: {{text}}', {
                  company: company.name,
                  text: text.trim(),
               }),
               type: 'portfolio',
               context: company.name,
               details: '',
               relation: 'portfolio',
               relationId: company.id,
               assigneeId: company.ownerId,
               reviewerId: '',
               dueDate,
               priority: 'medium',
               status: 'assigned',
               recurrence: 'none',
               checklist: [],
            },
            user.id,
            { origin: 'data_request' },
         ),
      );
      if (!created) return;
      setDone(true);
   };

   return (
      <Modal
         open={open}
         title={t('Запросить данные у {{company}}', { company: company.name })}
         onClose={close}
      >
         {done ? (
            <>
               <ModalBody>
                  <p>
                     {t('Задача создана и назначена: {{name}}.', {
                        name: personName(company.ownerId),
                     })}{' '}
                     <Link className='link' to='/work/tasks'>
                        {t('Открыть задачи')}
                     </Link>
                  </p>
               </ModalBody>
               <ModalFooter>
                  <Button onClick={close}>{t('Готово')}</Button>
               </ModalFooter>
            </>
         ) : (
            <form
               className={MODAL_FORM}
               onSubmit={(event) => {
                  event.preventDefault();
                  submit();
               }}
            >
               <ModalBody>
                  <Field error={error} label={t('Какие данные нужны')}>
                     <textarea
                        data-autofocus
                        aria-invalid={!!error}
                        className='field-input min-h-24'
                        value={text}
                        onChange={(event) => {
                           setText(event.target.value);
                           setError('');
                        }}
                     />
                  </Field>
                  <Field className='mt-4' label={t('Срок')}>
                     <input
                        className='field-input'
                        type='date'
                        value={dueDate}
                        onChange={(event) => setDueDate(event.target.value)}
                     />
                  </Field>
               </ModalBody>
               <ModalFooter
                  note={t('Задача уйдёт ответственному: {{name}}', {
                     name: personName(company.ownerId),
                  })}
               >
                  <Button variant='ghost' onClick={close}>
                     {t('Отмена')}
                  </Button>
                  <Button loading={creating.pending} type='submit'>
                     {t('Создать задачу')}
                  </Button>
               </ModalFooter>
            </form>
         )}
      </Modal>
   );
};

export default DataRequestDialog;

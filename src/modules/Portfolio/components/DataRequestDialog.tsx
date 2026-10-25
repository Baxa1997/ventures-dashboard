import portfolio from '@modules/Portfolio/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { addWorkingDays, todayISO } from '@shared/helpers';
import { useCurrentUser, useRequest } from '@shared/hooks';
import type {
   CompanyDataRequest,
   PortfolioCompany,
} from '@shared/types/portfolio.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DataRequestDialogProps {
   company: PortfolioCompany;
   open: boolean;
   request?: CompanyDataRequest | null; // changed instead of a new one
   title?: string; // a new request's wording, e.g. «Запросить ещё»
   onClose: () => void;
}

/* Data the fund wants from a company outside the quarterly report. The
   request goes to the company's startup cabinet («Компания» → «Запросы от
   фонда»), which answers it with a text and files; the answer comes back to
   the company's card. */
const DataRequestDialog = (props: DataRequestDialogProps) =>
   props.open ? <DataRequestForm {...props} /> : null;

const DataRequestForm = ({
   company,
   open,
   request,
   title: firstTitle = '',
   onClose,
}: DataRequestDialogProps) => {
   const { t } = useTranslation('portfolio');
   const user = useCurrentUser();
   const [title, setTitle] = useState(request?.title ?? firstTitle);
   const [text, setText] = useState(request?.text ?? '');
   const [dueDate, setDueDate] = useState(
      () => request?.dueDate || addWorkingDays(todayISO(), 5),
   );
   const [error, setError] = useState('');
   const saving = useRequest({
      kind: request ? 'save' : 'send',
      success: request
         ? t('Запрос изменён')
         : t('Запрос отправлен в кабинет компании'),
   });

   const submit = async () => {
      if (!title.trim()) {
         setError(t('Напишите, какие данные нужны'));
         return;
      }
      const input = { title: title.trim(), text: text.trim(), dueDate };
      const done = await saving.run(() =>
         request
            ? portfolio.updateDataRequest(request.id, input)
            : portfolio.addDataRequest(company.id, input, user.id),
      );
      if (done) onClose();
   };

   return (
      <Modal
         open={open}
         subtitle={company.name}
         title={request ? t('Изменить запрос данных') : t('Запросить данные')}
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
               <div className='grid gap-4'>
                  <Field error={error} label={t('Какие данные нужны')}>
                     <input
                        data-autofocus
                        aria-invalid={!!error}
                        className='field-input'
                        maxLength={160}
                        value={title}
                        onChange={(event) => {
                           setTitle(event.target.value);
                           setError('');
                        }}
                     />
                  </Field>
                  <Field label={t('Подробности для компании')}>
                     <textarea
                        className='field-input min-h-24'
                        maxLength={4000}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                     />
                  </Field>
                  <Field label={t('Срок')}>
                     <input
                        className='field-input'
                        type='date'
                        value={dueDate}
                        onChange={(event) => setDueDate(event.target.value)}
                     />
                  </Field>
               </div>
            </ModalBody>
            <ModalFooter
               note={t(
                  'Компания увидит запрос в кабинете основателя и ответит там; файлы для неё можно приложить к запросу.',
               )}
            >
               <Button variant='ghost' onClick={onClose}>
                  {t('Отмена')}
               </Button>
               <Button loading={saving.pending} type='submit'>
                  {request ? t('Сохранить') : t('Отправить запрос')}
               </Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default DataRequestDialog;

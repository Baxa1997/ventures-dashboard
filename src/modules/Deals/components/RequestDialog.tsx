import {
   Button,
   Checkbox,
   Field,
   MODAL_FORM,
   Modal,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { addWorkingDays, todayISO } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COMPANY_MAX, TEXT_MAX } from '../constants';
import deals from '../services';
import { fieldErrors, requestSchema, type ValidationKey } from '../validations';

interface RequestDialogProps {
   deal: Deal | null; // null: the dialog is closed
   title?: string; // what the request starts with, e.g. a document's name
   onClose: () => void;
}

// Working days the applicant gets to answer, unless changed in the form.
const ANSWER_DAYS = 5;

type Errors = Partial<Record<'title' | 'text' | 'dueDate', ValidationKey>>;

const RequestForm = ({
   deal,
   title = '',
   onClose,
}: RequestDialogProps & { deal: Deal }) => {
   const { t } = useTranslation('deals');
   const { t: tValidation } = useTranslation('validation');
   const user = useCurrentUser();
   const [values, setValues] = useState({
      title,
      text: '',
      dueDate: addWorkingDays(todayISO(), ANSWER_DAYS),
   });
   const [questionnaire, setQuestionnaire] = useState(false);
   const [errors, setErrors] = useState<Errors>({});

   const setValue = (key: keyof typeof values, value: string) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
   };

   const errorOf = (key: keyof Errors) => {
      const message = errors[key];
      return message && tValidation(message);
   };

   const toggleQuestionnaire = () => {
      // the questionnaire names the request unless the person already has
      if (!questionnaire && !values.title.trim())
         setValue('title', t('DD-вопросник'));
      setQuestionnaire((prev) => !prev);
   };

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const result = requestSchema.safeParse(values);
      if (!result.success) {
         setErrors(fieldErrors(result.error));
         return;
      }
      await deals.addRequest(
         deal.id,
         { ...result.data, ddQuestionnaire: questionnaire },
         user.id,
      );
      onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={handleSubmit}>
         <ModalBody>
            <div className='grid gap-4'>
               <Field error={errorOf('title')} label={t('Что запросить')}>
                  <input
                     data-autofocus
                     aria-invalid={!!errors.title}
                     className='field-input'
                     maxLength={COMPANY_MAX * 2}
                     value={values.title}
                     onChange={(event) => setValue('title', event.target.value)}
                  />
               </Field>
               <Field
                  error={errorOf('text')}
                  hint={t('Что именно нужно, в каком виде и за какой период')}
                  label={t('Пояснение для заявителя')}
               >
                  <textarea
                     aria-invalid={!!errors.text}
                     className='field-input'
                     maxLength={TEXT_MAX}
                     rows={4}
                     value={values.text}
                     onChange={(event) => setValue('text', event.target.value)}
                  />
               </Field>
               <Field error={errorOf('dueDate')} label={t('Ответить до')}>
                  <input
                     aria-invalid={!!errors.dueDate}
                     className='field-input sm:w-48'
                     type='date'
                     value={values.dueDate}
                     onChange={(event) =>
                        setValue('dueDate', event.target.value)
                     }
                  />
               </Field>
               <div className='text-meta flex items-start gap-2.5'>
                  <Checkbox
                     checked={questionnaire}
                     label={t('Это DD-вопросник по шаблону фонда')}
                     onChange={toggleQuestionnaire}
                  />
                  <span aria-hidden>
                     {t('Это DD-вопросник по шаблону фонда')}
                  </span>
               </div>
            </div>
         </ModalBody>
         <ModalFooter note={t('Часы стадии остановятся до ответа заявителя')}>
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button type='submit'>{t('Отправить запрос')}</Button>
         </ModalFooter>
      </form>
   );
};

// A request for data or documents; it goes to the applicant's cabinet and email.
const RequestDialog = ({ deal, title, onClose }: RequestDialogProps) => {
   const { t } = useTranslation('deals');

   return (
      <Modal
         open={deal !== null}
         subtitle={deal && `${deal.company} · ${deal.number}`}
         title={t('Новый запрос заявителю')}
         onClose={onClose}
      >
         {deal && (
            <RequestForm
               key={`${deal.id}-${title}`}
               deal={deal}
               title={title}
               onClose={onClose}
            />
         )}
      </Modal>
   );
};

export default RequestDialog;

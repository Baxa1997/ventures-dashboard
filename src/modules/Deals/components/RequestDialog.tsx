import {
   Button,
   Checkbox,
   Field,
   MODAL_FORM,
   Modal,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { listOf, nameOf } from '@modules/Settings/services';
import { SETTINGS_PATH } from '@shared/constants';
import { addWorkingDays, todayISO } from '@shared/helpers';
import { useAction, useCurrentUser } from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
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
   // the templates from Настройки that go with the request, by key
   const templates = listOf('docTemplates').filter((item) => item.file);
   const [chosen, setChosen] = useState<string[]>([]);
   const toggleTemplate = (key: string) =>
      setChosen((prev) =>
         prev.includes(key)
            ? prev.filter((item) => item !== key)
            : [...prev, key],
      );

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

   const sending = useAction(
      (data: Omit<Parameters<typeof deals.addRequest>[1], 'ddQuestionnaire'>) =>
         deals.addRequest(
            deal.id,
            { ...data, ddQuestionnaire: questionnaire },
            user.id,
            templates
               .filter((item) => chosen.includes(item.key) && item.file)
               .map((item) => ({ title: nameOf(item), url: item.file!.url })),
         ),
      { kind: 'send', success: t('Запрос отправлен') },
   );

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const result = requestSchema.safeParse(values);
      if (!result.success) {
         setErrors(fieldErrors(result.error));
         return;
      }
      if (await sending.run(result.data)) onClose();
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
               <fieldset>
                  <legend className='text-meta font-semibold'>
                     {t('Шаблоны для заполнения')}
                  </legend>
                  {templates.length ? (
                     <ul className='mt-2 flex flex-col gap-2'>
                        {templates.map((item) => (
                           <li
                              key={item.key}
                              className='text-meta flex items-start gap-2.5'
                           >
                              <Checkbox
                                 checked={chosen.includes(item.key)}
                                 label={nameOf(item)}
                                 onChange={() => toggleTemplate(item.key)}
                              />
                              <span aria-hidden className='min-w-0'>
                                 {nameOf(item)}
                                 <span className='text-ink-soft ml-2 text-xs'>
                                    {item.file?.name}
                                 </span>
                              </span>
                           </li>
                        ))}
                     </ul>
                  ) : (
                     <p className='text-ink-soft mt-1 text-xs'>
                        {t('Шаблонов пока нет.')}{' '}
                        <Link
                           className='link'
                           to={`${SETTINGS_PATH}/doc-templates`}
                        >
                           {t('Добавить в Настройках')}
                        </Link>
                     </p>
                  )}
                  <p className='text-ink-soft mt-2 text-xs'>
                     {t(
                        'Заявитель скачает их, заполнит и вернёт; заполненные файлы попадут в data room на проверку. Свой файл можно приложить к запросу после отправки.',
                     )}
                  </p>
               </fieldset>
            </div>
         </ModalBody>
         <ModalFooter note={t('Часы стадии остановятся до ответа заявителя')}>
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button loading={sending.pending} type='submit'>
               {t('Отправить запрос')}
            </Button>
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

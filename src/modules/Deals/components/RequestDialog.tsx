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
import { addWorkingDays, todayISO } from '@shared/helpers';
import { useAction, useCurrentUser } from '@shared/hooks';
import type { Deal, DealRequest } from '@shared/types/deals.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COMPANY_MAX } from '../constants';
import deals from '../services';
import { fieldErrors, requestSchema, type ValidationKey } from '../validations';

interface RequestDialogProps {
   deal: Deal | null; // null: the dialog is closed
   title?: string; // what the request starts with, e.g. a document's name
   folder?: string; // the data room folder open now, where its file will go
   // it starts as the fund's DD questionnaire («Запросить анкету»)
   questionnaire?: boolean;
   request?: DealRequest | null; // an existing one to change
   onClose: () => void;
}

// Working days the applicant gets to answer, unless changed in the form.
const ANSWER_DAYS = 5;

type Errors = Partial<Record<'title' | 'dueDate', ValidationKey>>;

const RequestForm = ({
   deal,
   title = '',
   folder = '',
   questionnaire = false,
   request,
   onClose,
}: RequestDialogProps & { deal: Deal }) => {
   const { t } = useTranslation('deals');
   const { t: tValidation } = useTranslation('validation');
   const user = useCurrentUser();
   const folders = listOf('docFolders');
   const [values, setValues] = useState({
      title: request?.title ?? title,
      text: request?.text ?? '',
      dueDate: request?.dueDate ?? addWorkingDays(todayISO(), ANSWER_DAYS),
      folder:
         request?.folder ??
         (folders.some(({ key }) => key === folder)
            ? folder
            : (folders[0]?.key ?? '')),
   });
   const [errors, setErrors] = useState<Errors>({});
   // the templates from Настройки that go with a new request, by key
   const templates = request
      ? []
      : listOf('docTemplates').filter((item) => item.file);
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

   const sending = useAction(
      (data: Omit<Parameters<typeof deals.addRequest>[1], 'ddQuestionnaire'>) =>
         request
            ? deals.updateRequest(deal.id, request.id, data)
            : deals.addRequest(
                 deal.id,
                 { ...data, ddQuestionnaire: questionnaire },
                 user.id,
                 templates
                    .filter((item) => chosen.includes(item.key) && item.file)
                    .map((item) => ({
                       title: nameOf(item),
                       url: item.file!.url,
                    })),
              ),
      request
         ? { success: t('Сохранено') }
         : { kind: 'send', success: t('Запрос отправлен') },
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
               <Field
                  error={errorOf('title')}
                  label={t('Что нужно предоставить')}
               >
                  <input
                     data-autofocus
                     aria-invalid={!!errors.title}
                     className='field-input'
                     maxLength={COMPANY_MAX * 2}
                     placeholder={t(
                        'Например, выписки по расчётному счёту за 6 месяцев',
                     )}
                     value={values.title}
                     onChange={(event) => setValue('title', event.target.value)}
                  />
               </Field>
               <div className='grid gap-4 sm:grid-cols-2'>
                  <Field label={t('Папка дата рума')}>
                     <select
                        className='field-input'
                        value={values.folder}
                        onChange={(event) =>
                           setValue('folder', event.target.value)
                        }
                     >
                        {!folders.some(({ key }) => key === values.folder) && (
                           <option value={values.folder}>
                              {t('Без папки')}
                           </option>
                        )}
                        {folders.map((item) => (
                           <option key={item.key} value={item.key}>
                              {nameOf(item)}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field error={errorOf('dueDate')} label={t('Срок')}>
                     <input
                        aria-invalid={!!errors.dueDate}
                        className='field-input'
                        type='date'
                        value={values.dueDate}
                        onChange={(event) =>
                           setValue('dueDate', event.target.value)
                        }
                     />
                  </Field>
               </div>
               {templates.length > 0 && (
                  <fieldset>
                     <legend className='text-meta font-semibold'>
                        {t('Шаблоны для заполнения')}
                     </legend>
                     <ul className='mt-2 flex flex-col gap-2'>
                        {templates.map((item) => (
                           <li
                              key={item.key}
                              className='text-meta flex items-start gap-2.5'
                           >
                              <Checkbox
                                 checked={chosen.includes(item.key)}
                                 hint={t('Приложить этот шаблон к запросу')}
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
                  </fieldset>
               )}
            </div>
         </ModalBody>
         <ModalFooter
            note={
               request
                  ? undefined
                  : deal.fromSite
                    ? t(
                         'Заявитель увидит запрос в кабинете основателя; часы стадии остановятся до ответа.',
                      )
                    : deal.applicantEmail
                      ? t(
                           'У сделки без заявки с сайта нет кабинета: отправьте запрос на {{email}} сами.',
                           { email: deal.applicantEmail },
                        )
                      : t(
                           'У сделки без заявки с сайта нет кабинета: отправьте запрос заявителю сами.',
                        )
            }
         >
            <Button
               hint={t('Закрыть окно, ничего не меняя')}
               variant='text'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               hint={
                  request
                     ? t('Сохранить изменения в запросе')
                     : t('Отправить запрос: он появится в кабинете основателя')
               }
               loading={sending.pending}
               type='submit'
            >
               {request ? t('Сохранить') : t('Отправить запрос')}
            </Button>
         </ModalFooter>
      </form>
   );
};

// A request for a document, as the design's: what is needed, the folder its
// file goes to and the deadline. It goes to the applicant's cabinet and email.
const RequestDialog = ({
   deal,
   title,
   folder,
   questionnaire,
   request,
   onClose,
}: RequestDialogProps) => {
   const { t } = useTranslation('deals');

   return (
      <Modal
         open={deal !== null}
         subtitle={deal?.company}
         title={request ? t('Запрос') : t('Запрос документа')}
         onClose={onClose}
      >
         {deal && (
            <RequestForm
               key={`${deal.id}-${request?.id}-${title}-${questionnaire}`}
               deal={deal}
               folder={folder}
               questionnaire={questionnaire}
               request={request}
               title={title}
               onClose={onClose}
            />
         )}
      </Modal>
   );
};

export default RequestDialog;

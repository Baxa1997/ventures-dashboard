import { Button, MODAL_FORM, RichTextEditor } from '@shared/components';
import { htmlToText } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type {
   Employee,
   TaskInput,
   TaskTargets,
} from '@shared/types/work.types';
import { ListChecks, Plus, TextAlignStart, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CHECKLIST_MAX, CONTEXT_MAX, TITLE_MAX } from '../constants';
import {
   getInitialValues,
   type TaskFormValues,
   toChecklist,
} from '../helpers';
import type { NewTaskPreset } from '../hooks/useTaskDialog';
import {
   getFieldErrors,
   type TaskFormErrors,
   taskSchema,
} from '../validations';
import { Section, StatusSelect, TaskDetails } from './TaskFields';

interface TaskFormProps {
   preset?: NewTaskPreset; // values set in advance
   employees: Employee[];
   targets: TaskTargets;
   onSubmit: (values: TaskInput) => void;
   saving?: boolean; // the task is on its way to ucode
}

/* A new task's card: the title, the description and the checklist on the
   left; the status, «Создать» and the details on the right. Closing it
   without creating is the modal's cross. */
const TaskForm = ({
   preset,
   employees,
   targets,
   onSubmit,
   saving = false,
}: TaskFormProps) => {
   const { t } = useTranslation('work');
   const { t: tValidation } = useTranslation('validation');
   const user = useCurrentUser();
   const [values, setValues] = useState(() => ({
      ...getInitialValues(undefined, user.id),
      ...preset,
   }));
   const [errors, setErrors] = useState<TaskFormErrors>({});
   const [item, setItem] = useState(''); // the checklist item being written

   const change = (patch: Partial<TaskFormValues>) => {
      setValues((prev) => ({ ...prev, ...patch }));
      setErrors((prev) => ({
         ...prev,
         ...Object.fromEntries(
            Object.keys(patch).map((key) => [key, undefined]),
         ),
      }));
   };

   const errorOf = (key: keyof TaskFormValues) => {
      const message = errors[key];
      return message && tValidation(message);
   };

   // the checklist is kept as text, one item per line
   const items = values.checklist.split('\n').filter(Boolean);
   const setItems = (next: string[]) => change({ checklist: next.join('\n') });
   const addItem = () => {
      if (!item.trim()) return;
      setItems([...items, item.trim()]);
      setItem('');
   };

   const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      // the description's text, on one line, is what lists show next to the type
      const result = taskSchema.safeParse({
         ...values,
         context: htmlToText(values.details).slice(0, CONTEXT_MAX),
      });
      if (!result.success) {
         setErrors(getFieldErrors(result.error));
         return;
      }
      onSubmit({
         ...result.data,
         checklist: toChecklist(result.data.checklist),
      });
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={handleSubmit}>
         <div className='grid min-h-0 flex-auto overflow-y-auto md:grid-cols-[minmax(0,1fr)_23.75rem]'>
            <div className='grid min-w-0 content-start gap-6.5 px-5 pt-5 pb-7 md:px-7'>
               <div>
                  <input
                     data-autofocus
                     aria-invalid={!!errors.title}
                     aria-label={t('Название задачи')}
                     className='text-ink-strong placeholder:text-ink-faint focus:shadow-[inset_0_-2px_0_var(--color-accent)] w-full bg-transparent py-1 text-[26px] leading-tight font-extrabold outline-none'
                     maxLength={TITLE_MAX}
                     placeholder={t('Название задачи')}
                     value={values.title}
                     onChange={(event) => change({ title: event.target.value })}
                  />
                  {errors.title && (
                     <span role='alert' className='text-danger text-xs'>
                        {errorOf('title')}
                     </span>
                  )}
               </div>

               <Section icon={TextAlignStart} title={t('Описание')}>
                  <RichTextEditor
                     label={t('Описание')}
                     value={values.details}
                     onChange={(html) => change({ details: html })}
                  />
               </Section>

               <Section
                  count={`0/${items.length}`}
                  icon={ListChecks}
                  title={t('Чек-лист')}
               >
                  <ul className='grid gap-0.5'>
                     {items.map((text, index) => (
                        <li
                           key={`${index}-${text}`}
                           className='group hover:bg-hover flex items-center gap-2.5 rounded-md py-1 pr-1 pl-1.5'
                        >
                           <span className='min-w-0 flex-1'>{text}</span>
                           <button
                              type='button'
                              aria-label={t('Убрать пункт: {{text}}', { text })}
                              className='text-ink-faint hover:text-danger grid size-6 place-items-center rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100'
                              onClick={() =>
                                 setItems(items.filter((_, i) => i !== index))
                              }
                           >
                              <X aria-hidden className='size-3.5' />
                           </button>
                        </li>
                     ))}
                  </ul>
                  <label className='text-ink-faint flex items-center gap-2 px-1.5'>
                     <Plus aria-hidden className='size-4 shrink-0' />
                     <input
                        aria-label={t('Добавить пункт')}
                        className='text-ink placeholder:text-ink-soft min-w-0 flex-1 bg-transparent py-1 outline-none'
                        maxLength={CHECKLIST_MAX}
                        placeholder={t('Добавить пункт')}
                        value={item}
                        onBlur={addItem}
                        onChange={(event) => setItem(event.target.value)}
                        onKeyDown={(event) => {
                           if (event.key !== 'Enter') return;
                           event.preventDefault(); // the form is not sent
                           addItem();
                        }}
                     />
                  </label>
                  {errors.checklist && (
                     <span role='alert' className='text-danger text-xs'>
                        {errorOf('checklist')}
                     </span>
                  )}
               </Section>
            </div>

            <div className='bg-ground border-line grid content-start gap-3.5 border-t p-4 md:border-t-0 md:border-l'>
               <div className='flex gap-2'>
                  <StatusSelect
                     value={values.status}
                     onChange={(status) => change({ status })}
                  />
                  <Button className='h-10' loading={saving} type='submit'>
                     <Plus aria-hidden />
                     {t('Создать')}
                  </Button>
               </div>
               <TaskDetails
                  creatorId={user.id}
                  employees={employees}
                  errors={{
                     relationId: errorOf('relationId'),
                     dueDate: errorOf('dueDate'),
                  }}
                  targets={targets}
                  values={values}
                  onChange={change}
               />
               <p className='text-ink-soft px-1 text-xs'>
                  {t(
                     'Без исполнителя задача уходит директору. Задача с согласующим после выполнения уходит ему на проверку.',
                  )}
               </p>
            </div>
         </div>
      </form>
   );
};

export default TaskForm;

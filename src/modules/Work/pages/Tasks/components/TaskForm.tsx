import { listName, listOf } from '@modules/Settings/services';
import {
   TASK_PRIORITY_LABELS,
   TASK_PRIORITY_ORDER,
   TASK_RECURRENCE_LABELS,
   TASK_RECURRENCE_ORDER,
   TASK_RELATION_LABELS,
   TASK_RELATION_ORDER,
   TITLE_MAX,
} from '@modules/Work/constants';
import { shortName, statusName, taskStatuses } from '@modules/Work/helpers';
import {
   Button,
   Field,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   RichTextEditor,
} from '@shared/components';
import { htmlToText } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type {
   Employee,
   Task,
   TaskInput,
   TaskTargets,
} from '@shared/types/work.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CHECKLIST_MAX, CONTEXT_MAX } from '../constants';
import { getInitialValues, type TaskFormValues, toChecklist } from '../helpers';
import {
   getFieldErrors,
   type TaskFormErrors,
   taskSchema,
} from '../validations';

interface TaskFormProps {
   task?: Task;
   employees: Employee[];
   targets: TaskTargets;
   onSubmit: (values: TaskInput) => void;
   onCancel: () => void;
   saving?: boolean; // the task is on its way to ucode
}

const TaskForm = ({
   task,
   employees,
   targets,
   onSubmit,
   onCancel,
   saving = false,
}: TaskFormProps) => {
   const { t } = useTranslation('work');
   const { t: tValidation } = useTranslation('validation');
   const user = useCurrentUser();
   const [values, setValues] = useState(() => getInitialValues(task, user.id));
   const [errors, setErrors] = useState<TaskFormErrors>({});

   const setValue = <K extends keyof TaskFormValues>(
      key: K,
      value: TaskFormValues[K],
   ) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
   };

   const errorOf = (key: keyof TaskFormValues) => {
      const message = errors[key];
      return message && tValidation(message);
   };

   const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      // the note's text, on one line, is what lists show next to the type
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
         checklist: toChecklist(result.data.checklist, task?.checklist),
      });
   };

   // A select whose options come from an ordered list of values and their labels.
   const select = <K extends keyof TaskFormValues>(
      key: K,
      order: TaskFormValues[K][],
      label: (value: TaskFormValues[K]) => string,
   ) => (
      <select
         className='field-input'
         value={values[key]}
         onChange={(event) =>
            setValue(key, event.target.value as TaskFormValues[K])
         }
      >
         {order.map((value) => (
            <option key={value} value={value}>
               {label(value)}
            </option>
         ))}
      </select>
   );

   const person = (key: 'assigneeId' | 'reviewerId', nobody: string) => (
      <select
         className='field-input'
         value={values[key]}
         onChange={(event) => setValue(key, event.target.value)}
      >
         <option value=''>{nobody}</option>
         {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
               {shortName(employee.name)}
            </option>
         ))}
      </select>
   );

   return (
      <form noValidate className={MODAL_FORM} onSubmit={handleSubmit}>
         <ModalBody>
            <div className='grid gap-4 sm:grid-cols-2'>
               <Field
                  className='sm:col-span-2'
                  error={errorOf('title')}
                  label={t('Название')}
               >
                  <input
                     data-autofocus
                     aria-invalid={!!errors.title}
                     className='field-input'
                     maxLength={TITLE_MAX}
                     value={values.title}
                     onChange={(event) => setValue('title', event.target.value)}
                  />
               </Field>
               <Field label={t('Тип')}>
                  {select(
                     'type',
                     // a type turned off in Настройки stays on the tasks that have it
                     [
                        ...listOf('taskTypes').map(({ key }) => key),
                        ...(listOf('taskTypes').some(
                           ({ key }) => key === values.type,
                        )
                           ? []
                           : [values.type]),
                     ],
                     (type) => listName('taskTypes', type),
                  )}
               </Field>
               <Field label={t('Связано с')}>
                  <select
                     className='field-input'
                     value={values.relation}
                     onChange={(event) => {
                        setValue(
                           'relation',
                           event.target.value as TaskFormValues['relation'],
                        );
                        setValue('relationId', '');
                     }}
                  >
                     {TASK_RELATION_ORDER.map((relation) => (
                        <option key={relation} value={relation}>
                           {t(TASK_RELATION_LABELS[relation])}
                        </option>
                     ))}
                  </select>
               </Field>
               {values.relation !== 'none' && (
                  <Field
                     className='sm:col-span-2'
                     error={errorOf('relationId')}
                     label={t(TASK_RELATION_LABELS[values.relation])}
                  >
                     <select
                        aria-invalid={!!errors.relationId}
                        className='field-input'
                        value={values.relationId}
                        onChange={(event) =>
                           setValue('relationId', event.target.value)
                        }
                     >
                        <option value=''>{t('Выберите')}</option>
                        {targets[values.relation].map((target) => (
                           <option key={target.id} value={target.id}>
                              {target.name}
                           </option>
                        ))}
                     </select>
                  </Field>
               )}
               <div className='flex flex-col gap-1.5 sm:col-span-2'>
                  <span className='text-ink-soft text-xs font-medium'>
                     {t('Уточнение')}
                  </span>
                  <RichTextEditor
                     label={t('Уточнение')}
                     value={values.details}
                     onChange={(html) => setValue('details', html)}
                  />
                  <span className='text-ink-soft text-xs'>
                     {t(
                        'Подробности задачи: контрагент, документ, ссылки, списки. Начало текста видно в списке рядом с типом.',
                     )}
                  </span>
               </div>
               <Field
                  hint={t('Без исполнителя задача уходит директору')}
                  label={t('Исполнитель')}
               >
                  {person('assigneeId', t('Не назначен'))}
               </Field>
               <Field label={t('Проверяет')}>
                  {person('reviewerId', t('Никто'))}
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
               <Field label={t('Приоритет')}>
                  {select('priority', TASK_PRIORITY_ORDER, (priority) =>
                     t(TASK_PRIORITY_LABELS[priority]),
                  )}
               </Field>
               <Field label={t('Повтор')}>
                  {select('recurrence', TASK_RECURRENCE_ORDER, (recurrence) =>
                     t(TASK_RECURRENCE_LABELS[recurrence]),
                  )}
               </Field>
               <Field label={t('Статус')}>
                  {select(
                     'status',
                     // a status turned off in Настройки stays on the tasks that have it
                     [
                        ...taskStatuses().map(({ key }) => key),
                        ...(taskStatuses().some(
                           ({ key }) => key === values.status,
                        )
                           ? []
                           : [values.status]),
                     ],
                     (status) => statusName(t, status),
                  )}
               </Field>
               <Field
                  className='sm:col-span-2'
                  error={errorOf('checklist')}
                  hint={t('Каждый пункт с новой строки')}
                  label={t('Чек-лист')}
               >
                  <textarea
                     aria-invalid={!!errors.checklist}
                     className='field-input'
                     maxLength={CHECKLIST_MAX}
                     rows={3}
                     value={values.checklist}
                     onChange={(event) =>
                        setValue('checklist', event.target.value)
                     }
                  />
               </Field>
            </div>
         </ModalBody>
         <ModalFooter>
            <Button disabled={saving} variant='ghost' onClick={onCancel}>
               {t('Отмена')}
            </Button>
            <Button loading={saving} type='submit'>
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

export default TaskForm;

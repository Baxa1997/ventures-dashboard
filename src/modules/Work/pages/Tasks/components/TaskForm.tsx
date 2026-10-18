import {
   TASK_PRIORITY_LABELS,
   TASK_PRIORITY_ORDER,
   TASK_RECURRENCE_LABELS,
   TASK_RECURRENCE_ORDER,
   TASK_RELATION_LABELS,
   TASK_RELATION_ORDER,
   TASK_STATUS_LABELS,
   TASK_STATUS_ORDER,
   TASK_TYPE_LABELS,
   TASK_TYPE_ORDER,
   TITLE_MAX,
} from '@modules/Work/constants';
import { shortName } from '@modules/Work/helpers';
import {
   Button,
   Field,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
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
}

const TaskForm = ({
   task,
   employees,
   targets,
   onSubmit,
   onCancel,
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
      const result = taskSchema.safeParse(values);
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
                  {select('type', TASK_TYPE_ORDER, (type) =>
                     t(TASK_TYPE_LABELS[type]),
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
               <Field
                  className='sm:col-span-2'
                  error={errorOf('context')}
                  hint={t(
                     'Контрагент, компания или документ — показывается рядом с типом',
                  )}
                  label={t('Уточнение')}
               >
                  <input
                     aria-invalid={!!errors.context}
                     className='field-input'
                     maxLength={CONTEXT_MAX}
                     value={values.context}
                     onChange={(event) =>
                        setValue('context', event.target.value)
                     }
                  />
               </Field>
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
                  {select('status', TASK_STATUS_ORDER, (status) =>
                     t(TASK_STATUS_LABELS[status]),
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
            <Button variant='ghost' onClick={onCancel}>
               {t('Отмена')}
            </Button>
            <Button type='submit'>{t('Сохранить')}</Button>
         </ModalFooter>
      </form>
   );
};

export default TaskForm;

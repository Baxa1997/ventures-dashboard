import { listName, listOf } from '@modules/Settings/services';
import {
   Avatar,
   type BadgeTone,
   Button,
   MODAL_FORM,
   RichTextEditor,
} from '@shared/components';
import { htmlToText } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type {
   Employee,
   Task,
   TaskInput,
   TaskPriority,
   TaskTargets,
} from '@shared/types/work.types';
import clsx from 'clsx';
import {
   Briefcase,
   CalendarClock,
   Handshake,
   ListChecks,
   type LucideIcon,
   Plus,
   Repeat,
   Shapes,
   SignalMedium,
   Stamp,
   TextAlignStart,
   UserPen,
   Users,
   X,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
   CHECKLIST_MAX,
   CONTEXT_MAX,
   TASK_PRIORITY_LABELS,
   TASK_PRIORITY_ORDER,
   TASK_RECURRENCE_LABELS,
   TASK_RECURRENCE_ORDER,
   TITLE_MAX,
} from '../constants';
import {
   getInitialValues,
   shortName,
   statusName,
   statusTone,
   type TaskFormValues,
   taskStatuses,
   toChecklist,
} from '../helpers';
import type { NewTaskPreset } from '../hooks/useNewTask';
import {
   getFieldErrors,
   type TaskFormErrors,
   taskSchema,
} from '../validations';

interface TaskFormProps {
   task?: Task; // none: a new task
   preset?: NewTaskPreset; // a new task's values set in advance
   employees: Employee[];
   targets: TaskTargets;
   onSubmit: (values: TaskInput) => void;
   saving?: boolean; // the task is on its way to ucode
}

// The status select takes the colour of the chosen status.
const STATUS_TONES: Record<BadgeTone, string> = {
   accent: 'bg-accent-tint text-accent-ink ring-accent/40',
   info: 'bg-info-tint text-info-ink ring-info/40',
   indigo: 'bg-indigo-tint text-indigo-ink ring-indigo/40',
   success: 'bg-success-tint text-success-ink ring-success/40',
   warning: 'bg-warning-tint text-warning-ink ring-warning/40',
   danger: 'bg-danger-tint text-danger-ink ring-danger/40',
   neutral: 'bg-neutral-tint text-neutral-ink ring-neutral/40',
};

const PRIORITY_TONES: Record<TaskPriority, string> = {
   high: 'text-danger',
   medium: 'text-warning-ink',
   low: 'text-ink-soft',
};

// A value of «Детали» reads as text until it is pointed at.
const DETAIL_INPUT =
   'w-full min-w-0 cursor-pointer rounded-md border border-transparent bg-transparent px-1.5 py-1 font-semibold hover:border-line-strong hover:bg-white focus:border-line-strong focus:bg-white focus:outline-none';

interface DetailProps {
   icon: LucideIcon;
   label: string;
   error?: string;
   children: ReactNode;
}

// A line of «Детали»: what it is, and its value.
const Detail = ({ icon: Icon, label, error, children }: DetailProps) => (
   <div className='grid min-h-9.5 grid-cols-[7.375rem_minmax(0,1fr)] items-center gap-2 py-1'>
      <span className='text-ink-soft text-meta flex items-center gap-2'>
         <Icon aria-hidden className='text-ink-faint size-3.75 shrink-0' />
         {label}
      </span>
      <div className='min-w-0'>
         {children}
         {error && (
            <span role='alert' className='text-danger block px-1.5 text-xs'>
               {error}
            </span>
         )}
      </div>
   </div>
);

interface SectionProps {
   icon: LucideIcon;
   title: string;
   count?: string;
   children: ReactNode;
}

const Section = ({ icon: Icon, title, count, children }: SectionProps) => (
   <section className='grid min-w-0 gap-2.5'>
      <h3 className='flex items-center gap-2 text-[15px] font-bold'>
         <Icon aria-hidden className='text-ink-faint size-4' />
         {title}
         {count !== undefined && (
            <span className='bg-hover text-ink-soft rounded-full px-2 text-[11px] font-bold'>
               {count}
            </span>
         )}
      </h3>
      {children}
   </section>
);

/* A task's card for writing it: the title, the description and the
   checklist on the left; the status, the button and the details on the
   right. Closing it without saving is the modal's cross. */
const TaskForm = ({
   task,
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
      ...getInitialValues(task, user.id),
      ...preset,
   }));
   const [errors, setErrors] = useState<TaskFormErrors>({});
   const [item, setItem] = useState(''); // the checklist item being written

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

   // the checklist is kept as text, one item per line
   const items = values.checklist.split('\n').filter(Boolean);
   const ticked = task?.checklist.filter(({ done }) => done).length ?? 0;
   const setItems = (next: string[]) => setValue('checklist', next.join('\n'));
   const addItem = () => {
      if (!item.trim()) return;
      setItems([...items, item.trim()]);
      setItem('');
   };

   // a task is about a deal or a company, not both
   const setTarget = (relation: 'deal' | 'portfolio', id: string) => {
      setValue('relation', id ? relation : 'none');
      setValue('relationId', id);
   };
   const targetOf = (relation: 'deal' | 'portfolio') =>
      values.relation === relation ? values.relationId : '';

   const creator =
      employees.find(({ id }) => id === (task?.createdById || user.id)) ??
      user;

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
         checklist: toChecklist(result.data.checklist, task?.checklist),
      });
   };

   // a value turned off in Настройки stays on the tasks that have it
   const withCurrent = (keys: string[], current: string) =>
      keys.includes(current) ? keys : [...keys, current];

   const person = (key: 'assigneeId' | 'reviewerId', nobody: string) => (
      <select
         className={DETAIL_INPUT}
         value={values[key]}
         onChange={(event) => setValue(key, event.target.value)}
      >
         <option value=''>{nobody}</option>
         {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
               {employee.fullName || shortName(employee.name)}
            </option>
         ))}
      </select>
   );

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
                     onChange={(event) => setValue('title', event.target.value)}
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
                     onChange={(html) => setValue('details', html)}
                  />
               </Section>

               <Section
                  count={`${ticked}/${items.length}`}
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
                  <select
                     aria-label={t('Статус')}
                     className={clsx(
                        'h-10 min-w-0 flex-1 cursor-pointer appearance-none rounded-lg px-3 font-bold ring-1 ring-inset focus:outline-none',
                        STATUS_TONES[statusTone(values.status)],
                     )}
                     value={values.status}
                     onChange={(event) =>
                        setValue('status', event.target.value)
                     }
                  >
                     {withCurrent(
                        taskStatuses().map(({ key }) => key),
                        values.status,
                     ).map((status) => (
                        <option key={status} value={status}>
                           {statusName(t, status)}
                        </option>
                     ))}
                  </select>
                  <Button className='h-10' loading={saving} type='submit'>
                     {!task && <Plus aria-hidden />}
                     {task ? t('Сохранить') : t('Создать')}
                  </Button>
               </div>

               <div className='border-line rounded-xl border bg-white px-3.5 pt-1.5 pb-2.5'>
                  <p className='text-ink-faint pt-2.5 pb-1.5 text-[11px] font-bold tracking-[0.08em] uppercase'>
                     {t('Детали')}
                  </p>
                  <Detail icon={Shapes} label={t('Тип')}>
                     <select
                        className={DETAIL_INPUT}
                        value={values.type}
                        onChange={(event) =>
                           setValue('type', event.target.value)
                        }
                     >
                        {withCurrent(
                           listOf('taskTypes').map(({ key }) => key),
                           values.type,
                        ).map((type) => (
                           <option key={type} value={type}>
                              {listName('taskTypes', type)}
                           </option>
                        ))}
                     </select>
                  </Detail>
                  <Detail icon={Users} label={t('Исполнитель')}>
                     {person('assigneeId', t('Не назначен'))}
                  </Detail>
                  <Detail icon={UserPen} label={t('Создатель')}>
                     <span className='flex items-center gap-2 px-1.5 font-semibold'>
                        <Avatar name={creator.name} />
                        <span className='truncate'>
                           {creator.fullName || creator.name}
                        </span>
                     </span>
                  </Detail>
                  <Detail icon={SignalMedium} label={t('Приоритет')}>
                     <select
                        className={clsx(
                           DETAIL_INPUT,
                           PRIORITY_TONES[values.priority],
                        )}
                        value={values.priority}
                        onChange={(event) =>
                           setValue(
                              'priority',
                              event.target.value as TaskPriority,
                           )
                        }
                     >
                        {TASK_PRIORITY_ORDER.map((priority) => (
                           <option key={priority} value={priority}>
                              {t(TASK_PRIORITY_LABELS[priority])}
                           </option>
                        ))}
                     </select>
                  </Detail>
                  <Detail icon={Briefcase} label={t('Портфель')}>
                     <select
                        className={DETAIL_INPUT}
                        value={targetOf('portfolio')}
                        onChange={(event) =>
                           setTarget('portfolio', event.target.value)
                        }
                     >
                        <option value=''>{t('Не относится')}</option>
                        {targets.portfolio.map((target) => (
                           <option key={target.id} value={target.id}>
                              {target.name}
                           </option>
                        ))}
                     </select>
                  </Detail>
                  <Detail
                     error={errorOf('relationId')}
                     icon={Handshake}
                     label={t('Сделка')}
                  >
                     <select
                        className={DETAIL_INPUT}
                        value={targetOf('deal')}
                        onChange={(event) =>
                           setTarget('deal', event.target.value)
                        }
                     >
                        <option value=''>{t('Без сделки')}</option>
                        {targets.deal.map((target) => (
                           <option key={target.id} value={target.id}>
                              {target.name}
                           </option>
                        ))}
                     </select>
                  </Detail>
                  <Detail
                     error={errorOf('dueDate')}
                     icon={CalendarClock}
                     label={t('Дедлайн')}
                  >
                     <input
                        aria-invalid={!!errors.dueDate}
                        className={DETAIL_INPUT}
                        type='date'
                        value={values.dueDate}
                        onChange={(event) =>
                           setValue('dueDate', event.target.value)
                        }
                     />
                  </Detail>
                  <Detail icon={Stamp} label={t('Согласует')}>
                     {person('reviewerId', t('Без согласования'))}
                  </Detail>
                  <Detail icon={Repeat} label={t('Повтор')}>
                     <select
                        className={DETAIL_INPUT}
                        value={values.recurrence}
                        onChange={(event) =>
                           setValue(
                              'recurrence',
                              event.target
                                 .value as TaskFormValues['recurrence'],
                           )
                        }
                     >
                        {TASK_RECURRENCE_ORDER.map((recurrence) => (
                           <option key={recurrence} value={recurrence}>
                              {t(TASK_RECURRENCE_LABELS[recurrence])}
                           </option>
                        ))}
                     </select>
                  </Detail>
               </div>
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

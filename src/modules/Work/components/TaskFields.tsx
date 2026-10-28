import { listName, listOf } from '@modules/Settings/services';
import { Avatar, type BadgeTone } from '@shared/components';
import { SECTION_PATHS } from '@shared/constants';
import { useCurrentUser } from '@shared/hooks';
import type {
   Employee,
   TaskInput,
   TaskPriority,
   TaskRecurrence,
   TaskTargets,
} from '@shared/types/work.types';
import clsx from 'clsx';
import {
   Briefcase,
   CalendarClock,
   ExternalLink,
   FileText,
   Handshake,
   type LucideIcon,
   Repeat,
   Shapes,
   SignalMedium,
   Stamp,
   UserPen,
   Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
   TASK_PRIORITY_LABELS,
   TASK_PRIORITY_ORDER,
   TASK_RECURRENCE_LABELS,
   TASK_RECURRENCE_ORDER,
   TASK_RELATION_SECTIONS,
} from '../constants';
import {
   shortName,
   statusName,
   statusTone,
   taskStatuses,
} from '../helpers';
import { closeTaskDialog } from '../hooks/useTaskDialog';

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

// Its selects draw the chevron 8px in, clear of the text.
const DETAIL_SELECT = clsx(DETAIL_INPUT, 'select-chevron pr-7');

// a value turned off in Настройки stays on the tasks that have it
const withCurrent = (keys: string[], current: string) =>
   keys.includes(current) ? keys : [...keys, current];

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
   action?: ReactNode; // at the end of the heading
   children: ReactNode;
}

// A part of the card's left column: the description, the checklist…
export const Section = ({
   icon: Icon,
   title,
   count,
   action,
   children,
}: SectionProps) => (
   <section className='grid min-w-0 gap-2.5'>
      <h3 className='flex items-center gap-2 text-[15px] font-bold'>
         <Icon aria-hidden className='text-ink-faint size-4' />
         {title}
         {count !== undefined && (
            <span className='bg-hover text-ink-soft rounded-full px-2 text-[11px] font-bold'>
               {count}
            </span>
         )}
         {action && <span className='ml-auto'>{action}</span>}
      </h3>
      {children}
   </section>
);

interface StatusSelectProps {
   value: string;
   onChange: (status: string) => void;
}

// The status, in its colour, at the top of the card's right column.
export const StatusSelect = ({ value, onChange }: StatusSelectProps) => {
   const { t } = useTranslation('work');

   return (
      <select
         aria-label={t('Статус')}
         className={clsx(
            'select-chevron h-10 min-w-0 flex-1 cursor-pointer rounded-lg pr-9 pl-3 font-bold ring-1 ring-inset [background-position:right_0.75rem_center] focus:outline-none',
            STATUS_TONES[statusTone(value)],
         )}
         value={value}
         onChange={(event) => onChange(event.target.value)}
      >
         {withCurrent(
            taskStatuses().map(({ key }) => key),
            value,
         ).map((status) => (
            <option key={status} value={status}>
               {statusName(t, status)}
            </option>
         ))}
      </select>
   );
};

// The fields «Детали» edits.
export type DetailValues = Pick<
   TaskInput,
   | 'type'
   | 'assigneeId'
   | 'priority'
   | 'relation'
   | 'relationId'
   | 'dueDate'
   | 'reviewerId'
   | 'recurrence'
>;

interface TaskDetailsProps {
   values: DetailValues;
   creatorId: string;
   employees: Employee[];
   targets: TaskTargets;
   errors?: Partial<Record<'relationId' | 'dueDate', string>>;
   overdue?: boolean; // the deadline in red
   basis?: string; // the document the task comes from
   withLinks?: boolean; // the deal and the company open from here
   onChange: (patch: Partial<DetailValues>) => void;
}

/* «Детали» of a task: its type, who does and checks it, its priority, what
   it is about, its deadline and its repetition. Each value reads as text
   and turns into its select when pointed at. */
export const TaskDetails = ({
   values,
   creatorId,
   employees,
   targets,
   errors = {},
   overdue = false,
   basis,
   withLinks = false,
   onChange,
}: TaskDetailsProps) => {
   const { t } = useTranslation('work');
   const user = useCurrentUser();
   const creator =
      employees.find(({ id }) => id === creatorId) ??
      (creatorId === user.id ? user : undefined);

   // a task is about a deal or a company, not both
   const targetOf = (relation: 'deal' | 'portfolio') =>
      values.relation === relation ? values.relationId : '';
   const setTarget = (relation: 'deal' | 'portfolio', id: string) =>
      onChange({ relation: id ? relation : 'none', relationId: id });

   const person = (key: 'assigneeId' | 'reviewerId', nobody: string) => (
      <select
         className={DETAIL_SELECT}
         value={values[key]}
         onChange={(event) => onChange({ [key]: event.target.value })}
      >
         <option value=''>{nobody}</option>
         {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
               {employee.fullName || shortName(employee.name)}
            </option>
         ))}
      </select>
   );

   const target = (
      relation: 'deal' | 'portfolio',
      nothing: string,
      list: TaskTargets['deal'],
   ) => (
      <span className='flex items-center gap-1'>
         <select
            className={DETAIL_SELECT}
            value={targetOf(relation)}
            onChange={(event) => setTarget(relation, event.target.value)}
         >
            <option value=''>{nothing}</option>
            {list.map((item) => (
               <option key={item.id} value={item.id}>
                  {item.name}
               </option>
            ))}
         </select>
         {withLinks && targetOf(relation) && (
            <Link
               aria-label={t('Открыть карточку')}
               className='text-ink-faint hover:bg-hover hover:text-sky grid size-6 shrink-0 place-items-center rounded-md'
               title={t('Открыть карточку')}
               to={`${SECTION_PATHS[TASK_RELATION_SECTIONS[relation]]}/${targetOf(relation)}`}
               onClick={closeTaskDialog}
            >
               <ExternalLink aria-hidden className='size-3.5' />
            </Link>
         )}
      </span>
   );

   return (
      <div className='border-line rounded-xl border bg-white px-3.5 pt-1.5 pb-2.5'>
         <p className='text-ink-faint pt-2.5 pb-1.5 text-[11px] font-bold tracking-[0.08em] uppercase'>
            {t('Детали')}
         </p>
         <Detail icon={Shapes} label={t('Тип')}>
            <select
               className={DETAIL_SELECT}
               value={values.type}
               onChange={(event) => onChange({ type: event.target.value })}
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
               {creator ? (
                  <>
                     <Avatar name={creator.name} />
                     <span className='truncate'>
                        {creator.fullName || creator.name}
                     </span>
                  </>
               ) : (
                  '—'
               )}
            </span>
         </Detail>
         <Detail icon={SignalMedium} label={t('Приоритет')}>
            <select
               className={clsx(DETAIL_SELECT, PRIORITY_TONES[values.priority])}
               value={values.priority}
               onChange={(event) =>
                  onChange({ priority: event.target.value as TaskPriority })
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
            {target('portfolio', t('Не относится'), targets.portfolio)}
         </Detail>
         <Detail error={errors.relationId} icon={Handshake} label={t('Сделка')}>
            {target('deal', t('Без сделки'), targets.deal)}
         </Detail>
         <Detail error={errors.dueDate} icon={CalendarClock} label={t('Дедлайн')}>
            <input
               aria-invalid={!!errors.dueDate}
               className={clsx(DETAIL_INPUT, overdue && 'text-danger')}
               type='date'
               value={values.dueDate}
               onChange={(event) => onChange({ dueDate: event.target.value })}
            />
         </Detail>
         <Detail icon={Stamp} label={t('Согласует')}>
            {person('reviewerId', t('Без согласования'))}
         </Detail>
         <Detail icon={Repeat} label={t('Повтор')}>
            <select
               className={DETAIL_SELECT}
               value={values.recurrence}
               onChange={(event) =>
                  onChange({
                     recurrence: event.target.value as TaskRecurrence,
                  })
               }
            >
               {TASK_RECURRENCE_ORDER.map((recurrence) => (
                  <option key={recurrence} value={recurrence}>
                     {t(TASK_RECURRENCE_LABELS[recurrence])}
                  </option>
               ))}
            </select>
         </Detail>
         {basis && (
            <Detail icon={FileText} label={t('Основание')}>
               <span className='block px-1.5 font-semibold'>{basis}</span>
            </Detail>
         )}
      </div>
   );
};

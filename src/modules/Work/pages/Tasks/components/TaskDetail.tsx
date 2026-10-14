import { StatusBadge } from '@modules/Work/components';
import {
   TASK_RELATION_SECTIONS,
   TASK_STATUS_LABELS,
   TASK_TYPE_LABELS,
} from '@modules/Work/constants';
import {
   formatDate,
   formatDay,
   getAssigneeId,
   getEmployee,
   isDone,
   relativeDue,
   shortName,
} from '@modules/Work/helpers';
import { Button, Card, Checkbox } from '@shared/components';
import { SECTION_PATHS } from '@shared/constants';
import type {
   Employee,
   Task,
   TaskEvent,
   TaskStatus,
} from '@shared/types/work.types';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { type FormEvent, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { COMMENT_MAX } from '../constants';
import { getNextStep } from '../helpers';

interface TaskDetailProps {
   task: Task;
   employees: Employee[];
   onAdvance: (status: TaskStatus) => void;
   onToggleItem: (itemId: string) => void;
   onComment: (text: string) => void;
   onEdit: () => void;
   onDelete: () => void;
}

const SECTION = 'border-line border-b px-5 py-4';

// The card of the task chosen in the table: who does and checks it, when it
// is due, its checklist and history, and the next step.
const TaskDetail = ({
   task,
   employees,
   onAdvance,
   onToggleItem,
   onComment,
   onEdit,
   onDelete,
}: TaskDetailProps) => {
   const { t } = useTranslation('work');
   // null: the comment field is closed
   const [comment, setComment] = useState<string | null>(null);
   // Deleting takes two clicks: the first one arms the button.
   const [armed, setArmed] = useState(false);

   const name = (id: string) => {
      const employee = getEmployee(employees, id);
      return employee ? shortName(employee.name) : '';
   };
   const next = getNextStep(task);
   const doneCount = task.checklist.filter((item) => item.done).length;

   const caption = [
      t(TASK_TYPE_LABELS[task.type]),
      task.priority === 'high' && t('высокий приоритет'),
      task.priority === 'low' && t('низкий приоритет'),
   ]
      .filter(Boolean)
      .join(' · ');

   const due = () => {
      if (!task.dueDate) return t('срок не задан');
      const relative = isDone(task) ? '' : relativeDue(t, task.dueDate);
      return [formatDate(task.dueDate), relative].filter(Boolean).join(', ');
   };

   const recurrence = () => {
      if (task.recurrence === 'quarterly')
         return t('Ежеквартально. Следующая создаётся после закрытия этой');
      return task.dueDate
         ? t(
              'Ежемесячно, до {{day}}-го числа. Следующая создаётся после закрытия этой',
              { day: dayjs(task.dueDate).date() },
           )
         : t('Ежемесячно. Следующая создаётся после закрытия этой');
   };

   const eventText = (event: TaskEvent) => {
      if (event.kind === 'status')
         return t('Статус «{{status}}» · {{name}}', {
            status: t(TASK_STATUS_LABELS[event.status]),
            name: name(event.userId),
         });
      if (event.kind === 'recurred')
         return t('Создана автоматически после закрытия предыдущей');
      if (event.kind === 'comment')
         return `${name(event.userId)}: ${event.text}`;
      return event.text;
   };

   const fields: [string, ReactNode][] = [
      [
         t('Исполнитель'),
         task.assigneeId
            ? name(task.assigneeId)
            : `${name(getAssigneeId(task))}, ${t('по умолчанию')}`,
      ],
      [t('Проверяет'), task.reviewerId ? name(task.reviewerId) : '—'],
      [t('Срок'), due()],
   ];
   if (task.recurrence !== 'none') fields.push([t('Повтор'), recurrence()]);
   if (task.basis)
      fields.push([
         t('Основание'),
         task.relation === 'none' ? (
            task.basis
         ) : (
            <Link
               className='text-accent font-medium hover:underline'
               to={SECTION_PATHS[TASK_RELATION_SECTIONS[task.relation]]}
            >
               {task.basis}
            </Link>
         ),
      ]);

   const submitComment = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const text = comment?.trim();
      if (!text) return;
      onComment(text);
      setComment(null);
   };

   return (
      <Card>
         <div className={SECTION}>
            <div className='flex items-start justify-between gap-3'>
               <div className='text-ink-soft pt-1 text-xs'>{caption}</div>
               <StatusBadge status={task.status} />
            </div>
            <h2 className='text-title mt-2 font-bold'>
               {task.title}
            </h2>
         </div>

         <dl
            className={clsx(
               SECTION,
               'text-meta grid grid-cols-[6.75rem_minmax(0,1fr)] gap-y-2.5',
            )}
         >
            {fields.map(([label, value]) => (
               <div key={label} className='contents'>
                  <dt className='text-ink-soft'>{label}</dt>
                  <dd>{value}</dd>
               </div>
            ))}
         </dl>

         {task.checklist.length > 0 && (
            <div className={SECTION}>
               <h3 className='text-meta font-semibold'>
                  {t('Чек-лист')}
                  <span className='text-ink-soft ml-2 font-normal'>
                     {t('{{done}} из {{total}}', {
                        done: doneCount,
                        total: task.checklist.length,
                     })}
                  </span>
               </h3>
               <ul className='mt-3 flex flex-col gap-2.5'>
                  {task.checklist.map((item) => (
                     <li key={item.id} className='flex items-start gap-2.5'>
                        <Checkbox
                           checked={item.done}
                           label={item.text}
                           onChange={() => onToggleItem(item.id)}
                        />
                        <span
                           aria-hidden
                           className={clsx(
                              'text-meta',
                              item.done && 'text-ink-soft',
                           )}
                        >
                           {item.text}
                        </span>
                     </li>
                  ))}
               </ul>
            </div>
         )}

         <div className={SECTION}>
            <h3 className='text-meta font-semibold'>{t('История')}</h3>
            {task.history.length ? (
               <ul className='mt-2.5 flex flex-col gap-1.5'>
                  {task.history.map((event) => (
                     <li
                        key={event.id}
                        className='text-ink-soft grid grid-cols-[3.5rem_minmax(0,1fr)] text-xs leading-4.25'
                     >
                        <time dateTime={event.date}>
                           {formatDay(event.date)}
                        </time>
                        <span className='break-words'>{eventText(event)}</span>
                     </li>
                  ))}
               </ul>
            ) : (
               <p className='text-ink-soft mt-2 text-xs'>
                  {t('Событий пока нет')}
               </p>
            )}
         </div>

         <div className='p-5'>
            {comment !== null && (
               <form className='mb-3' onSubmit={submitComment}>
                  <textarea
                     autoFocus
                     aria-label={t('Комментарий')}
                     className='field-input text-meta'
                     maxLength={COMMENT_MAX}
                     placeholder={t('Напишите комментарий')}
                     rows={3}
                     value={comment}
                     onChange={(event) => setComment(event.target.value)}
                  />
                  <div className='mt-2 flex gap-4 text-xs font-medium'>
                     <button
                        type='submit'
                        className='text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50'
                        disabled={!comment.trim()}
                     >
                        {t('Отправить')}
                     </button>
                     <button
                        type='button'
                        className='text-ink-soft hover:text-ink'
                        onClick={() => setComment(null)}
                     >
                        {t('Отмена')}
                     </button>
                  </div>
               </form>
            )}
            <div className='flex flex-wrap gap-2.5'>
               <Button onClick={() => onAdvance(next.status)}>
                  {t(next.label)}
               </Button>
               <Button variant='ghost' onClick={() => setComment('')}>
                  {t('Комментарий')}
               </Button>
            </div>
            <div className='mt-3.5 flex gap-4 text-xs'>
               <button
                  type='button'
                  className='text-ink-soft hover:text-ink'
                  onClick={onEdit}
               >
                  {t('Изменить')}
               </button>
               <button
                  type='button'
                  className={
                     armed
                        ? 'text-danger font-semibold'
                        : 'text-ink-soft hover:text-danger'
                  }
                  onBlur={() => setArmed(false)}
                  onClick={() => (armed ? onDelete() : setArmed(true))}
               >
                  {armed ? t('Удалить?') : t('Удалить')}
               </button>
            </div>
         </div>
      </Card>
   );
};

export default TaskDetail;

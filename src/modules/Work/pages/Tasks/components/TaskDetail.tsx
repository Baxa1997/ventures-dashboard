import { StatusBadge } from '@modules/Work/components';
import {
   TASK_RELATION_LABELS,
   TASK_RELATION_SECTIONS,
} from '@modules/Work/constants';
import { listName } from '@modules/Settings/services';
import {
   formatDate,
   formatDay,
   getAssigneeId,
   getEmployee,
   isDone,
   relativeDue,
   shortName,
   statusName,
} from '@modules/Work/helpers';
import { Button, Card, Checkbox, RichText, Spinner } from '@shared/components';
import { SECTION_PATHS } from '@shared/constants';
import { textToHtml } from '@shared/helpers';
import { useAction } from '@shared/hooks';
import type {
   Employee,
   Task,
   TaskEvent,
   TaskStatus,
   TaskTargets,
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
   targets: TaskTargets;
   onAdvance: (status: TaskStatus) => Promise<unknown>;
   onToggleItem: (itemId: string) => Promise<unknown>;
   onComment: (text: string) => Promise<unknown>;
}

const SECTION = 'border-line border-b px-5 py-4';

// The card of the task chosen in the table: who does and checks it, when it
// is due, its checklist and history, and the next step.
const TaskDetail = ({
   task,
   employees,
   targets,
   onAdvance,
   onToggleItem,
   onComment,
}: TaskDetailProps) => {
   const { t } = useTranslation('work');
   // null: the comment field is closed
   const [comment, setComment] = useState<string | null>(null);
   const advancing = useAction(onAdvance, {
      success: (status) =>
         t('Статус задачи: «{{status}}»', { status: statusName(t, status) }),
   });
   const commenting = useAction(onComment, {
      kind: 'send',
      success: t('Комментарий добавлен'),
   });
   const ticking = useAction(onToggleItem, {
      success: t('Отметка сохранена'),
   });
   // the checklist item whose tick is being saved
   const [tickingId, setTickingId] = useState('');

   const name = (id: string) => {
      const employee = getEmployee(employees, id);
      return employee ? shortName(employee.name) : '';
   };
   const next = getNextStep(task);
   const doneCount = task.checklist.filter((item) => item.done).length;

   const caption = [
      listName('taskTypes', task.type),
      task.priority === 'high' && t('высокий приоритет'),
      task.priority === 'low' && t('низкий приоритет'),
   ]
      .filter(Boolean)
      .join(' · ');

   const due = () => {
      if (!task.dueDate) return task.dueLabel || t('срок не задан');
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
            status: statusName(t, event.status),
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
   if (task.relation !== 'none')
      fields.push([
         t(TASK_RELATION_LABELS[task.relation]),
         <Link
            className='text-accent font-medium hover:underline'
            to={`${SECTION_PATHS[TASK_RELATION_SECTIONS[task.relation]]}/${task.relationId}`}
         >
            {targets[task.relation].find(({ id }) => id === task.relationId)
               ?.name ?? t('Открыть')}
         </Link>,
      ]);
   if (task.basis) fields.push([t('Основание'), task.basis]);

   const submitComment = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const text = comment?.trim();
      if (text && (await commenting.run(text))) setComment(null);
   };

   return (
      <Card>
         <div className={SECTION}>
            <div className='flex items-start justify-between gap-3'>
               <div className='text-ink-soft pt-1 text-xs'>{caption}</div>
               <StatusBadge status={task.status} />
            </div>
            <h2 className='text-title mt-2 font-bold'>{task.title}</h2>
            {(task.details || task.context) && (
               <RichText
                  className='text-ink mt-3'
                  html={task.details || textToHtml(task.context)}
               />
            )}
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
                           busy={tickingId === item.id}
                           checked={item.done}
                           label={item.text}
                           onChange={async () => {
                              if (ticking.pending) return;
                              setTickingId(item.id);
                              await ticking.run(item.id);
                              setTickingId('');
                           }}
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
                        aria-busy={commenting.pending || undefined}
                        className='text-accent inline-flex items-center gap-1.5 hover:underline disabled:cursor-not-allowed disabled:opacity-50'
                        disabled={!comment.trim() || commenting.pending}
                     >
                        {commenting.pending && <Spinner className='size-3.5' />}
                        {t('Отправить')}
                     </button>
                     <button
                        type='button'
                        className='text-ink-soft hover:text-ink disabled:opacity-50'
                        disabled={commenting.pending}
                        onClick={() => setComment(null)}
                     >
                        {t('Отмена')}
                     </button>
                  </div>
               </form>
            )}
            <div className='flex flex-wrap gap-2.5'>
               <Button
                  loading={advancing.pending}
                  onClick={() => advancing.run(next.status)}
               >
                  {t(next.label)}
               </Button>
               <Button variant='ghost' onClick={() => setComment('')}>
                  {t('Комментарий')}
               </Button>
            </div>
         </div>
      </Card>
   );
};

export default TaskDetail;

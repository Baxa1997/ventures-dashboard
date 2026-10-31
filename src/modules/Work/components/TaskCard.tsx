import {
   Attachments,
   Avatar,
   Button,
   Checkbox,
   Progress,
   RichTextEditor,
   Tabs,
} from '@shared/components';
import {
   formatNumericDate,
   htmlToText,
   personName,
   textToHtml,
} from '@shared/helpers';
import { toast } from '@shared/helpers/toast';
import { useAttachments, useCurrentUser, useSaveQueue } from '@shared/hooks';
import type {
   Employee,
   Task,
   TaskEvent,
   TaskInput,
   TaskTargets,
} from '@shared/types/work.types';
import clsx from 'clsx';
import {
   Check,
   ListChecks,
   MessageSquare,
   Paperclip,
   Plus,
   RotateCcw,
   Send,
   TextAlignStart,
   X,
} from 'lucide-react';
import {
   type FormEvent,
   useEffect,
   useLayoutEffect,
   useRef,
   useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
   CHECKLIST_MAX,
   COMMENT_MAX,
   CONTEXT_MAX,
   TITLE_MAX,
} from '../constants';
import { isDone, isOverdue, statusName } from '../helpers';
import work from '../services';
import {
   type DetailValues,
   Section,
   StatusSelect,
   TaskDetails,
} from './TaskFields';

export interface TaskActions {
   updateTask: (id: string, patch: Partial<TaskInput>) => Promise<unknown>;
   toggleChecklistItem: (taskId: string, itemId: string) => Promise<unknown>;
   addComment: (taskId: string, text: string) => Promise<unknown>;
}

interface TaskCardProps extends TaskActions {
   task: Task;
   employees: Employee[];
   targets: TaskTargets;
}

type FeedTab = 'comments' | 'history';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// The task as the store has it now, for a change that builds on the last one.
const latest = async (id: string) =>
   (await work.getTasks()).find((task) => task.id === id);

/* A task's card, as the design draws it: the title, the description, the
   files, the checklist and the comments with the history on the left; the
   status with its next step and the details on the right. Every change is
   saved as it is made. */
const TaskCard = ({
   task,
   employees,
   targets,
   updateTask,
   toggleChecklistItem,
   addComment,
}: TaskCardProps) => {
   const { t } = useTranslation('work');
   const user = useCurrentUser();
   const save = useSaveQueue();
   const update = (patch: Partial<TaskInput>, success?: string) =>
      save(() => updateTask(task.id, patch), success);

   // ---- the title: saved when the field is left, or the card closed
   const [title, setTitle] = useState(task.title);
   const typedTitle = useRef(task.title);
   typedTitle.current = title;
   const titleRef = useRef<HTMLTextAreaElement>(null);
   useEffect(() => setTitle(task.title), [task.title]);
   useLayoutEffect(() => {
      const field = titleRef.current;
      if (!field) return;
      field.style.height = 'auto';
      field.style.height = `${field.scrollHeight}px`;
   }, [title]);
   const savedTitle = useRef(task.title);
   savedTitle.current = task.title;
   const saveTitle = () => {
      const value = title.trim();
      if (!value) {
         setTitle(task.title);
         toast.error(t('Введите название задачи'));
         return;
      }
      if (value !== task.title) update({ title: value });
   };
   // the card closed with Esc while the title was being written
   const flushTitle = useRef(() => {});
   flushTitle.current = () => {
      const value = typedTitle.current.trim();
      if (value && value !== savedTitle.current) update({ title: value });
   };

   // ---- the description: saved when the editor is left, or the card closed
   const [details, setDetails] = useState(
      () => task.details || textToHtml(task.context),
   );
   const written = useRef({ html: details, saved: details });
   const saveDetails = useRef(() => {});
   saveDetails.current = () => {
      const { html, saved } = written.current;
      if (html === saved) return;
      written.current.saved = html;
      update({
         details: html,
         context: htmlToText(html).slice(0, CONTEXT_MAX),
      });
   };
   useEffect(
      () => () => {
         flushTitle.current();
         saveDetails.current();
      },
      [],
   );

   // ---- the checklist
   const [item, setItem] = useState('');
   const [hideDone, setHideDone] = useState(false);
   const ticked = task.checklist.filter(({ done }) => done).length;
   const shown = task.checklist.filter(({ done }) => !(hideDone && done));
   const addItem = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const text = item.trim();
      if (!text) return;
      setItem('');
      save(async () => {
         const current = (await latest(task.id)) ?? task;
         await updateTask(task.id, {
            checklist: [
               ...current.checklist,
               { id: crypto.randomUUID(), text, done: false },
            ],
         });
      });
   };
   const removeItem = (itemId: string) =>
      save(async () => {
         const current = (await latest(task.id)) ?? task;
         await updateTask(task.id, {
            checklist: current.checklist.filter(({ id }) => id !== itemId),
         });
      });

   // ---- comments and history
   const [feed, setFeed] = useState<FeedTab>('comments');
   const [comment, setComment] = useState('');
   const comments = task.history.filter(
      (event): event is Extract<TaskEvent, { kind: 'comment' }> =>
         event.kind === 'comment',
   );
   const events = task.history.filter(({ kind }) => kind !== 'comment');
   const sendComment = () => {
      const text = comment.trim();
      if (!text) return;
      setComment('');
      save(() => addComment(task.id, text), t('Комментарий добавлен'));
   };
   const eventText = (event: TaskEvent) => {
      if (event.kind === 'status')
         return t('Статус «{{status}}» · {{name}}', {
            status: statusName(t, event.status),
            name: personName(event.userId),
         });
      if (event.kind === 'recurred')
         return t('Создана автоматически после закрытия предыдущей');
      return event.kind === 'note' ? event.text : '';
   };

   const files = useAttachments({ section: 'task', itemId: task.id });

   // ---- the next step beside the status
   const checkedByOther = !!task.reviewerId && task.reviewerId !== user.id;
   const step = () => {
      if (isDone(task))
         return (
            <Button
               className='h-10'
               hint={t('Вернуть задачу в работу')}
               variant='ghost'
               onClick={() =>
                  update({ status: 'in_progress' }, t('Возвращено в работу'))
               }
            >
               <RotateCcw aria-hidden />
               {t('Вернуть')}
            </Button>
         );
      if (checkedByOther)
         return (
            <Button
               className='h-10'
               disabled={task.status === 'review'}
               hint={
                  task.status === 'review'
                     ? t('Задача уже ждёт согласования')
                     : t('Передать задачу на согласование проверяющему')
               }
               variant='ghost'
               onClick={() =>
                  update({ status: 'review' }, t('Отправлено на согласование'))
               }
            >
               <Send aria-hidden />
               {task.status === 'review'
                  ? t('На согласовании')
                  : t('На согласование')}
            </Button>
         );
      return (
         <Button
            className='h-10'
            hint={
               task.status === 'review'
                  ? t('Согласовать и завершить задачу')
                  : t('Завершить задачу')
            }
            variant='ghost'
            onClick={() => update({ status: 'done' }, t('Задача завершена'))}
         >
            <Check aria-hidden />
            {task.status === 'review' ? t('Согласовать') : t('Завершить')}
         </Button>
      );
   };

   const changeDetails = (patch: Partial<DetailValues>) => {
      // a date typed half-way is not saved, nor a start after the deadline
      if (patch.dueDate && !DATE.test(patch.dueDate)) return;
      if (patch.startDate && !DATE.test(patch.startDate)) return;
      const next = { ...task, ...patch };
      if (next.startDate && next.dueDate && next.startDate > next.dueDate) {
         toast.error(t('Начало позже дедлайна'));
         return;
      }
      update(patch);
   };

   return (
      <div className='grid min-h-0 flex-auto overflow-y-auto md:grid-cols-[minmax(0,1fr)_23.75rem] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden'>
         <div className='grid min-w-0 content-start gap-6.5 px-5 pt-5 pb-7 md:overflow-y-auto md:px-7'>
            <textarea
               ref={titleRef}
               aria-label={t('Название задачи')}
               className='text-ink-strong placeholder:text-ink-faint focus:shadow-[inset_0_-2px_0_var(--color-accent)] w-full resize-none overflow-hidden bg-transparent py-1 text-[26px] leading-tight font-extrabold outline-none'
               maxLength={TITLE_MAX}
               placeholder={t('Название задачи')}
               rows={1}
               value={title}
               onBlur={saveTitle}
               onChange={(event) => setTitle(event.target.value)}
               onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  event.currentTarget.blur();
               }}
            />

            <Section icon={TextAlignStart} title={t('Описание')}>
               <div
                  onBlur={(event) => {
                     if (!event.currentTarget.contains(event.relatedTarget))
                        saveDetails.current();
                  }}
               >
                  <RichTextEditor
                     label={t('Описание')}
                     value={details}
                     onChange={(html) => {
                        written.current.html = html;
                        setDetails(html);
                     }}
                  />
               </div>
            </Section>

            <Section
               count={String(files.length)}
               icon={Paperclip}
               title={t('Вложения')}
            >
               <Attachments
                  editable
                  empty={t('Файлов и ссылок пока нет.')}
                  place={{ section: 'task', itemId: task.id }}
               />
            </Section>

            <Section
               count={`${ticked}/${task.checklist.length}`}
               icon={ListChecks}
               title={t('Чек-лист')}
               action={
                  ticked > 0 && (
                     <button
                        type='button'
                        className='text-accent text-xs font-semibold hover:underline'
                        data-hint={
                           hideDone
                              ? t('Показать выполненные пункты чек-листа')
                              : t('Скрыть выполненные пункты чек-листа')
                        }
                        onClick={() => setHideDone((prev) => !prev)}
                     >
                        {hideDone
                           ? t('Показать выполненные')
                           : t('Скрыть выполненные')}
                     </button>
                  )
               }
            >
               {task.checklist.length > 0 && (
                  <div className='text-ink-soft flex items-center gap-2.5 text-xs'>
                     <span className='w-8 tabular-nums'>
                        {Math.round((ticked / task.checklist.length) * 100)}%
                     </span>
                     <Progress
                        className='flex-1'
                        max={task.checklist.length}
                        value={ticked}
                     />
                  </div>
               )}
               <ul className='grid gap-0.5'>
                  {shown.map((entry) => (
                     <li
                        key={entry.id}
                        className='group hover:bg-hover flex items-center gap-2.5 rounded-md py-1 pr-1 pl-1.5'
                     >
                        <Checkbox
                           checked={entry.done}
                           hint={t('Отметить пункт или снять отметку')}
                           label={entry.text}
                           onChange={() =>
                              save(() =>
                                 toggleChecklistItem(task.id, entry.id),
                              )
                           }
                        />
                        <span
                           className={clsx(
                              'min-w-0 flex-1',
                              entry.done && 'text-ink-faint line-through',
                           )}
                        >
                           {entry.text}
                        </span>
                        <button
                           type='button'
                           aria-label={t('Убрать пункт: {{text}}', {
                              text: entry.text,
                           })}
                           className='text-ink-faint hover:text-danger grid size-6 place-items-center rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100'
                           data-hint={t('Убрать этот пункт')}
                           onClick={() => removeItem(entry.id)}
                        >
                           <X aria-hidden className='size-3.5' />
                        </button>
                     </li>
                  ))}
               </ul>
               <form
                  className='text-ink-faint flex items-center gap-2 px-1.5'
                  onSubmit={addItem}
               >
                  <Plus aria-hidden className='size-4 shrink-0' />
                  <input
                     aria-label={t('Добавить пункт')}
                     className='text-ink placeholder:text-ink-soft min-w-0 flex-1 bg-transparent py-1 outline-none'
                     maxLength={CHECKLIST_MAX}
                     placeholder={t('Добавить пункт')}
                     value={item}
                     onChange={(event) => setItem(event.target.value)}
                  />
               </form>
            </Section>

            <section className='grid min-w-0 gap-3'>
               <div className='border-line border-b'>
                  <Tabs
                     active={feed}
                     label={t('Комментарии и история')}
                     items={[
                        {
                           id: 'comments',
                           label: t('Комментарии'),
                           icon: MessageSquare,
                           count: comments.length,
                        },
                        { id: 'history', label: t('История') },
                     ]}
                     onChange={setFeed}
                  />
               </div>
               {feed === 'comments' ? (
                  <>
                     <form
                        className='flex items-start gap-2.5'
                        onSubmit={(event) => {
                           event.preventDefault();
                           sendComment();
                        }}
                     >
                        <span className='pt-2'>
                           <Avatar name={user.name} />
                        </span>
                        <textarea
                           aria-label={t('Комментарий')}
                           className='field-input min-h-10 resize-y py-2'
                           maxLength={COMMENT_MAX}
                           placeholder={t(
                              'Напишите комментарий… (Enter — отправить, Shift+Enter — новая строка)',
                           )}
                           rows={1}
                           value={comment}
                           onChange={(event) => setComment(event.target.value)}
                           onKeyDown={(event) => {
                              if (event.key !== 'Enter' || event.shiftKey)
                                 return;
                              event.preventDefault();
                              sendComment();
                           }}
                        />
                        <Button
                           className='mt-1.5'
                           disabled={!comment.trim()}
                           hint={t('Отправить комментарий к задаче')}
                           size='sm'
                           type='submit'
                        >
                           {t('Отправить')}
                        </Button>
                     </form>
                     <ul className='grid gap-3'>
                        {comments.map((event) => (
                           <li key={event.id} className='flex items-start gap-2.5'>
                              <Avatar name={personName(event.userId)} />
                              <div className='min-w-0'>
                                 <div className='text-meta'>
                                    <b>{personName(event.userId)}</b>{' '}
                                    <span className='text-ink-faint text-xs'>
                                       {formatNumericDate(event.date)}
                                    </span>
                                 </div>
                                 <p className='bg-ground mt-1 inline-block rounded-[10px] px-3 py-2 break-words whitespace-pre-line'>
                                    {event.text}
                                 </p>
                              </div>
                           </li>
                        ))}
                     </ul>
                  </>
               ) : (
                  <ul className='grid'>
                     {[
                        ...events.map((event) => ({
                           id: event.id,
                           text: eventText(event),
                           date: event.date,
                        })),
                        {
                           id: 'created',
                           text: task.createdById
                              ? t('Создана · {{name}}', {
                                   name: personName(task.createdById),
                                })
                              : t('Создана'),
                           date: task.createdAt,
                        },
                     ].map((line) => (
                        <li
                           key={line.id}
                           className='border-line flex items-baseline gap-3 border-b py-2 last:border-b-0'
                        >
                           <span
                              aria-hidden
                              className='bg-sky size-1.75 shrink-0 translate-y-[-1px] rounded-full'
                           />
                           <span className='min-w-0 flex-1 break-words'>
                              {line.text}
                           </span>
                           <time
                              className='text-ink-faint shrink-0 text-xs'
                              dateTime={line.date}
                           >
                              {formatNumericDate(line.date)}
                           </time>
                        </li>
                     ))}
                  </ul>
               )}
            </section>
         </div>

         <div className='bg-ground border-line grid content-start gap-3.5 border-t p-4 md:overflow-y-auto md:border-t-0 md:border-l'>
            <div className='flex gap-2'>
               <StatusSelect
                  value={task.status}
                  onChange={(status) =>
                     update(
                        { status },
                        t('Статус: {{status}}', {
                           status: statusName(t, status),
                        }),
                     )
                  }
               />
               {step()}
            </div>
            <TaskDetails
               withLinks
               basis={task.basis}
               creatorId={task.createdById}
               employees={employees}
               overdue={isOverdue(task)}
               targets={targets}
               task={task}
               values={task}
               onChange={changeDetails}
            />
            <p className='text-ink-soft px-1 text-xs'>
               {t(
                  'Задача на согласовании появляется у согласующего в «Мой день → Ждут моего согласования».',
               )}
            </p>
         </div>
      </div>
   );
};

export default TaskCard;

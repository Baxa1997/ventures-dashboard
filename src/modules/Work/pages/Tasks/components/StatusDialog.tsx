import {
   TASK_GROUP_LABELS,
   TASK_GROUP_ORDER,
} from '@modules/Work/constants';
import {
   isDone,
   statusFill,
   statusGroup,
   statusName,
   taskKey,
   taskStatuses,
} from '@modules/Work/helpers';
import { Modal, ModalBody, Notice } from '@shared/components';
import { personName } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { Task, TaskStatus } from '@shared/types/work.types';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StatusDialogProps {
   task: Task | null; // null: closed
   onPick: (task: Task, status: TaskStatus) => void;
   onClose: () => void;
}

/* The window a row of «Список» opens from its tick or its status: the statuses
   under their groups, the task's own marked. A click moves the task at once
   and the window closes; the page says so in a note. The task's checker is
   named, since this does not send it to them by itself. */
const StatusDialog = ({ task, onPick, onClose }: StatusDialogProps) => {
   const { t } = useTranslation('work');
   const user = useCurrentUser();
   const listed = taskStatuses().map(({ key }) => key);
   // the task's own even when switched off in Настройки
   const statuses =
      task && !listed.includes(task.status)
         ? [...listed, task.status]
         : listed;
   const checked =
      task?.reviewerId &&
      task.reviewerId !== user.id &&
      task.status !== 'review' &&
      !isDone(task) &&
      listed.includes('review');

   const pick = (status: TaskStatus) => {
      if (task && status !== task.status) onPick(task, status);
      onClose();
   };

   return (
      <Modal
         open={task !== null}
         size='sm'
         subtitle={task && `${taskKey(task)} ${task.title}`}
         title={t('Сменить статус')}
         onClose={onClose}
      >
         {task && (
            <ModalBody>
               <div className='grid gap-4'>
                  {checked && (
                     <Notice>
                        {t(
                           'Эту задачу проверяет {{name}}: чтобы передать её на проверку, выберите «{{status}}».',
                           {
                              name: personName(task.reviewerId),
                              status: statusName(t, 'review'),
                           },
                        )}
                     </Notice>
                  )}
                  {TASK_GROUP_ORDER.map((group) => {
                     const inGroup = statuses.filter(
                        (status) => statusGroup(status) === group,
                     );
                     return (
                        inGroup.length > 0 && (
                           <section key={group}>
                              <h3 className='text-ink-faint mb-1.5 text-[11px] font-bold tracking-[0.06em] uppercase'>
                                 {t(TASK_GROUP_LABELS[group])}
                              </h3>
                              <ul className='grid gap-1.5'>
                                 {inGroup.map((status) => {
                                    const current = status === task.status;
                                    return (
                                       <li key={status}>
                                          <button
                                             type='button'
                                             aria-current={current || undefined}
                                             className={clsx(
                                                'flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors',
                                                current
                                                   ? 'border-accent bg-accent-tint'
                                                   : 'border-line hover:border-line-strong hover:bg-ground',
                                             )}
                                             {...(current && {
                                                'data-autofocus': true,
                                             })}
                                             onClick={() => pick(status)}
                                          >
                                             <span
                                                aria-hidden
                                                className='size-2.5 shrink-0 rounded-full'
                                                style={{
                                                   background:
                                                      statusFill(status),
                                                }}
                                             />
                                             <span className='min-w-0 flex-1'>
                                                {statusName(t, status)}
                                             </span>
                                             {current && (
                                                <Check
                                                   aria-hidden
                                                   className='text-accent size-4 shrink-0'
                                                />
                                             )}
                                          </button>
                                       </li>
                                    );
                                 })}
                              </ul>
                           </section>
                        )
                     );
                  })}
               </div>
            </ModalBody>
         )}
      </Modal>
   );
};

export default StatusDialog;

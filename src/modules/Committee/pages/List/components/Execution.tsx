import { taskDue } from '@modules/Committee/helpers';
import type { CommitteeData } from '@modules/Committee/hooks';
import committee from '@modules/Committee/services';
import { Badge, Card, NoData, Spinner } from '@shared/components';
import { personName } from '@shared/helpers';
import { useAction, useCurrentUser } from '@shared/hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ExecutionProps {
   data: CommitteeData;
}

/* «Исполнение решений»: the conditions of approvals still to be carried
   out. They are tasks of the deals' owners, so ticking one here closes it in
   Задачи too. */
const Execution = ({ data }: ExecutionProps) => {
   const { t } = useTranslation('committee');
   const user = useCurrentUser();
   const finishing = useAction(
      (taskId: string) => committee.setTaskDone(taskId, true, user.id),
      { success: t('Решение отмечено выполненным') },
   );
   // the task being marked, for its spinner
   const [finishingId, setFinishingId] = useState('');
   const open = data.tasks.filter(({ done }) => !done);

   return (
      <Card
         className='flex flex-col'
         hint={t('{{count}} открытый', { count: open.length })}
         title={t('Исполнение решений')}
      >
         {open.length ? (
            <ul className='divide-line divide-y px-4.5'>
               {open.map((task) => {
                  const due = taskDue(t, task);
                  return (
                     <li key={task.id} className='py-3.5'>
                        <div className='font-semibold'>{task.title}</div>
                        <div className='text-ink-soft mt-0.5 text-xs'>
                           {[task.basis, personName(task.ownerId)]
                              .filter(Boolean)
                              .join(' · ')}
                        </div>
                        <div className='mt-2 flex items-center justify-between gap-3'>
                           <Badge tone={due.tone}>{due.label}</Badge>
                           <button
                              type='button'
                              aria-busy={finishingId === task.id || undefined}
                              className='text-ink-soft hover:text-accent inline-flex items-center gap-1.5 text-xs disabled:opacity-50'
                              data-hint={t(
                                 'Закрыть это поручение как выполненное',
                              )}
                              disabled={finishing.pending}
                              onClick={async () => {
                                 setFinishingId(task.id);
                                 await finishing.run(task.id);
                                 setFinishingId('');
                              }}
                           >
                              {finishingId === task.id && (
                                 <Spinner className='size-3.5' />
                              )}
                              {t('Отметить выполненным')}
                           </button>
                        </div>
                     </li>
                  );
               })}
            </ul>
         ) : (
            <NoData>{t('Все решения исполнены')}</NoData>
         )}
      </Card>
   );
};

export default Execution;

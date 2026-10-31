import { useDealLinks } from '@modules/Deals/hooks';
import { TaskLine } from '@modules/Work/components';
import { isDone, statusAfterTick } from '@modules/Work/helpers';
import { openNewTask } from '@modules/Work/hooks';
import work from '@modules/Work/services';
import { Card, NoData } from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import type { Task } from '@shared/types/work.types';
import { useTranslation } from 'react-i18next';

interface TasksCardProps {
   deal: Deal;
}

/* «Открытые задачи» of the deal, the nearest deadline first, as the
   prototype lists them: a row opens the task's card, its box ticks it, and
   «Добавить» starts a task about the deal. */
const TasksCard = ({ deal }: TasksCardProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   const { tasks } = useDealLinks(deal.id);
   const open = tasks
      .filter(
         (task) =>
            task.relation === 'deal' &&
            task.relationId === deal.id &&
            !isDone(task),
      )
      .sort((a, b) =>
         (a.dueDate || '9999').localeCompare(b.dueDate || '9999'),
      );

   const tick = (task: Task) =>
      work.updateTask(
         task.id,
         { status: statusAfterTick(task, user.id) },
         user.id,
      );

   return (
      <Card
         action={
            <button
               type='button'
               className='link'
               data-hint={t('Создать задачу по этой сделке')}
               onClick={() =>
                  openNewTask({ relation: 'deal', relationId: deal.id })
               }
            >
               {t('Добавить')}
            </button>
         }
         hint={open.length || undefined}
         title={t('Открытые задачи')}
      >
         {open.length ? (
            <ul>
               {open.map((task) => (
                  <TaskLine
                     key={task.id}
                     target=''
                     task={task}
                     onTick={tick}
                  />
               ))}
            </ul>
         ) : (
            <NoData>{t('Задач по сделке нет.')}</NoData>
         )}
      </Card>
   );
};

export default TasksCard;

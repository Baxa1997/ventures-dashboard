import { useCompanyTasks } from '@modules/Portfolio/hooks';
import { TaskLine } from '@modules/Work/components';
import { isDone, statusAfterTick } from '@modules/Work/helpers';
import { openNewTask } from '@modules/Work/hooks';
import work from '@modules/Work/services';
import { Button, Card, NoData, Segmented } from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import type { Task } from '@shared/types/work.types';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TasksProps {
   company: PortfolioCompany;
}

type Shown = 'open' | 'all';

/* «Задачи», as the design draws them: the fund's tasks about the company,
   the open ones or all of them, nearest deadline first. A row opens the
   task, its box ticks it; «Новая задача» starts one about the company. The
   whole list and its calendar are in Задачи. */
const Tasks = ({ company }: TasksProps) => {
   const { t } = useTranslation('portfolio');
   const user = useCurrentUser();
   const [shown, setShown] = useState<Shown>('open');
   const tasks = useCompanyTasks(company.id);
   const open = tasks.filter((task) => !isDone(task));
   const rows = shown === 'open' ? open : tasks;

   const tick = (task: Task) =>
      work.updateTask(
         task.id,
         { status: statusAfterTick(task, user.id) },
         user.id,
      );

   return (
      <>
         <div className='mb-3.5 flex flex-wrap items-center gap-2'>
            <Segmented<Shown>
               items={[
                  {
                     id: 'open',
                     label: t('Открытые · {{count}}', { count: open.length }),
                  },
                  {
                     id: 'all',
                     label: t('Все · {{count}}', { count: tasks.length }),
                  },
               ]}
               label={t('Какие задачи')}
               value={shown}
               onChange={setShown}
            />
            <Button
               className='ml-auto'
               hint={t('Создать задачу по этой компании')}
               onClick={() =>
                  openNewTask({ relation: 'portfolio', relationId: company.id })
               }
            >
               <Plus aria-hidden />
               {t('Новая задача')}
            </Button>
         </div>
         <Card className='flex flex-1 flex-col'>
            {rows.length ? (
               <ul>
                  {rows.map((task) => (
                     <TaskLine
                        key={task.id}
                        target=''
                        task={task}
                        onTick={tick}
                     />
                  ))}
               </ul>
            ) : (
               <NoData>{t('Задач по компании нет.')}</NoData>
            )}
         </Card>
      </>
   );
};

export default Tasks;

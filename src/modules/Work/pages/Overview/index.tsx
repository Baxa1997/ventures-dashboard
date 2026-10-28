import { openNewTask } from '@modules/Work/hooks';
import {
   Button,
   buttonClass,
   Card,
   Loading,
   NoData,
   PageBody,
   PageHeader,
} from '@shared/components';
import { MY_DAY_PATH, SECTION_PATHS } from '@shared/constants';
import { formatNumericDate, todayISO } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import { Plus, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
   Attention,
   Figures,
   FunnelChart,
   MyTasks,
   RecentActions,
   SectorDonut,
} from './components';
import { ATTENTION_SHOWN, TASKS_SHOWN } from './constants';
import { firstName } from './helpers';
import { useDashboard } from './hooks';

/* The dashboard: the fund's figures, the deal funnel and the money invested
   by sector, then the signed-in person's open tasks, what needs attention
   and the latest actions of the deals. */
const Overview = () => {
   const { t } = useTranslation('work');
   const { t: tLayout } = useTranslation('layout');
   const user = useCurrentUser();
   const dashboard = useDashboard(user.id);
   const { board } = dashboard;

   return (
      <>
         <PageHeader
            label={tLayout('Дашборд')}
            title={t('Добрый день, {{name}}', {
               name: firstName(user.fullName || user.name),
            })}
            meta={t(
               'Сводка по воронке сделок, портфелю и вашим задачам на {{date}}.',
               { date: formatNumericDate(todayISO()) },
            )}
            actions={
               <>
                  <Link className={buttonClass('ghost')} to={MY_DAY_PATH}>
                     <Sun aria-hidden />
                     {t('Мой день')}
                  </Link>
                  <Button onClick={() => openNewTask()}>
                     <Plus aria-hidden />
                     {t('Новая задача')}
                  </Button>
               </>
            }
         />
         {!board || dashboard.loading ? (
            <Loading />
         ) : (
            <PageBody className='gap-section flex flex-col'>
               <Figures
                  board={board}
                  myTasks={dashboard.myTasks.length}
                  overdueTasks={dashboard.overdueTasks}
               />

               <div className='gap-section grid xl:grid-cols-[1.6fr_1fr]'>
                  <Card
                     title={t('Воронка сделок')}
                     action={
                        <Link className='head-link' to={SECTION_PATHS.deals}>
                           {t('Все сделки')}
                        </Link>
                     }
                  >
                     <FunnelChart bars={board.funnel} />
                  </Card>
                  <Card
                     className='flex flex-col'
                     title={t('Вложено по отраслям')}
                     action={
                        <Link className='head-link' to={SECTION_PATHS.portfolio}>
                           {t('Портфель')}
                        </Link>
                     }
                  >
                     {board.industries.length ? (
                        <SectorDonut sectors={board.industries} />
                     ) : (
                        <NoData>{t('В портфеле пока нет вложений')}</NoData>
                     )}
                  </Card>
               </div>

               <div className='gap-section grid xl:grid-cols-3'>
                  <Card
                     className='flex flex-col'
                     title={t('Мои задачи')}
                     action={
                        <Link
                           className='head-link'
                           to={SECTION_PATHS.tasks}
                        >
                           {t('Все задачи')}
                        </Link>
                     }
                  >
                     {dashboard.myTasks.length ? (
                        <MyTasks
                           targetName={dashboard.targetName}
                           tasks={dashboard.myTasks.slice(0, TASKS_SHOWN)}
                           onTick={dashboard.tickTask}
                        />
                     ) : (
                        <NoData>{t('Открытых задач нет.')}</NoData>
                     )}
                  </Card>
                  <Card
                     className='flex flex-col'
                     title={t('Требует внимания')}
                     action={
                        <span className='text-ink-soft text-xs'>
                           {board.attention.length}
                        </span>
                     }
                  >
                     {board.attention.length ? (
                        <Attention
                           items={board.attention.slice(0, ATTENTION_SHOWN)}
                        />
                     ) : (
                        <NoData>{t('Всё по плану.')}</NoData>
                     )}
                  </Card>
                  <Card className='flex flex-col' title={t('Последние действия')}>
                     {board.recent.length ? (
                        <RecentActions items={board.recent} />
                     ) : (
                        <NoData>{t('Действий пока нет.')}</NoData>
                     )}
                  </Card>
               </div>
            </PageBody>
         )}
      </>
   );
};

export default Overview;

import { formatToday } from '@modules/Work/helpers';
import {
   buttonClass,
   Card,
   Loading,
   NoData,
   PageBody,
   PageHeader,
} from '@shared/components';
import { SECTION_PATHS } from '@shared/constants';
import { useCurrentUser } from '@shared/hooks';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Deadlines, MyDeals, TaskRow, Waiting } from './components';
import { formatRange } from './helpers';
import { useMyDay } from './hooks';

const MyDay = () => {
   const { t } = useTranslation('work');
   const { t: tLayout } = useTranslation('layout');
   const user = useCurrentUser();
   const day = useMyDay(user.id);
   const waitingCount = day.waiting.length + day.waitingTasks.length;

   const meta = [
      formatToday(),
      [
         t('{{count}} дело на неделю', { count: day.openCount }),
         day.overdueCount > 0 &&
            t('{{count}} просрочено', { count: day.overdueCount }),
      ]
         .filter(Boolean)
         .join(', '),
      t('всё, что ждёт именно вас, из сделок, портфеля и задач'),
   ].join(' · ');

   return (
      <>
         <PageHeader
            section={tLayout('Работа')}
            title={t('Мой день')}
            meta={!day.loading && meta}
            actions={
               <Link
                  className={buttonClass('ghost')}
                  to={`${SECTION_PATHS.tasks}?new=1`}
               >
                  {t('Новая задача')}
               </Link>
            }
         />
         <PageBody className='gap-section grid xl:grid-cols-[minmax(0,1fr)_23.75rem]'>
            <Card title={t('Нужно сделать вам')} hint={t('по сроку')}>
               {day.loading ? (
                  <Loading />
               ) : day.items.length ? (
                  <ul className='divide-line divide-y px-5 py-1'>
                     {day.items.map((item) => (
                        <TaskRow
                           key={item.key}
                           item={item}
                           onToggle={day.toggle}
                        />
                     ))}
                  </ul>
               ) : (
                  <NoData>{t('Дел, которые ждут вас, нет')}</NoData>
               )}
            </Card>

            <div className='gap-section flex flex-col'>
               <Card title={t('Ждёте от других')} hint={waitingCount}>
                  {waitingCount ? (
                     <Waiting items={day.waiting} tasks={day.waitingTasks} />
                  ) : (
                     <NoData>{t('Вы ни от кого не ждёте ответа')}</NoData>
                  )}
               </Card>
               <Card
                  title={t('Сроки на неделю')}
                  hint={formatRange(day.week.start, day.week.end)}
                  action={
                     <Link className='link' to={SECTION_PATHS.tasks}>
                        {t('Календарь')}
                     </Link>
                  }
               >
                  {day.deadlines.length ? (
                     <Deadlines items={day.deadlines} />
                  ) : (
                     <NoData>{t('На этой неделе сроков нет')}</NoData>
                  )}
               </Card>
               <Card
                  className='flex-1'
                  title={t('Мои сделки')}
                  hint={day.deals.length}
                  action={
                     <Link className='link' to={SECTION_PATHS.deals}>
                        {t('Воронка')}
                     </Link>
                  }
               >
                  {day.deals.length ? (
                     <MyDeals deals={day.deals} />
                  ) : (
                     <NoData>{t('Сделок, которые ведёте вы, нет')}</NoData>
                  )}
               </Card>
               <div className='px-4'>
                  <h2 className='text-meta font-semibold'>
                     {t('Напоминания')}
                  </h2>
                  <p className='text-ink-soft mt-1 text-xs leading-4.25'>
                     {t(
                        'Каждый день в 09:00 письмо на рабочую почту, если есть сроки. Если сроков нет — письма нет.',
                     )}
                  </p>
               </div>
            </div>
         </PageBody>
      </>
   );
};

export default MyDay;

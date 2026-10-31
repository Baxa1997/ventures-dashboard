import { openNewTask } from '@modules/Work/hooks';
import {
   getAssigneeId,
   queueWording,
   todayISO,
} from '@modules/Work/helpers';
import {
   Button,
   Card,
   Loading,
   NoData,
   PageBody,
   PageHeader,
   Tabs,
} from '@shared/components';
import { formatNumericDate } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { QueueItem, Task } from '@shared/types/work.types';
import { ListChecks, Plus, Stamp } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import {
   Approvals,
   DayList,
   QuickAdd,
   Schedule,
   SendBackDialog,
   type SendBackTarget,
   Upcoming,
} from './components';
import { UPCOMING_SHOWN } from './constants';
import { formatDayTitle, toTab } from './helpers';
import { useMyDay } from './hooks';

/* Мой день, as the design draws it: the person's tasks by deadline and what
   waits for their approval, in two tabs, beside today's schedule and the
   deadlines ahead. */
const MyDay = () => {
   const { t } = useTranslation('work');
   const { t: tDeals } = useTranslation('deals');
   const user = useCurrentUser();
   const day = useMyDay(user.id);
   const [params, setParams] = useSearchParams();
   const tab = toTab(params.get('tab'));
   const [sendingBack, setSendingBack] = useState<SendBackTarget | null>(null);
   const today = todayISO();
   const dueNow = day.overdue.length + day.today.length;

   const sendBackTask = (task: Task) =>
      setSendingBack({
         title: task.title,
         personId: getAssigneeId(task),
         send: (note) =>
            day.sendBack(
               task,
               t('Возвращено на доработку: {{note}}', { note }),
            ),
      });
   const sendBackRecord = (item: QueueItem) =>
      setSendingBack({
         title: queueWording(t, tDeals, item).title,
         personId: item.decision?.preparedById ?? '',
         send: (note) => day.sendBackRecord(item, note),
      });

   const meta = `${formatDayTitle(today)}. ${[
      t('{{count}} встреча', { count: day.schedule.length }),
      t('{{count}} задача на сегодня', { count: dueNow }),
      t('{{count}} ждёт вашего согласования', {
         count: day.approvals.length,
      }),
   ].join(', ')}.`;

   return (
      <>
         <PageHeader
            title={t('Мой день')}
            meta={!day.loading && meta}
            actions={
               <Button
                  hint={t('Создать задачу со сроком на сегодня')}
                  onClick={() => openNewTask({ dueDate: today })}
               >
                  <Plus aria-hidden />
                  {t('Задача на сегодня')}
               </Button>
            }
         >
            <Tabs
               active={tab}
               label={t('Мой день')}
               items={[
                  {
                     id: 'mine',
                     label: t('Мои задачи'),
                     icon: ListChecks,
                     count: dueNow || undefined,
                  },
                  {
                     id: 'approve',
                     label: t('Ждут моего согласования'),
                     icon: Stamp,
                     count: day.approvals.length || undefined,
                  },
               ]}
               onChange={(id) =>
                  setParams(id === 'mine' ? {} : { tab: id }, { replace: true })
               }
            />
         </PageHeader>
         <PageBody className='gap-section grid items-start xl:grid-cols-[minmax(0,1fr)_21.25rem]'>
            {tab === 'mine' ? (
               <Card>
                  <QuickAdd onAdd={day.addToday} />
                  {day.loading ? (
                     <Loading />
                  ) : (
                     <DayList
                        day={day}
                        targetName={day.targetName}
                        onTickItem={day.tickItem}
                        onTickTask={day.tickTask}
                     />
                  )}
               </Card>
            ) : (
               <Card
                  title={t('Ждут моего согласования')}
                  action={
                     <span className='text-ink-soft text-xs'>
                        {day.approvals.length}
                     </span>
                  }
               >
                  {day.loading ? (
                     <Loading />
                  ) : day.approvals.length ? (
                     <Approvals
                        approvals={day.approvals}
                        targetName={day.targetName}
                        onApprove={day.approve}
                        onApproveMemo={day.approveMemo}
                        onApproveRecord={day.approveRecord}
                        onSendBack={sendBackTask}
                        onSendBackRecord={sendBackRecord}
                     />
                  ) : (
                     <NoData>
                        {t('Сейчас ничего не ждёт вашего согласования.')}
                     </NoData>
                  )}
                  <p className='border-line text-ink-soft border-t px-3.5 py-2.5 text-xs'>
                     {t(
                        'Сюда попадают задачи на проверке, где вы согласующий, меморандумы, которые вы утверждаете как спонсор, скрининги, где вы второй оценщик, договоры на согласовании и закупки дороже лимита категории',
                     )}
                  </p>
               </Card>
            )}

            <div className='gap-section grid'>
               <Card
                  title={t('Расписание')}
                  action={
                     <span className='text-ink-soft text-xs'>
                        {formatNumericDate(today)}
                     </span>
                  }
               >
                  {day.schedule.length ? (
                     <Schedule items={day.schedule} />
                  ) : (
                     <NoData>{t('Встреч нет.')}</NoData>
                  )}
               </Card>
               <Card title={t('Ближайшие сроки')}>
                  {day.upcoming.length ? (
                     <Upcoming items={day.upcoming.slice(0, UPCOMING_SHOWN)} />
                  ) : (
                     <NoData>{t('Сроков на две недели нет.')}</NoData>
                  )}
               </Card>
            </div>
         </PageBody>

         <SendBackDialog
            target={sendingBack}
            onClose={() => setSendingBack(null)}
         />
      </>
   );
};

export default MyDay;

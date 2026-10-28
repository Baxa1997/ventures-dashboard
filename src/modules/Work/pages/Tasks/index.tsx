import {
   statusAfterTick,
   statusName,
   targetNameOf,
} from '@modules/Work/helpers';
import { openNewTask, openTask, useTasks } from '@modules/Work/hooks';
import { Button, Loading, PageBody, PageHeader } from '@shared/components';
import { toast } from '@shared/helpers/toast';
import { useCurrentUser, useServiceData } from '@shared/hooks';
import attachments from '@shared/services/attachments';
import type { Task, TaskStatus } from '@shared/types/work.types';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import {
   TaskBoard,
   TaskCalendar,
   TaskTable,
   TaskTimeline,
   Toolbar,
} from './components';
import {
   byDeadline,
   selectTasks,
   type TaskFilters,
   toView,
   toWho,
} from './helpers';

const loadAttachments = () => attachments.getAll();
const subscribeAttachments = (listener: () => void) =>
   attachments.subscribe(listener);

/* Задачи, as the design draws them: the team's tasks as a list, a board by
   status, a month calendar or a timeline, the person's own or everybody's.
   A task opens as its card over the page; a link with ?task= opens one, and
   ?new=1 the form for a new one. */
const Tasks = () => {
   const { t } = useTranslation('work');
   const user = useCurrentUser();
   const { tasks, targets, loading, updateTask } = useTasks();
   const [params, setParams] = useSearchParams();
   const view = toView(params.get('view'));
   const who = toWho(params.get('who'));
   const [filters, setFilters] = useState<TaskFilters>({
      type: '',
      query: '',
   });
   const files = useServiceData(loadAttachments, subscribeAttachments);

   const linked = params.get('task');
   const asked = params.has('new');
   useEffect(() => {
      if (!linked && !asked) return;
      if (linked) openTask(linked);
      else openNewTask();
      setParams(
         (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('task');
            next.delete('new');
            return next;
         },
         { replace: true },
      );
   }, [linked, asked, setParams]);

   // the view and whose tasks stay in the address; the defaults are left out
   const setParam = (key: 'view' | 'who', value: string, initial: string) =>
      setParams(
         (prev) => {
            const next = new URLSearchParams(prev);
            if (value === initial) next.delete(key);
            else next.set(key, value);
            return next;
         },
         { replace: true },
      );

   const targetName = (task: Task) => targetNameOf(targets, task);
   const shown = useMemo(
      () =>
         byDeadline(
            selectTasks(tasks, who, filters, user.id, (task) =>
               targetNameOf(targets, task),
            ),
         ),
      [tasks, who, filters, user.id, targets],
   );
   const fileCounts = useMemo(() => {
      const counts = new Map<string, number>();
      for (const item of files ?? [])
         if (item.section === 'task')
            counts.set(item.itemId, (counts.get(item.itemId) ?? 0) + 1);
      return counts;
   }, [files]);

   const tick = (task: Task) =>
      updateTask(task.id, { status: statusAfterTick(task, user.id) });
   const move = async (task: Task, status: TaskStatus) => {
      try {
         await updateTask(task.id, { status });
         toast.success(
            t('Статус: {{status}}', { status: statusName(t, status) }),
         );
      } catch {
         toast.error(t('Не удалось сменить статус'));
      }
   };

   const content = () => {
      if (loading) return <Loading />;
      if (view === 'board')
         return (
            <TaskBoard tasks={shown} targetName={targetName} onMove={move} />
         );
      if (view === 'calendar') return <TaskCalendar tasks={shown} />;
      if (view === 'timeline') return <TaskTimeline tasks={shown} />;
      return (
         <TaskTable
            files={fileCounts}
            targetName={targetName}
            tasks={shown}
            onTick={tick}
         />
      );
   };

   return (
      <>
         <PageHeader
            title={t('Задачи')}
            meta={t(
               'Задачи команды по сделкам, портфелю и фонду. Типы и статусы настраиваются в разделе «Настройки».',
            )}
            actions={
               <Button onClick={() => openNewTask()}>
                  <Plus aria-hidden />
                  {t('Новая задача')}
               </Button>
            }
         />
         <PageBody>
            <Toolbar
               filters={filters}
               view={view}
               who={who}
               onFilter={(patch) =>
                  setFilters((prev) => ({ ...prev, ...patch }))
               }
               onView={(next) => setParam('view', next, 'list')}
               onWho={(next) => setParam('who', next, 'me')}
            />
            {content()}
         </PageBody>
      </>
   );
};

export default Tasks;

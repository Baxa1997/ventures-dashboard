import contracts from '@modules/Contracts/services';
import deals from '@modules/Deals/services';
import procurement from '@modules/Procurement/services';
import {
   getInitialValues,
   myDayOf,
   statusAfterTick,
   targetNameOf,
   todayISO,
} from '@modules/Work/helpers';
import { useTasks, useWorkQuery } from '@modules/Work/hooks';
import work from '@modules/Work/services';
import type {
   QueueItem,
   ScheduleItem,
   Task,
   UpcomingItem,
} from '@shared/types/work.types';
import { useMemo } from 'react';

const NO_QUEUE: QueueItem[] = [];
const NO_SCHEDULE: ScheduleItem[] = [];
const NO_UPCOMING: UpcomingItem[] = [];

// The signed-in person's day: their work by deadline, what waits for their
// approval, today's meetings and the deadlines ahead, with what they do there.
const useMyDay = (userId: string) => {
   const { tasks, targets, loading, createTask, updateTask, addComment } =
      useTasks();
   const queue = useWorkQuery(() => work.getQueue(userId), NO_QUEUE, [userId]);
   const schedule = useWorkQuery(
      () => work.getSchedule(userId),
      NO_SCHEDULE,
      [userId],
   );
   const upcoming = useWorkQuery(
      () => work.getUpcoming(userId),
      NO_UPCOMING,
      [userId],
   );

   const day = useMemo(
      () => myDayOf(tasks, queue.data, userId),
      [tasks, queue.data, userId],
   );

   return {
      ...day,
      schedule: schedule.data,
      upcoming: upcoming.data,
      loading: loading || queue.loading,
      targetName: (task: Task) => targetNameOf(targets, task),
      // ticking a task closes it, or sends it to whoever checks it
      tickTask: (task: Task) =>
         updateTask(task.id, { status: statusAfterTick(task, userId) }),
      tickItem: (item: QueueItem, done: boolean) =>
         work.setQueueItemDone(item.id, done),
      // «Быстро добавить»: a task of the person's own, due today
      addToday: (title: string) =>
         createTask({
            ...getInitialValues(undefined, userId),
            title,
            dueDate: todayISO(),
            checklist: [],
         }),
      approve: (task: Task) => updateTask(task.id, { status: 'done' }),
      // the note goes to the task's comments, the task back to work
      sendBack: async (task: Task, note: string) => {
         await addComment(task.id, note);
         await updateTask(task.id, { status: 'in_progress' });
      },
      approveMemo: (dealId: string) => deals.approveMemo(dealId, userId),
      // a contract counts as signed; a purchase goes on to the next stage
      approveRecord: ({ kind, recordId }: QueueItem) =>
         kind === 'contract'
            ? contracts.approve(recordId ?? '')
            : procurement.approve(recordId ?? '', userId),
      // a contract back to its draft; a purchase back to whoever asked for it
      sendBackRecord: ({ kind, recordId }: QueueItem, note: string) =>
         kind === 'contract'
            ? contracts.sendBack(recordId ?? '', note)
            : procurement.sendBack(recordId ?? '', note),
   };
};

export default useMyDay;

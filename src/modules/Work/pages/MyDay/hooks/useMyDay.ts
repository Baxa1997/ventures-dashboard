import {
   getAssigneeId,
   statusAfterTick,
   todayISO,
} from '@modules/Work/helpers';
import { useTasks, useWorkQuery } from '@modules/Work/hooks';
import work from '@modules/Work/services';
import type {
   MyDeal,
   QueueItem,
   WaitingItem,
   WeekDeadline,
} from '@shared/types/work.types';
import { useMemo } from 'react';
import { type DayItem, getDeadlineWeek, toDayItems } from '../helpers';

const NO_QUEUE: QueueItem[] = [];
const NO_WAITING: WaitingItem[] = [];
const NO_DEALS: MyDeal[] = [];
const NO_DEADLINES: WeekDeadline[] = [];

// The signed-in person's day: what they have to do, what they wait for, the
// deals they run and the fund's deadlines of the coming work week.
const useMyDay = (userId: string) => {
   const { tasks, loading, updateTask } = useTasks();
   const queue = useWorkQuery(() => work.getQueue(userId), NO_QUEUE, [userId]);
   const waiting = useWorkQuery(() => work.getWaiting(userId), NO_WAITING, [
      userId,
   ]);
   const deals = useWorkQuery(() => work.getMyDeals(userId), NO_DEALS, [
      userId,
   ]);
   const deadlines = useWorkQuery(() => work.getDeadlines(), NO_DEADLINES, []);

   const day = useMemo(() => {
      const today = todayISO();
      const items = toDayItems(queue.data, tasks, userId, today);
      const open = items.filter((item) => !item.done);
      const week = getDeadlineWeek(today);
      return {
         week,
         deadlines: deadlines.data
            .filter(({ date }) => date >= week.start && date <= week.end)
            .sort((a, b) => a.date.localeCompare(b.date)),
         items,
         openCount: open.length,
         overdueCount: open.filter(({ dueDate }) => dueDate && dueDate < today)
            .length,
         // my tasks that stand still until somebody answers
         waitingTasks: tasks.filter(
            (task) =>
               task.status === 'waiting' && getAssigneeId(task) === userId,
         ),
      };
   }, [queue.data, tasks, userId, deadlines.data]);

   const toggle = (item: DayItem) =>
      item.kind === 'queue'
         ? work.setQueueItemDone(item.item.id, !item.done)
         : updateTask(item.task.id, {
              status: statusAfterTick(item.task, userId),
           });

   return {
      ...day,
      waiting: waiting.data,
      deals: deals.data,
      loading: loading || queue.loading,
      toggle,
   };
};

export default useMyDay;

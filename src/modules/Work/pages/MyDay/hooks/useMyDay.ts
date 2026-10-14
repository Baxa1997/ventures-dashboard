import { getAssigneeId, todayISO } from '@modules/Work/helpers';
import { useTasks, useWorkQuery } from '@modules/Work/hooks';
import work from '@modules/Work/services';
import type {
   MyDeal,
   QueueItem,
   WaitingItem,
} from '@shared/types/work.types';
import { useMemo } from 'react';
import { type DayItem, statusAfterTick, toDayItems } from '../helpers';

const NO_QUEUE: QueueItem[] = [];
const NO_WAITING: WaitingItem[] = [];
const NO_DEALS: MyDeal[] = [];

// The signed-in person's day: what they have to do, what they wait for and
// the deals they run.
const useMyDay = (userId: string) => {
   const { tasks, loading, updateTask } = useTasks();
   const queue = useWorkQuery(() => work.getQueue(userId), NO_QUEUE, [userId]);
   const waiting = useWorkQuery(() => work.getWaiting(userId), NO_WAITING, [
      userId,
   ]);
   const deals = useWorkQuery(() => work.getMyDeals(userId), NO_DEALS, [
      userId,
   ]);

   const day = useMemo(() => {
      const today = todayISO();
      const items = toDayItems(queue.data, tasks, userId, today);
      const open = items.filter((item) => !item.done);
      return {
         items,
         openCount: open.length,
         overdueCount: open.filter(
            ({ dueDate }) => dueDate && dueDate < today,
         ).length,
         // my tasks that stand still until somebody answers
         waitingTasks: tasks.filter(
            (task) =>
               task.status === 'waiting' && getAssigneeId(task) === userId,
         ),
      };
   }, [queue.data, tasks, userId]);

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

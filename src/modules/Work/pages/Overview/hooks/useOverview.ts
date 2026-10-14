import { todayISO } from '@modules/Work/helpers';
import { useWorkQuery } from '@modules/Work/hooks';
import work from '@modules/Work/services';
import type {
   FundOverview,
   QueueItem,
   WeekDeadline,
} from '@shared/types/work.types';
import { useMemo } from 'react';
import { getDeadlineWeek } from '../helpers';

const NO_QUEUE: QueueItem[] = [];
const NO_DEADLINES: WeekDeadline[] = [];

// What the overview shows: the fund's figures, the decisions that wait for
// the signed-in person and the deadlines of the coming work week.
const useOverview = (userId: string) => {
   const fund = useWorkQuery<FundOverview | null>(
      () => work.getFundOverview(),
      null,
      [],
   );
   const queue = useWorkQuery(() => work.getQueue(userId), NO_QUEUE, [userId]);
   const deadlines = useWorkQuery(() => work.getDeadlines(), NO_DEADLINES, []);

   return useMemo(() => {
      const week = getDeadlineWeek(todayISO());
      return {
         fund: fund.data,
         decisions: queue.data.filter(
            (item) => item.decision && !item.completedAt,
         ),
         week,
         deadlines: deadlines.data
            .filter(({ date }) => date >= week.start && date <= week.end)
            .sort((a, b) => a.date.localeCompare(b.date)),
      };
   }, [fund.data, queue.data, deadlines.data]);
};

export default useOverview;

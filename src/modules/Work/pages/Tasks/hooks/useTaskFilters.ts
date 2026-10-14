import type { Task } from '@shared/types/work.types';
import { useMemo, useState } from 'react';
import type { TaskTab } from '../constants';
import {
   countByTab,
   INITIAL_FILTERS,
   selectTasks,
   summarize,
   type TaskFilters,
} from '../helpers';

// The tab counters and the header figures cover every task; the search and
// the filters narrow only the list.
const useTaskFilters = (tasks: Task[], tab: TaskTab, userId: string) => {
   const [filters, setFilters] = useState<TaskFilters>(INITIAL_FILTERS);

   const counts = useMemo(() => countByTab(tasks, userId), [tasks, userId]);
   const summary = useMemo(() => summarize(tasks), [tasks]);
   const visible = useMemo(
      () => selectTasks(tasks, tab, userId, filters),
      [tasks, tab, userId, filters],
   );

   const setFilter = <K extends keyof TaskFilters>(
      key: K,
      value: TaskFilters[K],
   ) => setFilters((prev) => ({ ...prev, [key]: value }));

   return { filters, setFilter, visible, counts, summary };
};

export default useTaskFilters;

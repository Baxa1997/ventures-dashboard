import { listOf, nameOf } from '@modules/Settings/services';
import { Segmented } from '@shared/components';
import {
   CalendarDays,
   Columns3,
   GanttChart,
   List,
   type LucideIcon,
   Search,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
   TASK_VIEW_LABELS,
   TASK_VIEWS,
   TASK_WHO,
   TASK_WHO_LABELS,
   type TaskView,
   type TaskWho,
} from '../constants';
import type { TaskFilters } from '../helpers';

const VIEW_ICONS: Record<TaskView, LucideIcon> = {
   list: List,
   board: Columns3,
   calendar: CalendarDays,
   timeline: GanttChart,
};

interface ToolbarProps {
   view: TaskView;
   who: TaskWho;
   filters: TaskFilters;
   onView: (view: TaskView) => void;
   onWho: (who: TaskWho) => void;
   onFilter: (patch: Partial<TaskFilters>) => void;
}

// The view, whose tasks, their type, and the search, in one row.
const Toolbar = ({
   view,
   who,
   filters,
   onView,
   onWho,
   onFilter,
}: ToolbarProps) => {
   const { t } = useTranslation('work');

   return (
      <div className='mb-3.5 flex flex-wrap items-center gap-2'>
         <Segmented
            items={TASK_VIEWS.map((id) => ({
               id,
               label: t(TASK_VIEW_LABELS[id]),
               icon: VIEW_ICONS[id],
            }))}
            label={t('Вид')}
            value={view}
            onChange={onView}
         />
         <Segmented
            items={TASK_WHO.map((id) => ({
               id,
               label: t(TASK_WHO_LABELS[id]),
            }))}
            label={t('Чьи задачи')}
            value={who}
            onChange={onWho}
         />
         <select
            aria-label={t('Тип задачи')}
            className='field-input w-auto bg-white pr-8'
            value={filters.type}
            onChange={(event) => onFilter({ type: event.target.value })}
         >
            <option value=''>{t('Все типы')}</option>
            {listOf('taskTypes').map((item) => (
               <option key={item.key} value={item.key}>
                  {nameOf(item)}
               </option>
            ))}
         </select>
         <label className='relative w-full sm:ml-auto sm:w-60'>
            <Search
               aria-hidden
               className='text-ink-faint pointer-events-none absolute top-2.5 left-2.5 size-4'
            />
            <input
               aria-label={t('Найти задачу или сделку')}
               className='field-input bg-white pl-8.5'
               placeholder={t('Найти задачу или сделку')}
               type='search'
               value={filters.query}
               onChange={(event) => onFilter({ query: event.target.value })}
            />
         </label>
      </div>
   );
};

export default Toolbar;

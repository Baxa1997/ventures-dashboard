import { Segmented } from '@shared/components';
import type { Deal } from '@shared/types/deals.types';
import {
   Columns3,
   GanttChart,
   type LucideIcon,
   Search,
   Table2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
   DEAL_VIEW_LABELS,
   DEAL_VIEWS,
   type DealView,
   type StageFilter,
} from '../constants';
import {
   industryOptions,
   ownerOptions,
   stageFilterOptions,
} from '../helpers';

const VIEW_ICONS: Record<DealView, LucideIcon> = {
   table: Table2,
   board: Columns3,
   timeline: GanttChart,
};

export interface DealFilters {
   industry: string; // an industries key, '' — every industry
   ownerId: string; // '' — every manager
   query: string;
}

interface DealsToolbarProps {
   deals: Deal[];
   view: DealView;
   stage: StageFilter;
   filters: DealFilters;
   onView: (view: DealView) => void;
   onStage: (stage: StageFilter) => void;
   onFilter: (patch: Partial<DealFilters>) => void;
}

const SELECT = 'field-input w-auto bg-white pr-8';

// The view, the stage, the industry, the manager and the search, in a row.
const DealsToolbar = ({
   deals,
   view,
   stage,
   filters,
   onView,
   onStage,
   onFilter,
}: DealsToolbarProps) => {
   const { t } = useTranslation('deals');

   return (
      <div className='mb-3.5 flex flex-wrap items-center gap-2'>
         <Segmented
            items={DEAL_VIEWS.map((id) => ({
               id,
               label: t(DEAL_VIEW_LABELS[id]),
               icon: VIEW_ICONS[id],
            }))}
            label={t('Вид')}
            value={view}
            onChange={onView}
         />
         <select
            aria-label={t('Этап')}
            className={SELECT}
            value={stage}
            onChange={(event) => onStage(event.target.value as StageFilter)}
         >
            {stageFilterOptions(t).map(({ value, label }) => (
               <option key={value} value={value}>
                  {label}
               </option>
            ))}
         </select>
         <select
            aria-label={t('Отрасль')}
            className={SELECT}
            value={filters.industry}
            onChange={(event) => onFilter({ industry: event.target.value })}
         >
            <option value=''>{t('Все отрасли')}</option>
            {industryOptions().map(({ value, label }) => (
               <option key={value} value={value}>
                  {label}
               </option>
            ))}
         </select>
         <select
            aria-label={t('Менеджер')}
            className={SELECT}
            value={filters.ownerId}
            onChange={(event) => onFilter({ ownerId: event.target.value })}
         >
            <option value=''>{t('Все менеджеры')}</option>
            {ownerOptions(deals).map(({ value, label }) => (
               <option key={value} value={value}>
                  {label}
               </option>
            ))}
         </select>
         <label className='relative w-full sm:ml-auto sm:w-60'>
            <Search
               aria-hidden
               className='text-ink-faint pointer-events-none absolute top-2.5 left-2.5 size-4'
            />
            <input
               aria-label={t('Найти стартап')}
               className='field-input bg-white pl-8.5'
               placeholder={t('Найти стартап')}
               type='search'
               value={filters.query}
               onChange={(event) => onFilter({ query: event.target.value })}
            />
         </label>
      </div>
   );
};

export default DealsToolbar;

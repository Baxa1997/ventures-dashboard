import {
   TASK_RELATION_LABELS,
   TASK_RELATION_ORDER,
   TASK_TYPE_LABELS,
   TASK_TYPE_ORDER,
} from '@modules/Work/constants';
import { shortName } from '@modules/Work/helpers';
import { FilterBar, FilterSelect } from '@shared/components';
import type { Employee } from '@shared/types/work.types';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ALL } from '../constants';
import type { TaskFilters } from '../helpers';

interface ToolbarProps {
   filters: TaskFilters;
   employees: Employee[];
   onFilter: <K extends keyof TaskFilters>(
      key: K,
      value: TaskFilters[K],
   ) => void;
}

const Toolbar = ({ filters, employees, onFilter }: ToolbarProps) => {
   const { t } = useTranslation('work');
   const all = { value: ALL, label: t('все') };

   return (
      <FilterBar>
         <div className='relative w-full sm:w-70'>
            <Search
               aria-hidden
               className='text-ink-soft pointer-events-none absolute top-2.5 left-3 size-4'
            />
            <input
               aria-label={t('Поиск по задачам')}
               className='field-input text-meta h-9 pl-9'
               placeholder={t('Поиск по задачам')}
               type='search'
               value={filters.search}
               onChange={(event) => onFilter('search', event.target.value)}
            />
         </div>
         <FilterSelect
            label={t('Исполнитель')}
            options={[
               all,
               ...employees.map(({ id, name }) => ({
                  value: id,
                  label: shortName(name),
               })),
            ]}
            value={filters.assigneeId}
            onChange={(value) => onFilter('assigneeId', value)}
         />
         <FilterSelect
            label={t('Тип')}
            options={[
               all,
               ...TASK_TYPE_ORDER.map((type) => ({
                  value: type,
                  label: t(TASK_TYPE_LABELS[type]),
               })),
            ]}
            value={filters.type}
            onChange={(value) => onFilter('type', value)}
         />
         <FilterSelect
            label={t('Связано с')}
            options={[
               all,
               ...TASK_RELATION_ORDER.map((relation) => ({
                  value: relation,
                  label: t(TASK_RELATION_LABELS[relation]),
               })),
            ]}
            value={filters.relation}
            onChange={(value) => onFilter('relation', value)}
         />
         <span className='text-ink-soft text-meta ml-auto pr-1'>
            {t('Сортировка: по сроку')}
         </span>
      </FilterBar>
   );
};

export default Toolbar;

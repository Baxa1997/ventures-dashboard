import { Tabs as TabList } from '@shared/components';
import { useTranslation } from 'react-i18next';
import { TASK_TAB_LABELS, TASK_TABS, type TaskTab } from '../constants';

interface TabsProps {
   active: TaskTab;
   counts: Record<TaskTab, number>;
   onChange: (tab: TaskTab) => void;
}

const Tabs = ({ active, counts, onChange }: TabsProps) => {
   const { t } = useTranslation('work');

   return (
      <TabList
         active={active}
         items={TASK_TABS.map((tab) => ({
            id: tab,
            label: t(TASK_TAB_LABELS[tab]),
            // the list of finished tasks only grows, so it has no counter
            count: tab === 'done' ? undefined : counts[tab],
         }))}
         label={t('Задачи')}
         onChange={onChange}
      />
   );
};

export default Tabs;

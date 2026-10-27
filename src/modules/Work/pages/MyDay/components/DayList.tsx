import { TaskLine } from '@modules/Work/components';
import type { DayItem, MyDayGroups } from '@modules/Work/helpers';
import { NoData } from '@shared/components';
import type { QueueItem, Task } from '@shared/types/work.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { DAY_GROUP_LABELS } from '../constants';
import QueueLine from './QueueLine';

interface DayListProps {
   day: MyDayGroups;
   targetName: (task: Task) => string;
   onTickTask: (task: Task) => Promise<unknown>;
   onTickItem: (item: QueueItem, done: boolean) => Promise<unknown>;
}

const GROUPS = ['overdue', 'today', 'week', 'done'] as const;

// «Мои задачи»: what is overdue, due today, due this week and closed today.
const DayList = ({ day, targetName, onTickTask, onTickItem }: DayListProps) => {
   const { t } = useTranslation('work');
   const groups = GROUPS.filter((group) => day[group].length);

   if (!groups.length) return <NoData>{t('На сегодня задач нет.')}</NoData>;

   const line = (item: DayItem) =>
      item.kind === 'task' ? (
         <TaskLine
            key={item.key}
            target={targetName(item.task)}
            task={item.task}
            onTick={onTickTask}
         />
      ) : (
         <QueueLine
            key={item.key}
            done={item.done}
            item={item.item}
            onTick={onTickItem}
         />
      );

   return groups.map((group) => (
      <section key={group} className='border-line border-b last:border-b-0'>
         <h3
            className={clsx(
               'bg-ground border-line border-b px-4.5 py-1.75 text-xs font-bold',
               group === 'overdue' ? 'text-danger' : 'text-ink-faint',
            )}
         >
            {t(DAY_GROUP_LABELS[group])} · {day[group].length}
         </h3>
         <ul>{day[group].map(line)}</ul>
      </section>
   ));
};

export default DayList;

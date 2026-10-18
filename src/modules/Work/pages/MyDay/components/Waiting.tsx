import { TASK_TYPE_LABELS } from '@modules/Work/constants';
import { formatDate } from '@modules/Work/helpers';
import type { Task, WaitingItem } from '@shared/types/work.types';
import { useTranslation } from 'react-i18next';
import { WAITING_SOURCE_LABELS } from '../constants';

interface WaitingProps {
   items: WaitingItem[];
   tasks: Task[]; // the person's tasks in the "Ждёт ответа" status
}

// Answers the person waits for: from whom, what, and since or until when.
const Waiting = ({ items, tasks }: WaitingProps) => {
   const { t } = useTranslation('work');

   const when = ({ when, date }: WaitingItem) => {
      const day = formatDate(date);
      if (when === 'until') return t('до {{date}}', { date: day });
      if (when === 'since') return t('с {{date}}', { date: day });
      return t('после {{date}}', { date: day });
   };

   const rows = [
      ...items.map((item) => ({
         id: item.id,
         from:
            item.source === 'colleague'
               ? item.from
               : `${item.from} · ${t(WAITING_SOURCE_LABELS[item.source])}`,
         // a company's missing report is named by its quarter, 2026-Q3
         title:
            item.source === 'company'
               ? t('Отчёт за {{quarter}}', {
                    quarter: item.title.replace(/^(\d{4})-Q(\d)$/, 'Q$2 $1'),
                 })
               : item.title,
         when: when(item),
      })),
      ...tasks.map((task) => ({
         id: task.id,
         from: [t(TASK_TYPE_LABELS[task.type]), task.context]
            .filter(Boolean)
            .join(' · '),
         title: task.title,
         when:
            task.dueDate &&
            t('до {{date}}', { date: formatDate(task.dueDate) }),
      })),
   ];

   return (
      <ul className='divide-line divide-y px-5 py-1'>
         {rows.map((row) => (
            <li key={row.id} className='py-2.75'>
               <div className='text-ink-soft text-xs leading-4'>{row.from}</div>
               <div className='text-meta mt-0.5'>{row.title}</div>
               {row.when && (
                  <div className='text-ink-faint mt-0.5 text-xs'>
                     {row.when}
                  </div>
               )}
            </li>
         ))}
      </ul>
   );
};

export default Waiting;

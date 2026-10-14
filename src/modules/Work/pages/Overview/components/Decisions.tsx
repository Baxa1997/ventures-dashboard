import { DueBadge } from '@modules/Work/components';
import { getEmployee } from '@modules/Work/helpers';
import { Avatar } from '@shared/components';
import { SECTION_PATHS } from '@shared/constants';
import type { Employee, QueueItem } from '@shared/types/work.types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { DECISION_ACTIONS } from '../constants';

interface DecisionsProps {
   items: QueueItem[];
   employees: Employee[];
}

const Decisions = ({ items, employees }: DecisionsProps) => {
   const { t } = useTranslation('work');

   return (
      <ul className='divide-line divide-y px-5 pt-1 pb-1.5'>
         {items.map((item) => {
            if (!item.decision) return null;
            const author = getEmployee(employees, item.decision.preparedById);
            const action = DECISION_ACTIONS[item.decision.action];
            return (
               <li
                  key={item.id}
                  className='flex flex-wrap gap-x-4 gap-y-2 pt-4 pb-3.5'
               >
                  {author && <Avatar name={author.name} />}
                  <div className='min-w-0 flex-1'>
                     <div className='text-ink-soft text-xs leading-4'>
                        {item.subject}
                     </div>
                     <div className='mt-0.5 font-semibold'>{item.title}</div>
                     <div className='text-ink-soft text-meta mt-0.5'>
                        {item.note}
                     </div>
                  </div>
                  <div className='flex shrink-0 items-center justify-between gap-2 max-sm:w-full max-sm:pl-10 sm:flex-col sm:items-end sm:justify-start'>
                     <DueBadge date={item.dueDate} withDays />
                     <Link className='link' to={SECTION_PATHS[action.section]}>
                        {t(action.label)}
                     </Link>
                  </div>
               </li>
            );
         })}
      </ul>
   );
};

export default Decisions;

import { formatNumericDate } from '@shared/helpers';
import { useRequest } from '@shared/hooks';
import clsx from 'clsx';
import type { MouseEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import TaskCheck from './TaskCheck';

interface WorkLineProps {
   title: string;
   to: string; // where the row leads
   done: boolean;
   dueDate: string; // YYYY-MM-DD, '' — no deadline
   overdue: boolean;
   meta: ReactNode; // the line under the title
   success: string; // the note after a tick
   onToggle: () => Promise<unknown>;
}

/* A piece of work as the design lists it: its tick, its title, the line
   about it and its deadline. The row opens it; the tick and the links do
   their own. */
const WorkLine = ({
   title,
   to,
   done,
   dueDate,
   overdue,
   meta,
   success,
   onToggle,
}: WorkLineProps) => {
   const { t } = useTranslation('work');
   const navigate = useNavigate();
   const ticking = useRequest({ success });

   const open = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('a, button')) return;
      navigate(to);
   };

   return (
      // the row's click is for the mouse; the title is the keyboard's link
      <li
         className='border-line hover:bg-hover flex cursor-pointer items-start gap-3 border-b px-4.5 py-2.75 transition-colors last:border-b-0'
         onClick={open}
      >
         <span className='mt-0.5'>
            <TaskCheck
               busy={ticking.pending}
               done={done}
               title={title}
               onToggle={() => ticking.run(onToggle)}
            />
         </span>
         <div className='min-w-0 flex-1'>
            <Link
               className={clsx(
                  'block font-semibold',
                  done && 'text-ink-faint line-through',
               )}
               to={to}
            >
               {title}
            </Link>
            <div className='text-ink-faint mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs'>
               {meta}
            </div>
         </div>
         {dueDate && (
            <time
               className={clsx(
                  'mt-0.5 shrink-0 text-xs whitespace-nowrap',
                  overdue ? 'text-danger font-semibold' : 'text-ink-faint',
               )}
               dateTime={dueDate}
            >
               {overdue
                  ? t('Просрочена · {{date}}', {
                       date: formatNumericDate(dueDate),
                    })
                  : formatNumericDate(dueDate)}
            </time>
         )}
      </li>
   );
};

export default WorkLine;

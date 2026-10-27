import { listName } from '@modules/Settings/services';
import { Badge } from '@shared/components';
import { SECTION_PATHS } from '@shared/constants';
import { useCurrentUser } from '@shared/hooks';
import type { Task } from '@shared/types/work.types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { TASK_RELATION_SECTIONS } from '../constants';
import {
   isDone,
   isOverdue,
   isSentForApproval,
   statusAfterTick,
   typeTone,
} from '../helpers';
import WorkLine from './WorkLine';

interface TaskLineProps {
   task: Task;
   target: string; // the name of the deal or the company, '' — none
   onTick: (task: Task) => Promise<unknown>;
}

// A task: its type, what it is about, its checklist and its deadline. The
// row opens the task in Задачи. A task the person sent to be checked shows
// ticked; unticking takes it back.
const TaskLine = ({ task, target, onTick }: TaskLineProps) => {
   const { t } = useTranslation('work');
   const user = useCurrentUser();
   const sent = isSentForApproval(task, user.id);
   const done = isDone(task) || sent;
   const ticked = task.checklist.filter((item) => item.done).length;
   const targetPath =
      task.relation === 'none'
         ? ''
         : `${SECTION_PATHS[TASK_RELATION_SECTIONS[task.relation]]}/${task.relationId}`;

   const success = () => {
      if (done) return t('Возвращено в работу');
      return statusAfterTick(task, user.id) === 'review'
         ? t('Отправлено на согласование')
         : t('Отмечено выполненным');
   };

   return (
      <WorkLine
         done={done}
         dueDate={task.dueDate}
         overdue={!sent && isOverdue(task)}
         success={success()}
         title={task.title}
         to={`${SECTION_PATHS.tasks}?task=${task.id}`}
         meta={
            <>
               <Badge tone={typeTone(task.type)}>
                  {listName('taskTypes', task.type)}
               </Badge>
               {sent && <Badge tone='warning'>{t('На согласовании')}</Badge>}
               {target && targetPath && (
                  <>
                     ·
                     <Link
                        className='text-accent hover:underline'
                        to={targetPath}
                     >
                        {target}
                     </Link>
                  </>
               )}
               {task.checklist.length > 0 && (
                  <span className='tabular-nums'>
                     · ☑ {ticked}/{task.checklist.length}
                  </span>
               )}
            </>
         }
         onToggle={() => onTick(task)}
      />
   );
};

export default TaskLine;

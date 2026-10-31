import { listName } from '@modules/Settings/services';
import { ConfirmDialog } from '@shared/components';
import { SECTION_PATHS } from '@shared/constants';
import { toast } from '@shared/helpers/toast';
import type { Task } from '@shared/types/work.types';
import {
   Briefcase,
   Clock,
   Handshake,
   Link as LinkIcon,
   Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isOverdue, taskKey } from '../helpers';

interface TaskCardHeadProps {
   task: Task;
   target: string; // the deal's or the company's name, '' — none
   onRemove: (id: string) => Promise<unknown>;
}

const ICON_BUTTON =
   'text-ink-soft hover:bg-ground hover:text-ink grid size-8 shrink-0 place-items-center rounded-lg';

// The top of a task's card: whether it is late, what it is about, and its
// link and bin; the modal's cross closes it.
const TaskCardHead = ({ task, target, onRemove }: TaskCardHeadProps) => {
   const { t } = useTranslation('work');
   const [removing, setRemoving] = useState(false);
   const TargetIcon = task.relation === 'portfolio' ? Briefcase : Handshake;

   const copyLink = async () => {
      const url = `${window.location.origin}${SECTION_PATHS.tasks}?task=${task.id}`;
      try {
         await navigator.clipboard.writeText(url);
         toast.success(t('Ссылка скопирована'));
      } catch {
         toast.error(t('Не удалось скопировать ссылку'), url);
      }
   };

   return (
      <div className='flex min-w-0 flex-wrap items-center gap-2.5'>
         <span className='bg-accent-tint text-accent-strong rounded-md px-2.25 py-0.75 text-xs font-extrabold tabular-nums'>
            {taskKey(task)}
         </span>
         {isOverdue(task) && (
            <span className='bg-danger-tint text-danger inline-flex items-center gap-1.25 rounded-md px-2.25 py-0.75 text-xs font-bold'>
               <Clock aria-hidden className='size-3.25' />
               {t('Просрочена')}
            </span>
         )}
         <span className='text-ink-soft text-meta inline-flex min-w-0 items-center gap-1.5'>
            {target && (
               <>
                  <TargetIcon aria-hidden className='size-3.5 shrink-0' />
                  <span className='truncate'>{target}</span>/
               </>
            )}
            <span className='truncate'>{listName('taskTypes', task.type)}</span>
         </span>
         <span className='ml-auto flex'>
            <button
               type='button'
               aria-label={t('Скопировать ссылку')}
               className={ICON_BUTTON}
               data-hint={t('Скопировать ссылку на эту задачу')}
               onClick={copyLink}
            >
               <LinkIcon aria-hidden className='size-4' />
            </button>
            <button
               type='button'
               aria-label={t('Удалить задачу')}
               className={ICON_BUTTON}
               data-hint={t('Удалить эту задачу')}
               onClick={() => setRemoving(true)}
            >
               <Trash2 aria-hidden className='size-4' />
            </button>
         </span>
         <ConfirmDialog
            open={removing}
            subtitle={task.title}
            success={t('Задача удалена')}
            title={t('Удалить задачу?')}
            onClose={() => setRemoving(false)}
            onConfirm={() => onRemove(task.id)}
         >
            {t(
               'Задача уйдёт из списка вместе с чек-листом, комментариями и историей.',
            )}
         </ConfirmDialog>
      </div>
   );
};

export default TaskCardHead;

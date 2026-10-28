import { listName } from '@modules/Settings/services';
import {
   type Approval,
   getAssigneeId,
   queueWording,
} from '@modules/Work/helpers';
import { openTask } from '@modules/Work/hooks';
import { Button, buttonClass } from '@shared/components';
import { SECTION_PATHS } from '@shared/constants';
import { formatNumericDate, personName } from '@shared/helpers';
import { useRequest } from '@shared/hooks';
import type { Task } from '@shared/types/work.types';
import {
   Check,
   ListChecks,
   type LucideIcon,
   ScanSearch,
   ScrollText,
   Undo2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface ApprovalsProps {
   approvals: Approval[];
   targetName: (task: Task) => string;
   onApprove: (task: Task) => Promise<unknown>;
   onApproveMemo: (dealId: string) => Promise<unknown>;
   onSendBack: (task: Task) => void; // asks what to fix first
}

interface ApprovalLineProps extends Omit<ApprovalsProps, 'approvals'> {
   approval: Approval;
}

// What the line says and does: its icon, title, sender, the line about it,
// where «Открыть» leads, and how it is approved here, if it is.
const useWording = (
   approval: Approval,
   targetName: (task: Task) => string,
) => {
   const { t } = useTranslation('work');
   const { t: tDeals } = useTranslation('deals');
   if (approval.kind === 'task') {
      const { task } = approval;
      return {
         icon: ListChecks,
         title: task.title,
         fromId: getAssigneeId(task),
         about: [listName('taskTypes', task.type), targetName(task)],
         to: '', // the task's card opens over the page
      };
   }
   const { item } = approval;
   const memo = item.kind === 'memo';
   return {
      icon: memo ? ScrollText : ScanSearch,
      title: queueWording(t, tDeals, item).title,
      fromId: item.decision?.preparedById ?? '',
      about: [item.subject],
      to: `${SECTION_PATHS.deals}/${item.dealId}?tab=${memo ? 'memo' : 'screening'}`,
   };
};

const ApprovalLine = ({
   approval,
   targetName,
   onApprove,
   onApproveMemo,
   onSendBack,
}: ApprovalLineProps) => {
   const { t } = useTranslation('work');
   const approving = useRequest({
      success:
         approval.kind === 'task' ? t('Согласовано') : t('Меморандум утверждён'),
   });
   const wording = useWording(approval, targetName);
   const Icon: LucideIcon = wording.icon;
   const from = personName(wording.fromId);
   const task = approval.kind === 'task' ? approval.task : null;
   // a screening is decided in the deal, with its request or refusal
   const memoDeal =
      approval.kind === 'decision' && approval.item.kind === 'memo'
         ? approval.item.dealId
         : undefined;

   const approve = () => {
      if (task) return approving.run(() => onApprove(task));
      if (memoDeal) return approving.run(() => onApproveMemo(memoDeal));
   };

   return (
      <li className='border-line flex flex-wrap items-center gap-3 border-b px-4.5 py-2.75 last:border-b-0 sm:flex-nowrap'>
         <span className='bg-accent-tint text-accent-strong grid size-8.5 shrink-0 place-items-center rounded-lg'>
            <Icon aria-hidden className='size-4.5' />
         </span>
         <div className='min-w-0 flex-1'>
            <div className='font-semibold'>{wording.title}</div>
            <div className='text-ink-faint mt-0.5 text-xs'>
               {[
                  from && t('От: {{name}}', { name: from }),
                  ...wording.about,
                  approval.dueDate &&
                     t('срок {{date}}', {
                        date: formatNumericDate(approval.dueDate),
                     }),
               ]
                  .filter(Boolean)
                  .join(' · ')}
            </div>
         </div>
         <div className='flex flex-wrap gap-1.5 max-sm:w-full sm:justify-end'>
            {task ? (
               <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => openTask(task.id)}
               >
                  {t('Открыть')}
               </Button>
            ) : (
               <Link
                  className={buttonClass('ghost', '', false, 'sm')}
                  to={wording.to}
               >
                  {t('Открыть')}
               </Link>
            )}
            {task && (
               <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => onSendBack(task)}
               >
                  <Undo2 aria-hidden />
                  {t('Вернуть')}
               </Button>
            )}
            {(task || memoDeal) && (
               <Button size='sm' loading={approving.pending} onClick={approve}>
                  <Check aria-hidden />
                  {t('Согласовать')}
               </Button>
            )}
         </div>
      </li>
   );
};

// «Ждут моего согласования»: tasks the person checks, memorandums they
// approve as sponsor, screenings they score as the second reviewer.
const Approvals = ({ approvals, ...actions }: ApprovalsProps) => (
   <ul>
      {approvals.map((approval) => (
         <ApprovalLine key={approval.key} approval={approval} {...actions} />
      ))}
   </ul>
);

export default Approvals;

import IssueDialog from '@modules/Documents/components/IssueDialog';
import { ISSUE_STATUSES } from '@modules/Documents/constants';
import documents from '@modules/Documents/services';
import { Card, FilterSelect, NoData } from '@shared/components';
import { personName } from '@shared/helpers';
import { useAction } from '@shared/hooks';
import type {
   GovernanceIssue,
   IssueStatus,
} from '@shared/types/documents.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface IssuesProps {
   issues: GovernanceIssue[];
}

/* The open questions of corporate governance, beside the fund's documents:
   what each is, its status (changed in place) and who follows it. A
   resolved one leaves the list. */
const Issues = ({ issues }: IssuesProps) => {
   const { t } = useTranslation('documents');
   const [adding, setAdding] = useState(false);
   const changing = useAction(
      (id: string, status: IssueStatus) => documents.setIssueStatus(id, status),
      { success: t('Статус вопроса сохранён') },
   );
   // the issue whose status is being saved
   const [changingId, setChangingId] = useState('');
   const open = issues.filter(({ status }) => status !== 'resolved');

   return (
      <Card
         action={
            <button
               type='button'
               className='link'
               onClick={() => setAdding(true)}
            >
               {t('Добавить')}
            </button>
         }
         className='mt-section'
         hint={open.length || undefined}
         title={t('Открытые вопросы управления')}
      >
         {open.length ? (
            <ul className='divide-line divide-y px-5'>
               {open.map((issue) => (
                  <li
                     key={issue.id}
                     className='flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5'
                  >
                     <div className='min-w-0 flex-[1_1_20rem]'>
                        <div className='font-semibold'>{issue.title}</div>
                        {issue.note && (
                           <div className='text-ink-soft mt-0.5 text-xs'>
                              {issue.note}
                           </div>
                        )}
                     </div>
                     {issue.ownerId && (
                        <span className='text-ink-soft text-xs'>
                           {personName(issue.ownerId)}
                        </span>
                     )}
                     <FilterSelect<IssueStatus>
                        accent={issue.status === 'in_work'}
                        busy={changingId === issue.id}
                        label={t('Статус вопроса')}
                        options={(
                           Object.keys(ISSUE_STATUSES) as IssueStatus[]
                        ).map((value) => ({
                           value,
                           label: t(ISSUE_STATUSES[value].label),
                        }))}
                        showLabel={false}
                        value={issue.status}
                        onChange={async (status) => {
                           setChangingId(issue.id);
                           await changing.run(issue.id, status);
                           setChangingId('');
                        }}
                     />
                  </li>
               ))}
            </ul>
         ) : (
            <NoData>{t('Открытых вопросов нет')}</NoData>
         )}
         <IssueDialog open={adding} onClose={() => setAdding(false)} />
      </Card>
   );
};

export default Issues;

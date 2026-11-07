import IssueDialog from '@modules/Documents/components/IssueDialog';
import { ISSUE_STATUSES } from '@modules/Documents/constants';
import documents from '@modules/Documents/services';
import {
   Card,
   ConfirmDialog,
   FilterSelect,
   InlineField,
   ItemActions,
   NoData,
} from '@shared/components';
import { TEAM } from '@shared/constants';
import { shortName } from '@shared/helpers';
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
   what each is, its status and who follows it, all changed where they
   stand; one raised by mistake is deleted. A resolved one leaves the list. */
const Issues = ({ issues }: IssuesProps) => {
   const { t } = useTranslation('documents');
   const [adding, setAdding] = useState(false);
   const [removing, setRemoving] = useState<GovernanceIssue | null>(null);
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
               data-hint={t('Добавить открытый вопрос управления')}
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
                        <InlineField
                           className='font-semibold'
                           label={t('Вопрос')}
                           maxLength={200}
                           validate={(text) =>
                              text ? undefined : t('Опишите вопрос')
                           }
                           value={issue.title}
                           onSave={(title) =>
                              documents.updateIssue(issue.id, { title })
                           }
                        />
                        <InlineField
                           className='text-ink-soft text-xs'
                           kind='multiline'
                           label={t('Комментарий')}
                           maxLength={600}
                           placeholder={t('Комментарий')}
                           value={issue.note}
                           onSave={(note) =>
                              documents.updateIssue(issue.id, { note })
                           }
                        />
                        <ItemActions
                           className='mt-1 text-xs'
                           name={issue.title}
                           onDelete={() => setRemoving(issue)}
                        />
                     </div>
                     <span className='text-ink-soft w-36 text-xs'>
                        <InlineField
                           kind='select'
                           label={t('Ответственный')}
                           options={[
                              { value: '', label: t('Не назначен') },
                              ...TEAM.map(({ id, name }) => ({
                                 value: id,
                                 label: shortName(name),
                              })),
                           ]}
                           value={issue.ownerId}
                           onSave={(ownerId) =>
                              documents.updateIssue(issue.id, { ownerId })
                           }
                        />
                     </span>
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
         <ConfirmDialog
            open={removing !== null}
            title={t('Удалить вопрос «{{name}}»?', {
               name: removing?.title ?? '',
            })}
            onClose={() => setRemoving(null)}
            onConfirm={() => removing && documents.removeIssue(removing.id)}
         >
            <p>
               {t(
                  'Вопрос, поднятый по ошибке, уйдёт из списка. Решённый вопрос лучше отметить статусом «Решён».',
               )}
            </p>
         </ConfirmDialog>
      </Card>
   );
};

export default Issues;

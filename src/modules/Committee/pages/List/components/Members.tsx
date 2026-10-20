import { IC_RULES, MEMBER_ROLE_LABELS } from '@modules/Committee/constants';
import type { CommitteeData } from '@modules/Committee/hooks';
import {
   Avatar,
   Card,
   FactList,
   NoData,
   Table,
   TD,
   TH,
} from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type { CommitteeMember } from '@shared/types/committee.types';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MemberDialog from './MemberDialog';

interface MembersProps {
   data: CommitteeData;
}

// Who sits on the committee, how they take part and under which contract,
// with the voting rules next to them. The director and the committee's
// secretary keep the list.
const Members = ({ data }: MembersProps) => {
   const { t } = useTranslation('committee');
   const user = useCurrentUser();
   const canEdit = user.role === 'director' || user.role === 'ic_secretary';
   const [editing, setEditing] = useState<CommitteeMember | 'new' | null>(null);

   return (
      <>
         <div className='gap-section grid flex-1 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]'>
            <Card
               action={
                  canEdit && (
                     <button
                        type='button'
                        className='link'
                        onClick={() => setEditing('new')}
                     >
                        {t('Добавить члена ИК')}
                     </button>
                  )
               }
               hint={t('для кворума нужно {{quorum}}', {
                  quorum: IC_RULES.quorum,
               })}
               title={t('Члены инвестиционного комитета')}
            >
               {data.members.length === 0 ? (
                  <NoData>
                     {t(
                        'Состав пока пуст. Добавьте членов ИК: без них заседание не откроется — голосовать будет некому.',
                     )}
                  </NoData>
               ) : (
                  <Table
                     className='min-w-xl'
                     head={
                        <>
                           <th className={TH}>{t('Член ИК')}</th>
                           <th className={TH}>{t('Роль')}</th>
                           <th className={TH}>{t('Участие')}</th>
                           <th className={TH}>{t('Договор')}</th>
                        </>
                     }
                  >
                     {data.members.map((member) => (
                        <tr key={member.id}>
                           <td className={TD}>
                              <span className='flex items-center gap-2.5 font-medium'>
                                 <Avatar name={member.name} />
                                 {canEdit ? (
                                    <button
                                       type='button'
                                       className='hover:text-accent text-left'
                                       onClick={() => setEditing(member)}
                                    >
                                       {member.name}
                                    </button>
                                 ) : (
                                    member.name
                                 )}
                              </span>
                           </td>
                           <td className={TD}>
                              {t(MEMBER_ROLE_LABELS[member.role])}
                           </td>
                           <td className={clsx(TD, 'text-ink-soft')}>
                              {member.remote ? t('по видео') : t('очно')}
                           </td>
                           <td className={TD}>{member.contract}</td>
                        </tr>
                     ))}
                  </Table>
               )}
            </Card>
            <Card title={t('Правила голосования')}>
               <FactList
                  className='px-5 py-2'
                  divided
                  labelWidth='9rem'
                  rows={[
                     {
                        label: t('Кворум'),
                        value: t('{{count}} член', { count: IC_RULES.quorum }),
                     },
                     {
                        label: t('Материалы за'),
                        value: t('{{count}} рабочий день', {
                           count: IC_RULES.materialsDays,
                        }),
                     },
                     {
                        label: t('1 голос «против»'),
                        value: t('обсуждение, решает спонсор'),
                     },
                     { label: t('2 и более «против»'), value: t('отказ') },
                     { label: t('Особое мнение'), value: t('вето') },
                  ]}
               />
               <p className='text-ink-soft px-5 pb-4 text-xs'>
                  {t(
                     'Источник: «Чек-лист ИК» в Notion. Сверить с Положением об ИК — числа в положении главнее.',
                  )}
               </p>
            </Card>
         </div>
         <MemberDialog member={editing} onClose={() => setEditing(null)} />
      </>
   );
};

export default Members;

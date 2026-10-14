import { IC_RULES, MEMBER_ROLE_LABELS } from '@modules/Committee/constants';
import type { CommitteeData } from '@modules/Committee/hooks';
import { Avatar, Card, FactList, Table, TD, TH } from '@shared/components';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface MembersProps {
   data: CommitteeData;
}

// Who sits on the committee, how they take part and under which contract,
// with the voting rules next to them.
const Members = ({ data }: MembersProps) => {
   const { t } = useTranslation('committee');

   return (
      <>
         <div className='gap-section grid flex-1 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]'>
            <Card title={t('Члены инвестиционного комитета')}>
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
                              {member.name}
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
         <p className='text-ink-soft mt-section text-xs'>
            {t(
               'Состав ИК на макете условный. Число членов и кворум задаются в Настройках по Положению об ИК.',
            )}
         </p>
      </>
   );
};

export default Members;

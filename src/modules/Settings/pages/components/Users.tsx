import {
   ACCESS,
   EXTERNAL_RIGHTS,
   RIGHT_SECTIONS,
   RIGHTS,
   ROLE_LABELS,
   ROLE_RIGHTS,
} from '@modules/Settings/constants';
import { Avatar, Badge, Card, Table, TD, TH } from '@shared/components';
import { formatDate } from '@shared/helpers';
import type { SettingsState } from '@shared/types/settings.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface UsersProps {
   data: SettingsState;
}

// The fund's staff with their roles, and the rights each role gives.
const Users = ({ data }: UsersProps) => {
   const { t } = useTranslation('settings');

   return (
      <>
         <Card hint={data.staff.length} title={t('Сотрудники фонда')}>
            <Table
               className='min-w-3xl'
               head={
                  <>
                     <th className={TH}>{t('Сотрудник')}</th>
                     <th className={TH}>{t('Роли')}</th>
                     <th className={TH}>{t('Доступ')}</th>
                  </>
               }
            >
               {data.staff.map((member) => (
                  <tr key={member.id}>
                     <td className={TD}>
                        <span className='flex items-center gap-3'>
                           <Avatar name={member.name} />
                           <span>
                              <span className='block font-semibold'>
                                 {member.name}
                              </span>
                              <span className='text-ink-soft block text-xs'>
                                 {member.invitedAt
                                    ? t('приглашение отправлено {{date}}', {
                                         date: formatDate(member.invitedAt),
                                      })
                                    : member.email || member.position}
                              </span>
                           </span>
                        </span>
                     </td>
                     <td className={TD}>
                        <span className='flex flex-wrap gap-1.5'>
                           {member.roles.map((role) => (
                              <span
                                 key={role}
                                 className='bg-neutral-tint text-neutral-ink rounded-md px-2 py-1 text-xs'
                              >
                                 {t(ROLE_LABELS[role])}
                              </span>
                           ))}
                        </span>
                     </td>
                     <td className={TD}>
                        <Badge tone={ACCESS[member.access].tone}>
                           {t(ACCESS[member.access].label)}
                        </Badge>
                     </td>
                  </tr>
               ))}
            </Table>
         </Card>
         <Card
            className='mt-section'
            hint={t(
               'П — полный, Р — своё и назначенное, Ч — чтение, — нет доступа',
            )}
            title={t('Права по ролям')}
         >
            <Table
               className='min-w-4xl'
               head={
                  <>
                     <th className={TH}>{t('Роль')}</th>
                     {RIGHT_SECTIONS.map((section) => (
                        <th key={section} className={clsx(TH, 'text-center')}>
                           {t(section)}
                        </th>
                     ))}
                  </>
               }
            >
               {ROLE_RIGHTS.map(({ role, rights }) => (
                  <tr key={role}>
                     <td className={clsx(TD, 'font-semibold')}>{t(role)}</td>
                     {rights.map((right, index) => (
                        <td
                           key={RIGHT_SECTIONS[index]}
                           className={clsx(
                              TD,
                              'text-center font-medium',
                              RIGHTS[right].color,
                           )}
                        >
                           {t(RIGHTS[right].label)}
                        </td>
                     ))}
                  </tr>
               ))}
               {EXTERNAL_RIGHTS.map(({ role, text }) => (
                  <tr key={role} className='bg-ground/70'>
                     <td className={clsx(TD, 'font-semibold')}>{t(role)}</td>
                     <td
                        className={clsx(TD, 'text-ink-soft')}
                        colSpan={RIGHT_SECTIONS.length}
                     >
                        {t(text)}
                     </td>
                  </tr>
               ))}
            </Table>
         </Card>
         <p className='text-ink-soft mt-section text-xs'>
            {t(
               'Права — предложение для обсуждения. Внешних участников (бухгалтерию, членов ИК) директор подключает отдельно, с доступом только к своему разделу.',
            )}
         </p>
      </>
   );
};

export default Users;

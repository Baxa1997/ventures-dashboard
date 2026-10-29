import {
   EXTERNAL_RIGHTS,
   RIGHT_SECTIONS,
   RIGHTS,
   ROLE_RIGHTS,
} from '@modules/Settings/constants';
import { Badge, Card, Notice, Table, TD, TH } from '@shared/components';
import { ROLE_LABELS as SYSTEM_ROLES } from '@shared/constants';
import type { StaffMember } from '@shared/types/settings.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface RolesProps {
   staff: StaffMember[];
}

/* What each role may do in each section, as the prototype's matrix: the
   sections down, the roles across with how many people hold each. The
   rights are the proposal for discussion; the panel itself checks only the
   director's. */
const Roles = ({ staff }: RolesProps) => {
   const { t } = useTranslation('settings');
   const { t: tLayout } = useTranslation('layout');
   const holders = (role: string) =>
      staff.filter((member) => member.active && member.role === role).length;

   return (
      <>
         <Card>
            <Table
               className='min-w-3xl'
               head={
                  <>
                     <th className={TH}>{t('Раздел')}</th>
                     {ROLE_RIGHTS.map(({ role }) => (
                        <th
                           key={role}
                           className={clsx(TH, 'text-center whitespace-normal')}
                        >
                           {tLayout(SYSTEM_ROLES[role])}
                           <span className='text-ink-faint block font-normal'>
                              {t('{{n}} чел.', { n: holders(role) })}
                           </span>
                        </th>
                     ))}
                  </>
               }
            >
               {RIGHT_SECTIONS.map((section, index) => (
                  <tr key={section}>
                     <td className={clsx(TD, 'font-semibold')}>
                        {t(section)}
                     </td>
                     {ROLE_RIGHTS.map(({ role, rights }) => (
                        <td key={role} className={clsx(TD, 'text-center')}>
                           <Badge tone={RIGHTS[rights[index]].tone}>
                              {t(RIGHTS[rights[index]].label)}
                           </Badge>
                        </td>
                     ))}
                  </tr>
               ))}
            </Table>
            <p className='border-line text-ink-soft border-t px-4.5 py-2.5 text-xs'>
               {t(
                  'Полный — всё в разделе; Своё — свои и назначенные записи; Чтение — только просмотр; Нет — раздела не видно.',
               )}
            </p>
         </Card>
         <Card className='mt-4' title={t('Внешние участники')}>
            <dl className='divide-line divide-y px-4.5'>
               {EXTERNAL_RIGHTS.map(({ role, text }) => (
                  <div
                     key={role}
                     className='grid gap-x-5 gap-y-0.5 py-2.5 sm:grid-cols-[14rem_minmax(0,1fr)]'
                  >
                     <dt className='font-semibold'>{t(role)}</dt>
                     <dd className='text-ink-soft'>{t(text)}</dd>
                  </div>
               ))}
            </dl>
         </Card>
         <Notice className='mt-4'>
            {t(
               'Права — предложение для обсуждения. Внешних участников (бухгалтерию, членов ИК) директор подключает отдельно, с доступом только к своему разделу.',
            )}
         </Notice>
      </>
   );
};

export default Roles;

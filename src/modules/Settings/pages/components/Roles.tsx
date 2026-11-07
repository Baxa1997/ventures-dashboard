import {
   EXTERNAL_RIGHTS,
   RIGHT_SECTION_INFO,
   RIGHT_SECTIONS,
   RIGHTS,
} from '@modules/Settings/constants';
import settings, { rightOf } from '@modules/Settings/services';
import {
   Badge,
   BadgeSelect,
   Card,
   Notice,
   Table,
   TD,
   TH,
} from '@shared/components';
import { ROLE_LABELS as SYSTEM_ROLES } from '@shared/constants';
import { useCurrentUser, useSaveQueue } from '@shared/hooks';
import type {
   FundRules,
   Right,
   RightSection,
   StaffMember,
} from '@shared/types/settings.types';
import type { Role } from '@shared/types/work.types';
import clsx from 'clsx';
import { Lock } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface RolesProps {
   staff: StaffMember[];
   rules: FundRules;
   editable: boolean; // the person may change Настройки
   stored: boolean; // ucode has batch 25's field to keep the table in
}

const ROLES = Object.keys(SYSTEM_ROLES) as Role[];

/* What each role may do in each section: the sections down, the roles
   across with how many people hold each. A cell is changed where it stands
   and applies at once; the director's column stays full, so nobody locks
   the fund out of its own panel. */
const Roles = ({ staff, rules, editable, stored }: RolesProps) => {
   const { t } = useTranslation('settings');
   const { t: tLayout } = useTranslation('layout');
   const user = useCurrentUser();
   const queue = useSaveQueue();
   const [busy, setBusy] = useState('');
   const holders = (role: string) =>
      staff.filter((member) => member.active && member.role === role).length;

   const set = async (role: Role, section: RightSection, right: Right) => {
      const cell = `${role}:${section}`;
      setBusy(cell);
      await queue(
         () =>
            settings.saveRules(
               {
                  roleRights: {
                     ...rules.roleRights,
                     [role]: { ...rules.roleRights[role], [section]: right },
                  },
               },
               user.id,
               {
                  roleRights: t('Роли · {{role}} · {{section}}: {{right}}', {
                     role: tLayout(SYSTEM_ROLES[role]),
                     section: t(RIGHT_SECTION_INFO[section].label),
                     right: t(RIGHTS[right].label),
                  }),
               },
            ),
         t('Права роли изменены'),
      );
      setBusy('');
   };

   return (
      <>
         {!stored && (
            <Notice className='mb-4' warning>
               {t(
                  'Таблицу можно будет менять, когда в ucode будет партия 25; пока действуют права ниже.',
               )}
            </Notice>
         )}
         <Card>
            <Table
               className='min-w-4xl'
               head={
                  <>
                     <th className={TH}>{t('Раздел')}</th>
                     {ROLES.map((role) => (
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
               {RIGHT_SECTIONS.map((section) => (
                  <tr key={section}>
                     <td className={clsx(TD, 'font-semibold')}>
                        {t(RIGHT_SECTION_INFO[section].label)}
                     </td>
                     {ROLES.map((role) => {
                        const right = rightOf({ role }, section);
                        const locked = role === 'director';
                        return (
                           <td key={role} className={clsx(TD, 'text-center')}>
                              {locked || !editable || !stored ? (
                                 <span
                                    className='inline-flex items-center gap-1'
                                    data-hint={
                                       locked
                                          ? t(
                                               'У директора всегда полный доступ',
                                            )
                                          : undefined
                                    }
                                 >
                                    <Badge tone={RIGHTS[right].tone}>
                                       {t(RIGHTS[right].label)}
                                    </Badge>
                                    {locked && (
                                       <Lock
                                          aria-hidden
                                          className='text-ink-faint size-3'
                                       />
                                    )}
                                 </span>
                              ) : (
                                 <BadgeSelect
                                    busy={busy === `${role}:${section}`}
                                    label={t('{{role}} · {{section}}', {
                                       role: tLayout(SYSTEM_ROLES[role]),
                                       section: t(
                                          RIGHT_SECTION_INFO[section].label,
                                       ),
                                    })}
                                    options={RIGHT_SECTION_INFO[
                                       section
                                    ].rights.map((value) => ({
                                       value,
                                       label: t(RIGHTS[value].label),
                                       tone: RIGHTS[value].tone,
                                    }))}
                                    value={right}
                                    onChange={(next) => set(role, section, next)}
                                 />
                              )}
                           </td>
                        );
                     })}
                  </tr>
               ))}
            </Table>
            <p className='border-line text-ink-soft border-t px-4.5 py-2.5 text-xs'>
               {t(
                  'Полный — всё в разделе; Своё — свои и прикреплённые сделки с их задачами; Чтение — только просмотр; Нет — раздела не видно в меню, и он не открывается.',
               )}
            </p>
         </Card>
         <Notice className='mt-4'>
            {t(
               '«Нет» прячет раздел из меню и закрывает его адрес. «Чтение» открывает раздел, но изменения в нём не сохраняются; задачи меняются из любого раздела. «Своё» в Сделках — только прикреплённые сделки и их задачи.',
            )}
         </Notice>
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
      </>
   );
};

export default Roles;

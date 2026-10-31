import { ACCESS, ROLE_LABELS } from '@modules/Settings/constants';
import { staffChange, staffInputOf } from '@modules/Settings/helpers';
import { dealLinks } from '@modules/Deals/helpers';
import { usePeopleWork } from '@modules/Settings/hooks';
import settings from '@modules/Settings/services';
import { isDone, isMine } from '@modules/Work/helpers';
import {
   Avatar,
   Badge,
   Button,
   Card,
   NoData,
   Notice,
   Switch,
   Table,
   TD,
   TH,
} from '@shared/components';
import { ROLE_LABELS as SYSTEM_ROLES } from '@shared/constants';
import { formatDayYear } from '@shared/helpers';
import { useCurrentUser, useRequest } from '@shared/hooks';
import type {
   Access,
   StaffCredentials,
   StaffInput,
   StaffMember,
} from '@shared/types/settings.types';
import type { Role } from '@shared/types/work.types';
import clsx from 'clsx';
import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ROW_SELECT, STICKY_END, useRowDraft } from './Dict';

interface StaffRowProps {
   member: StaffMember;
   editable: boolean;
   work: { deals: number; tasks: number };
   onEdit: () => void;
   onWork: () => void;
   onCredentials: (credentials: StaffCredentials) => void;
}

/* A person: their role in the system, their access level and whether they
   are active, each changed where it stands and written to the journal. The
   director does not change their own role or close their own access. */
const StaffRow = ({
   member,
   editable,
   work,
   onEdit,
   onWork,
   onCredentials,
}: StaffRowProps) => {
   const { t } = useTranslation('settings');
   const { t: tLayout } = useTranslation('layout');
   const { t: tComponents } = useTranslation('components');
   const user = useCurrentUser();
   const me = member.id === user.id;

   const row = useRowDraft<StaffInput>(async (draft) => {
      const current = (await settings.getSettings()).staff.find(
         ({ id }) => id === member.id,
      );
      if (!current) return;
      const before = staffInputOf(current);
      const next = { ...before, ...draft };
      const { from, to, patch } = staffChange(t, tLayout, before, next);
      if (!Object.keys(patch).length) return;
      await settings.updateStaff(member.id, patch, user.id, {
         field: t('Пользователь · {{name}}', { name: next.name }),
         from,
         to,
      });
   });
   const shown = { ...member, ...row.draft };
   const saved = t('Сохранено');
   const creating = useRequest({ success: t('Вход создан') });
   const createLogin = () =>
      creating.run(async () =>
         onCredentials(
            await settings.createLogin(
               member,
               user.id,
               t('Вход · {{name}}', { name: member.name }),
            ),
         ),
      );

   return (
      <tr>
         <td className={TD}>
            <span
               className={clsx(
                  'flex items-center gap-2.5 whitespace-nowrap transition-opacity',
                  !shown.active && 'opacity-50',
               )}
            >
               <Avatar name={member.name} />
               <span>
                  <span className='block font-semibold'>
                     {member.name}
                     {me && (
                        <span className='text-ink-soft font-normal'>
                           {' '}
                           {t('(вы)')}
                        </span>
                     )}
                  </span>
                  {/* when they were added, and nothing more */}
                  <span className='text-ink-soft block text-xs tabular-nums'>
                     {formatDayYear(member.addedAt)}
                  </span>
               </span>
            </span>
            {member.roles.length > 0 && (
               <span className='mt-1.5 flex max-w-64 flex-wrap gap-1'>
                  {member.roles.map((role) => (
                     <span
                        key={role}
                        className='bg-neutral-tint text-neutral-ink rounded-md px-2 py-0.5 text-xs whitespace-nowrap'
                     >
                        {t(ROLE_LABELS[role])}
                     </span>
                  ))}
               </span>
            )}
         </td>
         <td className={TD}>
            <select
               aria-label={t('Роль в системе: {{name}}', {
                  name: member.name,
               })}
               className={clsx(ROW_SELECT, 'w-auto max-w-48 bg-white')}
               disabled={!editable || me}
               title={me ? t('Свою роль меняет другой директор') : undefined}
               value={shown.role}
               onChange={(event) =>
                  row.change({ role: event.target.value as Role }, saved)
               }
            >
               {(Object.keys(SYSTEM_ROLES) as Role[]).map((role) => (
                  <option key={role} value={role}>
                     {tLayout(SYSTEM_ROLES[role])}
                  </option>
               ))}
            </select>
         </td>
         <td className={clsx(TD, 'whitespace-nowrap')}>
            {member.phone || <span className='text-ink-faint'>—</span>}
         </td>
         <td className={clsx(TD, 'whitespace-nowrap')}>
            {member.userId ? (
               <Badge tone='success'>{t('Есть')}</Badge>
            ) : editable && member.email ? (
               <Button
                  loading={creating.pending}
                  size='sm'
                  variant='ghost'
                  onClick={createLogin}
               >
                  {t('Создать вход')}
               </Button>
            ) : (
               <Badge tone='neutral'>{t('Нет')}</Badge>
            )}
         </td>
         <td className={clsx(TD, 'whitespace-nowrap')}>
            <button type='button' className='link' onClick={onWork}>
               {t('{{deals}} сд. · {{tasks}} зад.', work)}
            </button>
         </td>
         <td className={TD}>
            <select
               aria-label={t('Доступ: {{name}}', { name: member.name })}
               className={clsx(ROW_SELECT, 'w-auto bg-white')}
               disabled={!editable}
               value={shown.access}
               onChange={(event) =>
                  row.change({ access: event.target.value as Access }, saved)
               }
            >
               {(Object.keys(ACCESS) as Access[]).map((access) => (
                  <option key={access} value={access}>
                     {t(ACCESS[access].label)}
                  </option>
               ))}
            </select>
         </td>
         <td className={TD}>
            {me ? (
               <Badge tone='success'>{t('Активен')}</Badge>
            ) : (
               <Switch
                  small
                  checked={shown.active}
                  disabled={!editable}
                  label={t('Активен: {{name}}', { name: member.name })}
                  onChange={(active) =>
                     row.change(
                        { active },
                        active ? t('Доступ открыт') : t('Доступ закрыт'),
                     )
                  }
               />
            )}
         </td>
         {editable && (
            <td className={clsx(TD, 'py-1', STICKY_END)}>
               <button
                  type='button'
                  aria-label={tComponents('Изменить: {{name}}', {
                     name: member.name,
                  })}
                  className='text-ink-soft hover:bg-hover hover:text-ink grid size-7 place-items-center rounded-md transition-colors'
                  title={tComponents('Изменить')}
                  onClick={onEdit}
               >
                  <Pencil aria-hidden className='size-3.5' />
               </button>
            </td>
         )}
      </tr>
   );
};

interface UsersProps {
   staff: StaffMember[];
   editable: boolean; // the director
   onEdit: (member: StaffMember) => void;
   onWork: (member: StaffMember) => void;
   onCredentials: (credentials: StaffCredentials) => void;
}

// The fund's staff: who they are, their role and duties, whether they can sign
// in, the deals and tasks attached to them, and their access.
const Users = ({
   staff,
   editable,
   onEdit,
   onWork,
   onCredentials,
}: UsersProps) => {
   const { t } = useTranslation('settings');
   const people = usePeopleWork();
   const workOf = ({ id }: StaffMember) => ({
      deals: (people?.deals ?? []).filter(
         (deal) => dealLinks(deal, people?.tasks ?? [], id).length,
      ).length,
      tasks: (people?.tasks ?? []).filter(
         (task) => !isDone(task) && isMine(task, id),
      ).length,
   });

   return (
      <>
         <Card>
            {staff.length ? (
               <Table
                  className='min-w-[54rem]'
                  head={
                     <>
                        <th className={TH}>{t('Сотрудник')}</th>
                        <th className={TH}>{t('Роль в системе')}</th>
                        <th className={TH}>{t('Телефон')}</th>
                        <th className={TH}>{t('Вход')}</th>
                        <th className={TH}>{t('Сделки и задачи')}</th>
                        <th className={TH}>{t('Доступ')}</th>
                        <th className={TH}>{t('Активен')}</th>
                        {editable && (
                           <th className={clsx(TH, 'w-14', STICKY_END)}>
                              <span className='sr-only'>{t('Действия')}</span>
                           </th>
                        )}
                     </>
                  }
               >
                  {staff.map((member) => (
                     <StaffRow
                        key={member.id}
                        editable={editable}
                        member={member}
                        work={workOf(member)}
                        onCredentials={onCredentials}
                        onEdit={() => onEdit(member)}
                        onWork={() => onWork(member)}
                     />
                  ))}
               </Table>
            ) : (
               <NoData />
            )}
         </Card>
         <Notice className='mt-4'>
            {t(
               'Аналитик и проектный менеджер видят только прикреплённые к ним сделки и задачи; «Доступ: Полный» открывает им все. Каждый вход — это пользователь ucode, их число считает тариф.',
            )}
         </Notice>
         <Notice className='mt-4'>
            {t(
               'Роль в системе задаёт, что человек может в панели; обязанности — за что он отвечает. Неактивный сотрудник пропадает из списков исполнителей и владельцев и входит с наименьшими правами, его имя остаётся на записях.',
            )}
         </Notice>
      </>
   );
};

export default Users;

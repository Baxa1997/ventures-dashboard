import settings from '@modules/Settings/services';
import {
   handOver,
   loadOf,
   type PersonLoad,
} from '@modules/Settings/services/people';
import { ConfirmDialog, Field } from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type { StaffMember } from '@shared/types/settings.types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DeleteUserDialogProps {
   member: StaffMember | null; // null: closed
   staff: StaffMember[];
   onClose: () => void;
}

/* Deletes a person. What they run has to go to somebody first, or it would wait
   for nobody; their sign-in goes, and their name stays on what they did. */
const DeleteUserDialog = ({
   member,
   staff,
   onClose,
}: DeleteUserDialogProps) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   const [load, setLoad] = useState<PersonLoad | null>(null);
   const [failed, setFailed] = useState(false);
   const [toId, setToId] = useState('');

   useEffect(() => {
      setLoad(null);
      setFailed(false);
      setToId('');
      if (member) loadOf(member.id).then(setLoad, () => setFailed(true));
   }, [member]);

   const others = staff.filter(
      ({ id, active }) => active && id !== member?.id,
   );
   const held = load
      ? load.deals + load.tasks + load.companies + load.contracts + load.purchases
      : 0;

   return (
      <ConfirmDialog
         disabled={!load || (held > 0 && !toId)}
         error={t('Не удалось удалить сотрудника')}
         open={member !== null}
         subtitle={member?.name}
         success={t('Сотрудник удалён')}
         title={t('Удалить сотрудника?')}
         onClose={onClose}
         onConfirm={async () => {
            if (!member) return;
            if (held) await handOver(member.id, toId, user.id);
            await settings.removeUser(
               member,
               user.id,
               t('Пользователь удалён · {{name}}', { name: member.name }),
            );
         }}
      >
         <p>
            {t(
               'Вход перестанет работать, человек исчезнет из списков. Имя останется на записях: на решениях, в журнале, в закрытых задачах.',
            )}
         </p>
         {failed && (
            <p className='text-danger'>
               {t('Не удалось проверить, что закреплено за сотрудником.')}
            </p>
         )}
         {load && held > 0 && (
            <>
               <p>
                  {t(
                     'За сотрудником закреплено: сделки {{deals}}, открытые задачи {{tasks}}, компании {{companies}}, договоры {{contracts}}, закупки {{purchases}}.',
                     load,
                  )}
               </p>
               <Field label={t('Кому передать')}>
                  <select
                     data-autofocus
                     className='field-input'
                     value={toId}
                     onChange={(event) => setToId(event.target.value)}
                  >
                     <option value=''>{t('Выберите сотрудника')}</option>
                     {others.map(({ id, name }) => (
                        <option key={id} value={id}>
                           {name}
                        </option>
                     ))}
                  </select>
               </Field>
            </>
         )}
      </ConfirmDialog>
   );
};

export default DeleteUserDialog;

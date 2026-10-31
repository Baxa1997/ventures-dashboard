import { ACCESS, ROLE_LABELS } from '@modules/Settings/constants';
import { staffChange, staffInputOf } from '@modules/Settings/helpers';
import settings, { currentSettings } from '@modules/Settings/services';
import {
   Button,
   Checkbox,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { ROLE_LABELS as SYSTEM_ROLES } from '@shared/constants';
import { useAction, useCurrentUser } from '@shared/hooks';
import type {
   Access,
   StaffCredentials,
   StaffInput,
   StaffMember,
   StaffRole,
} from '@shared/types/settings.types';
import type { Role } from '@shared/types/work.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface StaffDialogProps {
   member: StaffMember | null; // null: a new employee
   open: boolean;
   onClose: () => void;
   onCreated: (credentials: StaffCredentials) => void; // what to hand over
}

const BLANK: StaffInput = {
   name: '',
   email: '',
   position: '',
   phone: '',
   role: 'analyst',
   roles: [],
   access: 'work',
   active: true,
};

const StaffForm = ({
   member,
   onClose,
   onCreated,
}: Omit<StaffDialogProps, 'open'>) => {
   const { t } = useTranslation('settings');
   const { t: tLayout } = useTranslation('layout');
   const user = useCurrentUser();
   const me = member?.id === user.id;
   const [value, setValue] = useState<StaffInput>(() =>
      member ? staffInputOf(member) : BLANK,
   );
   const [tried, setTried] = useState(false);
   const set = (patch: Partial<StaffInput>) =>
      setValue((prev) => ({ ...prev, ...patch }));

   const errors = {
      name: value.name.trim() ? '' : t('Укажите имя'),
      email: !/^\S+@\S+\.\S+$/.test(value.email.trim())
         ? t('Укажите рабочую почту')
         : currentSettings()?.staff.some(
                ({ id, email }) =>
                   id !== member?.id &&
                   email.toLowerCase() === value.email.trim().toLowerCase(),
             )
           ? t('Сотрудник с такой почтой уже есть')
           : '',
      roles: value.roles.length ? '' : t('Выберите хотя бы одну роль'),
   };

   const save = useAction(
      async () => {
         const next: StaffInput = {
            ...value,
            name: value.name.trim(),
            email: value.email.trim(),
            position: value.position.trim(),
            phone: value.phone.trim(),
         };
         if (!member) {
            onCreated(
               await settings.invite(
                  next,
                  user.id,
                  t('Новый пользователь · {{name}}', { name: next.name }),
               ),
            );
            return;
         }
         const change = staffChange(t, tLayout, staffInputOf(member), next);
         if (!Object.keys(change.patch).length) return;
         await settings.updateStaff(member.id, change.patch, user.id, {
            field: t('Пользователь · {{name}}', { name: next.name }),
            from: change.from,
            to: change.to,
         });
      },
      member
         ? { kind: 'save' }
         : {
              success: t('Сотрудник добавлен'),
              error: t('Не удалось добавить сотрудника'),
           },
   );

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setTried(true);
      if (errors.name || errors.email || errors.roles) return;
      if (await save.run()) onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4 sm:grid-cols-2'>
               <Field
                  error={tried ? errors.name : undefined}
                  label={t('Имя')}
               >
                  <input
                     data-autofocus
                     aria-invalid={tried && !!errors.name}
                     className='field-input'
                     placeholder={t('например, А. Каримов')}
                     value={value.name}
                     onChange={(event) => set({ name: event.target.value })}
                  />
               </Field>
               <Field
                  error={tried ? errors.email : undefined}
                  label={t('Почта')}
               >
                  <input
                     aria-invalid={tried && !!errors.email}
                     className='field-input'
                     type='email'
                     value={value.email}
                     onChange={(event) => set({ email: event.target.value })}
                  />
               </Field>
               <Field label={t('Должность')}>
                  <input
                     className='field-input'
                     value={value.position}
                     onChange={(event) =>
                        set({ position: event.target.value })
                     }
                  />
               </Field>
               <Field label={t('Телефон')}>
                  <input
                     className='field-input'
                     inputMode='tel'
                     placeholder='+998 90 123 45 67'
                     type='tel'
                     value={value.phone}
                     onChange={(event) => set({ phone: event.target.value })}
                  />
               </Field>
               <Field
                  hint={me ? t('Свою роль меняет другой директор') : undefined}
                  label={t('Роль в системе')}
               >
                  <select
                     className='field-input disabled:bg-ground'
                     disabled={me}
                     value={value.role}
                     onChange={(event) =>
                        set({ role: event.target.value as Role })
                     }
                  >
                     {(Object.keys(SYSTEM_ROLES) as Role[]).map((role) => (
                        <option key={role} value={role}>
                           {tLayout(SYSTEM_ROLES[role])}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field label={t('Доступ')}>
                  <select
                     className='field-input'
                     value={value.access}
                     onChange={(event) =>
                        set({ access: event.target.value as Access })
                     }
                  >
                     {(Object.keys(ACCESS) as Access[]).map((access) => (
                        <option key={access} value={access}>
                           {t(ACCESS[access].label)}
                        </option>
                     ))}
                  </select>
               </Field>
            </div>
            <fieldset className='mt-5'>
               <legend className='text-ink-soft text-xs font-medium'>
                  {t('Обязанности')}
               </legend>
               <ul className='mt-2 grid gap-2.5 sm:grid-cols-2'>
                  {(Object.keys(ROLE_LABELS) as StaffRole[]).map((role) => {
                     const checked = value.roles.includes(role);
                     const toggle = () =>
                        set({
                           roles: checked
                              ? value.roles.filter((other) => other !== role)
                              : [...value.roles, role],
                        });
                     return (
                        <li key={role} className='flex items-center gap-2.5'>
                           <Checkbox
                              checked={checked}
                              label={t(ROLE_LABELS[role])}
                              onChange={toggle}
                           />
                           <button
                              type='button'
                              className='text-left'
                              onClick={toggle}
                           >
                              {t(ROLE_LABELS[role])}
                           </button>
                        </li>
                     );
                  })}
               </ul>
               {tried && errors.roles && (
                  <p role='alert' className='text-danger mt-2 text-xs'>
                     {errors.roles}
                  </p>
               )}
            </fieldset>
         </ModalBody>
         <ModalFooter
            note={
               member
                  ? t('Изменение попадёт в журнал')
                  : t(
                       'Войти сотрудник сможет, когда для него создадут пользователя ucode',
                    )
            }
         >
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button loading={save.pending} type='submit'>
               {member ? t('Сохранить') : t('Пригласить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

/* An employee added or changed by the director: who they are, their role in
   the system (what the panel lets them do), the duties they hold and their
   access level. A person can hold several duties. */
const StaffDialog = ({
   member,
   open,
   onClose,
   onCreated,
}: StaffDialogProps) => {
   const { t } = useTranslation('settings');

   return (
      <Modal
         open={open}
         subtitle={member ? t('Пользователи') : undefined}
         title={member ? member.name : t('Новый пользователь')}
         onClose={onClose}
      >
         {open && (
            <StaffForm
               key={member?.id ?? 'new'}
               member={member}
               onClose={onClose}
               onCreated={onCreated}
            />
         )}
      </Modal>
   );
};

export default StaffDialog;

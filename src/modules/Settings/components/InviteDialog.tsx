import { ACCESS, ROLE_LABELS } from '@modules/Settings/constants';
import settings from '@modules/Settings/services';
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
import { useAction } from '@shared/hooks';
import type { Access, StaffRole } from '@shared/types/settings.types';
import type { Role } from '@shared/types/work.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface InviteDialogProps {
   open: boolean;
   onClose: () => void;
}

/* Adds an employee with their role in the system, which their ucode role and
   what the panel lets them do follow, and the duties they hold. A person can
   hold several duties; the access level follows the widest of them. */
const InviteDialog = ({ open, onClose }: InviteDialogProps) => {
   const { t } = useTranslation('settings');
   const { t: tLayout } = useTranslation('layout');
   const [name, setName] = useState('');
   const [role, setRole] = useState<Role>('analyst');
   const [email, setEmail] = useState('');
   const [position, setPosition] = useState('');
   const [roles, setRoles] = useState<StaffRole[]>([]);
   const [access, setAccess] = useState<Access>('work');
   const [errors, setErrors] = useState<{
      name?: string;
      email?: string;
      roles?: string;
   }>({});

   const invite = useAction(
      () =>
         settings.invite({
            name: name.trim(),
            email: email.trim(),
            position: position.trim(),
            role,
            roles,
            access,
         }),
      {
         success: t('Сотрудник добавлен'),
         error: t('Не удалось добавить сотрудника'),
      },
   );

   const close = () => {
      setName('');
      setEmail('');
      setPosition('');
      setRole('analyst');
      setRoles([]);
      setErrors({});
      onClose();
   };

   return (
      <Modal open={open} title={t('Пригласить пользователя')} onClose={close}>
         <form
            className={MODAL_FORM}
            onSubmit={async (event) => {
               event.preventDefault();
               const next = {
                  name: name.trim() ? undefined : t('Укажите имя'),
                  email: /^\S+@\S+\.\S+$/.test(email.trim())
                     ? undefined
                     : t('Укажите рабочую почту'),
                  roles: roles.length
                     ? undefined
                     : t('Выберите хотя бы одну роль'),
               };
               setErrors(next);
               if (next.name || next.email || next.roles) return;
               if (await invite.run()) close();
            }}
         >
            <ModalBody>
               <div className='grid gap-4 sm:grid-cols-2'>
                  <Field error={errors.name} label={t('Имя')}>
                     <input
                        data-autofocus
                        aria-invalid={!!errors.name}
                        className='field-input'
                        placeholder={t('например, А. Каримов')}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                     />
                  </Field>
                  <Field error={errors.email} label={t('Почта')}>
                     <input
                        aria-invalid={!!errors.email}
                        className='field-input'
                        type='email'
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                     />
                  </Field>
                  <Field label={t('Должность')}>
                     <input
                        className='field-input'
                        value={position}
                        onChange={(event) => setPosition(event.target.value)}
                     />
                  </Field>
                  <Field label={t('Роль в системе')}>
                     <select
                        className='field-input'
                        value={role}
                        onChange={(event) =>
                           setRole(event.target.value as Role)
                        }
                     >
                        {(Object.keys(SYSTEM_ROLES) as Role[]).map((value) => (
                           <option key={value} value={value}>
                              {tLayout(SYSTEM_ROLES[value])}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field label={t('Доступ')}>
                     <select
                        className='field-input'
                        value={access}
                        onChange={(event) =>
                           setAccess(event.target.value as Access)
                        }
                     >
                        {(Object.keys(ACCESS) as Access[]).map((value) => (
                           <option key={value} value={value}>
                              {t(ACCESS[value].label)}
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
                        const checked = roles.includes(role);
                        const toggle = () =>
                           setRoles((prev) =>
                              checked
                                 ? prev.filter((value) => value !== role)
                                 : [...prev, role],
                           );
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
                  {errors.roles && (
                     <p role='alert' className='text-danger mt-2 text-xs'>
                        {errors.roles}
                     </p>
                  )}
               </fieldset>
            </ModalBody>
            <ModalFooter
               note={t(
                  'Войти сотрудник сможет, когда для него создадут пользователя ucode',
               )}
            >
               <Button variant='ghost' onClick={close}>
                  {t('Отмена')}
               </Button>
               <Button loading={invite.pending} type='submit'>
                  {t('Пригласить')}
               </Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default InviteDialog;

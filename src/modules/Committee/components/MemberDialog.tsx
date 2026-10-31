import { MEMBER_ROLE_LABELS } from '@modules/Committee/constants';
import committee from '@modules/Committee/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { TEAM } from '@shared/constants';
import type {
   CommitteeMember,
   MemberInput,
   MemberRole,
} from '@shared/types/committee.types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRequest } from '@shared/hooks';

interface MemberDialogProps {
   // a member: edit them; 'new': add one; null — closed
   member: CommitteeMember | 'new' | null;
   onClose: () => void;
   onCreated?: (id: string) => void; // a new person, to ask to a meeting
}

// An outside person in the team select.
const OUTSIDE = '';

const EMPTY: MemberInput = {
   name: '',
   role: 'independent',
   remote: false,
   contract: '',
};

/* A person who takes part in the meetings: somebody of the fund's team or
   from outside, their role and how they take part. They vote at the
   meetings; the secretary records their votes, so nobody needs an account in
   the panel for it. */
const MemberDialog = ({ member, onClose, onCreated }: MemberDialogProps) => {
   const { t } = useTranslation('committee');
   const editing = member !== 'new' && member !== null ? member : null;
   const [values, setValues] = useState<MemberInput>(EMPTY);
   const [error, setError] = useState('');
   const saving = useRequest(
      editing ? {} : { kind: 'create', success: t('Участник добавлен') },
   );

   // starts afresh each time the dialog opens
   useEffect(() => {
      setValues(member !== 'new' && member !== null ? member : EMPTY);
      setError('');
   }, [member]);

   const set = <K extends keyof MemberInput>(key: K, value: MemberInput[K]) =>
      setValues((prev) => ({ ...prev, [key]: value }));

   const save = async (write: () => Promise<void>) => {
      if (
         await saving.run(async () => {
            await write();
         })
      )
         onClose();
   };

   const submit = () => {
      const name = values.name.trim();
      if (!name) return setError(t('Укажите имя'));
      const input = { ...values, name, contract: values.contract.trim() };
      void save(async () => {
         if (editing) {
            await committee.updateMember(editing.id, input);
            return;
         }
         const id = await committee.addMember(input);
         onCreated?.(id);
      });
   };

   return (
      <Modal
         open={member !== null}
         title={editing ? t('Участник') : t('Новый участник')}
         onClose={onClose}
      >
         <form
            className={MODAL_FORM}
            onSubmit={(event) => {
               event.preventDefault();
               submit();
            }}
         >
            <ModalBody>
               <div className='grid gap-4 sm:grid-cols-2'>
                  <Field className='sm:col-span-2' label={t('Кто')}>
                     <select
                        className='field-input'
                        value={values.employeeId ?? OUTSIDE}
                        onChange={(event) => {
                           const employee = TEAM.find(
                              ({ id }) => id === event.target.value,
                           );
                           setValues((prev) => ({
                              ...prev,
                              employeeId: employee?.id,
                              name: employee ? employee.name : prev.name,
                           }));
                           setError('');
                        }}
                     >
                        <option value={OUTSIDE}>
                           {t('Не из команды фонда')}
                        </option>
                        {TEAM.map(({ id, name }) => (
                           <option key={id} value={id}>
                              {name}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field
                     className='sm:col-span-2'
                     error={error}
                     label={t('Имя')}
                  >
                     <input
                        data-autofocus
                        aria-invalid={!!error}
                        className='field-input'
                        maxLength={120}
                        value={values.name}
                        onChange={(event) => {
                           set('name', event.target.value);
                           setError('');
                        }}
                     />
                  </Field>
                  <Field label={t('Роль')}>
                     <select
                        className='field-input'
                        value={values.role}
                        onChange={(event) =>
                           set('role', event.target.value as MemberRole)
                        }
                     >
                        {(Object.keys(MEMBER_ROLE_LABELS) as MemberRole[]).map(
                           (role) => (
                              <option key={role} value={role}>
                                 {t(MEMBER_ROLE_LABELS[role])}
                              </option>
                           ),
                        )}
                     </select>
                  </Field>
                  <Field label={t('Участие')}>
                     <select
                        className='field-input'
                        value={values.remote ? 'remote' : 'onsite'}
                        onChange={(event) =>
                           set('remote', event.target.value === 'remote')
                        }
                     >
                        <option value='onsite'>{t('очно')}</option>
                        <option value='remote'>{t('по видео')}</option>
                     </select>
                  </Field>
                  <Field
                     className='sm:col-span-2'
                     hint={t(
                        'Например: договор оказания услуг № 12 от 1 марта',
                     )}
                     label={t('Договор')}
                  >
                     <input
                        className='field-input'
                        maxLength={200}
                        value={values.contract}
                        onChange={(event) =>
                           set('contract', event.target.value)
                        }
                     />
                  </Field>
               </div>
            </ModalBody>
            <ModalFooter>
               <Button
                  hint={t('Закрыть окно, ничего не меняя')}
                  variant='ghost'
                  onClick={onClose}
               >
                  {t('Отмена')}
               </Button>
               <Button
                  hint={
                     editing
                        ? t('Сохранить изменения участника')
                        : t('Добавить человека в состав ИК')
                  }
                  loading={saving.pending}
                  type='submit'
               >
                  {editing ? t('Сохранить') : t('Добавить')}
               </Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default MemberDialog;

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
import type {
   CommitteeMember,
   MemberInput,
   MemberRole,
} from '@shared/types/committee.types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface MemberDialogProps {
   // a member: edit them; 'new': add one; null — closed
   member: CommitteeMember | 'new' | null;
   onClose: () => void;
}

const EMPTY: MemberInput = {
   name: '',
   role: 'independent',
   remote: false,
   contract: '',
};

/* A member of the committee: who they are, their role and how they take part.
   The members vote at the meetings; the secretary records their votes, so a
   member needs no account in the panel. */
const MemberDialog = ({ member, onClose }: MemberDialogProps) => {
   const { t } = useTranslation('committee');
   const editing = member !== 'new' && member !== null ? member : null;
   const [values, setValues] = useState<MemberInput>(EMPTY);
   const [error, setError] = useState('');
   const [saving, setSaving] = useState(false);

   // starts afresh each time the dialog opens
   useEffect(() => {
      setValues(member !== 'new' && member !== null ? member : EMPTY);
      setError('');
   }, [member]);

   const set = <K extends keyof MemberInput>(key: K, value: MemberInput[K]) =>
      setValues((prev) => ({ ...prev, [key]: value }));

   const save = async (write: () => Promise<void>) => {
      setSaving(true);
      try {
         await write();
         onClose();
      } finally {
         setSaving(false);
      }
   };

   const submit = () => {
      const name = values.name.trim();
      if (!name) return setError(t('Укажите имя'));
      const input = { ...values, name, contract: values.contract.trim() };
      void save(() =>
         editing
            ? committee.updateMember(editing.id, input)
            : committee.addMember(input),
      );
   };

   return (
      <Modal
         open={member !== null}
         title={editing ? t('Член ИК') : t('Добавить члена ИК')}
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
               {editing && (
                  <Button
                     className='mr-auto'
                     disabled={saving}
                     variant='text'
                     onClick={() =>
                        void save(() => committee.retireMember(editing.id))
                     }
                  >
                     {t('Вывести из состава')}
                  </Button>
               )}
               <Button variant='ghost' onClick={onClose}>
                  {t('Отмена')}
               </Button>
               <Button disabled={saving} type='submit'>
                  {editing ? t('Сохранить') : t('Добавить')}
               </Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default MemberDialog;

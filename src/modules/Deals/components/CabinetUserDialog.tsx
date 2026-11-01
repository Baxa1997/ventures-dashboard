import { cabinetPeople } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { CABINET_ROLES } from '@modules/Portfolio/constants';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { useAction, useCurrentUser, useServiceData } from '@shared/hooks';
import type {
   CabinetPerson,
   CabinetUserInput,
   Deal,
} from '@shared/types/deals.types';
import type { StaffCredentials } from '@shared/types/settings.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CabinetUserDialogProps {
   deal: Deal;
   person: CabinetPerson | null; // null: a new one
   open: boolean;
   onClose: () => void;
   onCreated: (credentials: StaffCredentials) => void; // what to hand over
}

const loadDeals = () => deals.getDeals();
const subscribeDeals = (listener: () => void) => deals.subscribe(listener);

const normal = (email: string) => email.trim().toLowerCase();

const UserForm = ({
   deal,
   person,
   onClose,
   onCreated,
}: Omit<CabinetUserDialogProps, 'open'>) => {
   const { t } = useTranslation('deals');
   const { t: tp } = useTranslation('portfolio');
   const user = useCurrentUser();
   const all = useServiceData(loadDeals, subscribeDeals) ?? [];
   // the first user of a deal entered by hand owns its cabinet
   const opening = !deal.applicationId;
   const [value, setValue] = useState<CabinetUserInput>(() => ({
      name: person?.name ?? (opening ? (deal.applicantName ?? '') : ''),
      email: person?.email ?? (opening ? (deal.applicantEmail ?? '') : ''),
      role: person?.role ?? (opening ? 'ceo' : 'cfo'),
   }));
   const [tried, setTried] = useState(false);
   const set = (patch: Partial<CabinetUserInput>) =>
      setValue((prev) => ({ ...prev, ...patch }));
   const fixedRole = opening || !!person?.owner;

   /* An email belongs to one startup: the cabinet shows a person one application,
      and a password here would open another company's cabinet for its owner. */
   const email = normal(value.email);
   const elsewhere = all.find(
      (item) =>
         item.id !== deal.id &&
         cabinetPeople(item).some((other) => other.email === email),
   );
   const errors = {
      name: value.name.trim() ? '' : t('Укажите имя'),
      email: !/^\S+@\S+\.\S+$/.test(email)
         ? t('Укажите почту')
         : cabinetPeople(deal).some(
                (other) =>
                   other.email === email && other.email !== person?.email,
             )
           ? t('Эта почта уже есть в этом кабинете')
           : elsewhere
             ? t('Эта почта уже есть в кабинете другой компании: {{company}}', {
                  company: elsewhere.company,
               })
             : '',
   };

   const save = useAction(
      async () => {
         if (person) {
            await deals.updateCabinetUser(
               deal.id,
               person,
               value,
               t('Кабинет основателя: изменён {{name}} ({{email}})', {
                  name: value.name.trim(),
                  email,
               }),
            );
            return;
         }
         onCreated(
            await deals.addCabinetUser(
               deal.id,
               value,
               user.id,
               t('Кабинет основателя: добавлен {{name}} ({{email}})', {
                  name: value.name.trim(),
                  email,
               }),
            ),
         );
      },
      person
         ? { kind: 'save' }
         : {
              success: t('Пользователь добавлен'),
              error: t('Не удалось добавить пользователя'),
           },
   );

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setTried(true);
      if (errors.name || errors.email) return;
      if (await save.run()) onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               <Field
                  error={tried ? errors.name : undefined}
                  label={t('Имя и фамилия')}
               >
                  <input
                     data-autofocus
                     aria-invalid={tried && !!errors.name}
                     className='field-input'
                     maxLength={120}
                     value={value.name}
                     onChange={(event) => set({ name: event.target.value })}
                  />
               </Field>
               <Field
                  error={tried ? errors.email : undefined}
                  label={t('Почта для входа')}
               >
                  <input
                     aria-invalid={tried && !!errors.email}
                     autoCapitalize='none'
                     className='field-input'
                     inputMode='email'
                     maxLength={160}
                     spellCheck={false}
                     type='email'
                     value={value.email}
                     onChange={(event) => set({ email: event.target.value })}
                  />
               </Field>
               <Field
                  hint={
                     person?.owner
                        ? t(
                             'Тот, кто подал заявку, всегда CEO и владелец кабинета.',
                          )
                        : opening
                          ? t(
                               'Первый пользователь становится владельцем кабинета с ролью CEO.',
                            )
                          : undefined
                  }
                  label={t('Роль в кабинете')}
               >
                  <select
                     className='field-input disabled:bg-ground'
                     disabled={fixedRole}
                     value={value.role}
                     onChange={(event) =>
                        set({
                           role: event.target.value as CabinetUserInput['role'],
                        })
                     }
                  >
                     {(
                        Object.keys(CABINET_ROLES) as CabinetUserInput['role'][]
                     ).map((role) => (
                        <option key={role} value={role}>
                           {tp(CABINET_ROLES[role])}
                        </option>
                     ))}
                  </select>
               </Field>
            </div>
         </ModalBody>
         <ModalFooter>
            <Button
               hint={t('Закрыть окно, ничего не меняя')}
               type='button'
               variant='ghost'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               hint={
                  person
                     ? t('Сохранить изменения пользователя кабинета')
                     : t('Создать пользователя и показать логин и пароль')
               }
               loading={save.pending}
               type='submit'
            >
               {person ? t('Сохранить') : t('Добавить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

// A person of the startup, added or changed; their password is given on the card.
const CabinetUserDialog = ({
   deal,
   person,
   open,
   onClose,
   onCreated,
}: CabinetUserDialogProps) => {
   const { t } = useTranslation('deals');
   return (
      <Modal
         open={open}
         subtitle={deal.company}
         title={
            person
               ? t('Пользователь кабинета')
               : t('Новый пользователь кабинета')
         }
         onClose={onClose}
      >
         {open && (
            <UserForm
               key={person?.email ?? 'new'}
               deal={deal}
               person={person}
               onClose={onClose}
               onCreated={onCreated}
            />
         )}
      </Modal>
   );
};

export default CabinetUserDialog;

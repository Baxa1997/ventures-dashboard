import { teamOf } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import {
   Avatar,
   Button,
   Card,
   ConfirmDialog,
   Field,
   ItemActions,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   NoData,
} from '@shared/components';
import { employeeOf, TEAM } from '@shared/constants';
import { shortName } from '@shared/helpers';
import type { Deal, TeamMember } from '@shared/types/deals.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRequest } from '@shared/hooks';

interface TeamCardProps {
   deal: Deal;
   editable: boolean;
}

// The legal form in front of a company's name does not go into its initials.
const LEGAL_FORM = /^(ООО|АО|ИП|ЧП)\s+/u;

// An outside party in the employee select.
const OUTSIDE = 'outside';

// A member the owner added; the others come from the deal.
type OwnMember = TeamMember & { id: string };

/* «Команда сделки»: the owner, the sponsor, the colleague who checked the
   screening and DD's outside executors come from the deal itself; the owner
   adds anybody else, such as the lawyer who prepares the documents, and
   changes or removes those. */
const TeamCard = ({ deal, editable }: TeamCardProps) => {
   const { t } = useTranslation('deals');
   // null: closed; 'new': a member added
   const [editing, setEditing] = useState<OwnMember | 'new' | null>(null);
   const [removing, setRemoving] = useState<{
      id: string;
      name: string;
   } | null>(null);
   const team = teamOf(t, deal);

   return (
      <Card
         action={
            editable && (
               <button
                  type='button'
                  className='link'
                  data-hint={t('Добавить человека в команду сделки')}
                  onClick={() => setEditing('new')}
               >
                  {t('Добавить')}
               </button>
            )
         }
         title={t('Команда сделки')}
      >
         {team.length ? (
            <ul className='divide-line divide-y px-5 py-1'>
               {team.map((member, index) => {
                  const employee = employeeOf(member.employeeId);
                  const name = employee
                     ? shortName(employee.name)
                     : (member.name ?? '');
                  return (
                     <li
                        key={member.id ?? `${name}-${index}`}
                        className='flex items-center gap-3 py-3'
                     >
                        <Avatar
                           name={
                              employee?.name ??
                              name
                                 .replace(/[^\p{L}\s]/gu, '')
                                 .replace(LEGAL_FORM, '')
                                 .trim()
                           }
                        />
                        <div className='min-w-0 flex-1'>
                           <div className='text-meta font-semibold'>{name}</div>
                           <div className='text-ink-soft mt-0.5 text-xs'>
                              {member.role}
                           </div>
                        </div>
                        {editable && member.id && (
                           <ItemActions
                              icons
                              name={name}
                              deleteLabel={t('Убрать из команды')}
                              onDelete={() =>
                                 setRemoving({ id: member.id as string, name })
                              }
                              onEdit={() => setEditing(member as OwnMember)}
                           />
                        )}
                     </li>
                  );
               })}
            </ul>
         ) : (
            <NoData>{t('Назначьте владельца сделки')}</NoData>
         )}
         <Modal
            open={editing !== null}
            subtitle={deal.company}
            title={
               editing === 'new'
                  ? t('Добавить в команду')
                  : t('Участник команды')
            }
            onClose={() => setEditing(null)}
         >
            {editing && (
               <MemberForm
                  key={editing === 'new' ? 'new' : editing.id}
                  deal={deal}
                  member={editing === 'new' ? null : editing}
                  onClose={() => setEditing(null)}
               />
            )}
         </Modal>
         <ConfirmDialog
            confirmLabel={t('Убрать')}
            error={t('Не удалось убрать из команды')}
            open={removing !== null}
            subtitle={deal.company}
            success={t('Убрано из команды')}
            title={t('Убрать {{name}} из команды сделки?', {
               name: removing?.name ?? '',
            })}
            onClose={() => setRemoving(null)}
            onConfirm={() =>
               removing && deals.removeTeamMember(deal.id, removing.id)
            }
         />
      </Card>
   );
};

type Errors = Partial<Record<'name' | 'role', string>>;

interface MemberFormProps {
   deal: Deal;
   member: OwnMember | null; // null: a new one
   onClose: () => void;
}

const MemberForm = ({ deal, member, onClose }: MemberFormProps) => {
   const { t } = useTranslation('deals');
   const [who, setWho] = useState(
      member ? (member.employeeId ?? OUTSIDE) : (TEAM[0]?.id ?? OUTSIDE),
   );
   const [name, setName] = useState(member?.name ?? '');
   const [role, setRole] = useState(member?.role ?? '');
   const [errors, setErrors] = useState<Errors>({});
   const saving = useRequest(
      member ? {} : { kind: 'create', success: t('Добавлено в команду') },
   );
   const outside = who === OUTSIDE;

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const found: Errors = {};
      if (outside && !name.trim()) found.name = t('Укажите имя или компанию');
      if (!role.trim()) found.role = t('Укажите роль в сделке');
      if (Object.keys(found).length) {
         setErrors(found);
         return;
      }
      if (
         await saving.run(async () => {
            const input = {
               ...(outside ? { name: name.trim() } : { employeeId: who }),
               role: role.trim(),
            };
            await (member
               ? deals.updateTeamMember(deal.id, member.id, input)
               : deals.addTeamMember(deal.id, input));
         })
      )
         onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               <Field label={t('Кто')}>
                  <select
                     data-autofocus
                     className='field-input'
                     value={who}
                     onChange={(event) => {
                        setWho(event.target.value);
                        setErrors({});
                     }}
                  >
                     {TEAM.map(({ id, name: full }) => (
                        <option key={id} value={id}>
                           {shortName(full)}
                        </option>
                     ))}
                     <option value={OUTSIDE}>{t('Внешний участник')}</option>
                  </select>
               </Field>
               {outside && (
                  <Field
                     error={errors.name}
                     hint={t('компания или человек вне фонда')}
                     label={t('Имя или компания')}
                  >
                     <input
                        aria-invalid={!!errors.name}
                        className='field-input'
                        maxLength={120}
                        value={name}
                        onChange={(event) => {
                           setName(event.target.value);
                           setErrors({});
                        }}
                     />
                  </Field>
               )}
               <Field
                  error={errors.role}
                  hint={t(
                     'например, «Юр. оформление» или «Legal DD · договор № 22/26»',
                  )}
                  label={t('Роль в сделке')}
               >
                  <input
                     aria-invalid={!!errors.role}
                     className='field-input'
                     maxLength={120}
                     value={role}
                     onChange={(event) => {
                        setRole(event.target.value);
                        setErrors({});
                     }}
                  />
               </Field>
            </div>
         </ModalBody>
         <ModalFooter>
            <Button
               hint={t('Закрыть окно, ничего не меняя')}
               variant='text'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               hint={
                  member
                     ? t('Сохранить изменения')
                     : t('Добавить человека в команду сделки')
               }
               loading={saving.pending}
               type='submit'
            >
               {member ? t('Сохранить') : t('Добавить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

export default TeamCard;

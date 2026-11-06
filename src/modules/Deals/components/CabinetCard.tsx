import { cabinetPeople, isFollowOn } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { CABINET_ROLES } from '@modules/Portfolio/constants';
import CredentialsDialog from '@modules/Settings/components/CredentialsDialog';
import {
   Avatar,
   Badge,
   Button,
   Card,
   ConfirmDialog,
   ItemActions,
   NoData,
   Switch,
} from '@shared/components';
import { useAction, useCurrentUser } from '@shared/hooks';
import type { CabinetPerson, Deal } from '@shared/types/deals.types';
import type { StaffCredentials } from '@shared/types/settings.types';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CabinetUserDialog from './CabinetUserDialog';

interface CabinetCardProps {
   deal: Deal;
}

/* «Команда в кабинете основателя», as the design has it: the applicant, who owns
   the cabinet, and the startup's other people, each with their role and whether
   their access is on. The director, the deputy and the deal's owner add them here
   and give them their login and password, which is the only way in until the
   cabinet can send mail; the startup's CEO can add people in the cabinet too. */
const CabinetCard = ({ deal }: CabinetCardProps) => {
   const { t } = useTranslation('deals');
   const { t: tp } = useTranslation('portfolio');
   const user = useCurrentUser();
   const [editing, setEditing] = useState<CabinetPerson | null>(null);
   const [adding, setAdding] = useState(false);
   const [issuing, setIssuing] = useState<CabinetPerson | null>(null);
   const [removing, setRemoving] = useState<CabinetPerson | null>(null);
   const [credentials, setCredentials] = useState<StaffCredentials | null>(
      null,
   );
   const access = useAction(
      (person: CabinetPerson, active: boolean) =>
         deals.setCabinetAccess(
            deal.id,
            person,
            active,
            user.id,
            t(
               active
                  ? 'Кабинет основателя: доступ открыт, {{email}}'
                  : 'Кабинет основателя: доступ закрыт, {{email}}',
               { email: person.email },
            ),
         ),
      {
         success: (_, active) =>
            active
               ? t('Доступ к кабинету открыт')
               : t('Доступ к кабинету закрыт'),
         error: t('Не удалось изменить доступ'),
      },
   );

   const people = cabinetPeople(deal);
   const manages =
      user.role === 'director' ||
      user.role === 'deputy' ||
      deal.ownerId === user.id;
   // a follow-on belongs to a company whose cabinet its first deal opened
   const followOn = !deal.applicationId && isFollowOn(deal);

   return (
      <>
         <Card
            action={
               manages &&
               !followOn && (
                  <Button
                     hint={t(
                        'Создать логин и пароль для входа в кабинет основателя',
                     )}
                     size='sm'
                     variant='ghost'
                     onClick={() => setAdding(true)}
                  >
                     <Plus aria-hidden />
                     {t('Добавить пользователя')}
                  </Button>
               )
            }
            hint={people.length ? String(people.length) : undefined}
            title={t('Команда в кабинете основателя')}
         >
            {people.length ? (
               <ul className='divide-line divide-y'>
                  {people.map((person) => (
                     <li
                        key={person.email}
                        className='flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4.5 py-3'
                     >
                        <Avatar name={person.name} />
                        <div className='min-w-44 flex-1'>
                           <div className='truncate font-medium'>
                              {person.name}
                           </div>
                           <div className='text-ink-soft truncate text-xs'>
                              {[
                                 person.email,
                                 person.telegram &&
                                    `Telegram ${person.telegram}`,
                                 person.whatsapp &&
                                    `WhatsApp ${person.whatsapp}`,
                                 person.hasPassword
                                    ? t('пароль выдан')
                                    : t('пароль не выдан'),
                              ]
                                 .filter(Boolean)
                                 .join(' · ')}
                           </div>
                        </div>
                        <Badge tone='accent'>
                           {tp(CABINET_ROLES[person.role])}
                        </Badge>
                        {!person.active && (
                           <Badge tone='neutral'>{t('Доступ закрыт')}</Badge>
                        )}
                        {manages && (
                           <>
                              <button
                                 type='button'
                                 className='link text-xs'
                                 data-hint={
                                    person.hasPassword
                                       ? t(
                                            'Заменить пароль: старый перестанет работать, открытые входы закроются',
                                         )
                                       : t('Создать пароль для входа в кабинет')
                                 }
                                 onClick={() => setIssuing(person)}
                              >
                                 {person.hasPassword
                                    ? t('Новый пароль')
                                    : t('Выдать пароль')}
                              </button>
                              <Switch
                                 small
                                 checked={person.active}
                                 disabled={access.pending}
                                 hint={t(
                                    person.active
                                       ? 'Закрыть доступ к кабинету: {{name}}'
                                       : 'Открыть доступ к кабинету: {{name}}',
                                    { name: person.name },
                                 )}
                                 label={t('Доступ к кабинету: {{name}}', {
                                    name: person.name,
                                 })}
                                 onChange={(active) =>
                                    void access.run(person, active)
                                 }
                              />
                              <ItemActions
                                 icons
                                 name={person.name}
                                 onDelete={
                                    person.owner
                                       ? undefined
                                       : () => setRemoving(person)
                                 }
                                 onEdit={() => setEditing(person)}
                              />
                           </>
                        )}
                     </li>
                  ))}
               </ul>
            ) : (
               <NoData>
                  {followOn
                     ? t('Кабинет компании открыт в её первой сделке.')
                     : manages
                       ? t(
                            'Кабинета пока нет. Добавьте первого пользователя: он станет владельцем кабинета.',
                         )
                       : t('Кабинета пока нет.')}
               </NoData>
            )}
         </Card>
         <CabinetUserDialog
            deal={deal}
            open={adding || editing !== null}
            person={editing}
            onClose={() => {
               setAdding(false);
               setEditing(null);
            }}
            onCreated={setCredentials}
         />
         <ConfirmDialog
            confirmLabel={
               issuing?.hasPassword
                  ? t('Выдать новый пароль')
                  : t('Выдать пароль')
            }
            error={t('Не удалось выдать пароль')}
            open={issuing !== null}
            subtitle={issuing?.name}
            success={
               issuing?.hasPassword
                  ? t('Выдан новый пароль')
                  : t('Пароль выдан')
            }
            title={
               issuing?.hasPassword
                  ? t('Выдать новый пароль?')
                  : t('Выдать пароль?')
            }
            onClose={() => setIssuing(null)}
            onConfirm={async () => {
               if (!issuing) return;
               setCredentials(
                  await deals.issueCabinetPassword(
                     deal.id,
                     issuing,
                     user.id,
                     t('Кабинет основателя: выдан пароль, {{email}}', {
                        email: issuing.email,
                     }),
                  ),
               );
            }}
         >
            <p>
               {issuing?.hasPassword
                  ? t(
                       'Текущий пароль перестанет работать, а открытые входы закроются. Посмотреть его нельзя: хранится только зашифрованный след, поэтому выдаётся новый.',
                    )
                  : t(
                       'Пароль будет показан один раз: передайте его человеку из компании.',
                    )}
            </p>
         </ConfirmDialog>
         <ConfirmDialog
            error={t('Не удалось удалить пользователя')}
            open={removing !== null}
            subtitle={removing?.name}
            success={t('Пользователь удалён')}
            title={t('Удалить пользователя кабинета?')}
            onClose={() => setRemoving(null)}
            onConfirm={async () => {
               if (!removing) return;
               await deals.removeCabinetUser(
                  deal.id,
                  removing,
                  t('Кабинет основателя: удалён {{name}} ({{email}})', {
                     name: removing.name,
                     email: removing.email,
                  }),
               );
            }}
         >
            <p>
               {t(
                  '{{name}} больше не сможет войти в кабинет. Данные компании останутся.',
                  { name: removing?.name },
               )}
            </p>
         </ConfirmDialog>
         <CredentialsDialog
            address={`${import.meta.env.VITE_CABINET_URL ?? 'https://app.sqbvc.uz'}/login`}
            addressLabel={t('Адрес кабинета')}
            copyHint={t(
               'Скопировать адрес, логин и пароль, чтобы передать человеку из компании',
            )}
            credentials={credentials}
            note={t(
               'Передайте их человеку из компании. Пароль показывается один раз: после закрытия окна его не увидеть, но можно выдать новый.',
            )}
            onClose={() => setCredentials(null)}
         />
      </>
   );
};

export default CabinetCard;

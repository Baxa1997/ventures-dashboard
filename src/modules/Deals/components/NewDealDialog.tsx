import { listName, listOf, nameOf } from '@modules/Settings/services';
import {
   Button,
   ConfirmDialog,
   Field,
   MODAL_FORM,
   Modal,
   ModalBody,
   ModalFooter,
   Notice,
   Tabs,
} from '@shared/components';
import { TEAM } from '@shared/constants';
import { formatNumericDate, shortName, todayISO } from '@shared/helpers';
import { useAction, useCurrentUser } from '@shared/hooks';
import type { Deal, Fact, NewDealInput } from '@shared/types/deals.types';
import type { ListKind } from '@shared/types/settings.types';
import { type FormEvent, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COMPANY_MAX, FIELD_FACTS, TEXT_MAX } from '../constants';
import {
   applicationText,
   cabinetPeople,
   COMMITTEE_STAGES,
   formatAmount,
   handleOk,
   isFollowOn,
   normalHandle,
   stageKeys,
   stageName,
} from '../helpers';
import { useDealLinks } from '../hooks';
import deals from '../services';
import { hasCompanyFields, hasStartupFields } from '../services/ucode';
import {
   EMAIL,
   fieldErrors,
   startupSchema,
   type ValidationKey,
} from '../validations';
import LogoField, { type LogoValue } from './LogoField';
import { MoveNotice } from './MoveDealDialog';
import {
   CapitalTable,
   type OwnerDraft,
   shareTotal,
   type TeamDraft,
   type TeamField,
   TeamTable,
} from './StartupTeam';

interface NewDealDialogProps {
   open: boolean;
   deal?: Deal; // given: its details are changed instead of a deal added
   onClose: () => void;
   onCreated?: (deal: Deal) => void;
}

type Tab = 'main' | 'legal' | 'deal' | 'team';

const TABS = [
   ['main', 'Основное'],
   ['legal', 'Реквизиты и контакты'],
   ['deal', 'Сделка'],
   ['team', 'Команда и капитал'],
] as const satisfies readonly (readonly [Tab, string])[];

type TextKey =
   | 'company'
   | 'legalName'
   | 'industry'
   | 'city'
   | 'foundedYear'
   | 'employees'
   | 'website'
   | 'about'
   | 'aboutEn'
   | 'tin'
   | 'registeredAt'
   | 'legalAddress'
   | 'applicantEmail'
   | 'applicantPhone'
   | 'amount'
   | 'receivedAt';
type ListKey = 'industryKey' | 'source' | 'roundStage' | 'country';
type ErrorKey = TextKey | 'industryKey' | 'logo';

// The tab each field is on, to open the first one with a mistake.
const TAB_OF: Record<ErrorKey, Tab> = {
   company: 'main',
   legalName: 'main',
   industryKey: 'main',
   industry: 'main',
   city: 'main',
   foundedYear: 'main',
   employees: 'main',
   website: 'main',
   about: 'main',
   aboutEn: 'main',
   logo: 'main',
   tin: 'legal',
   registeredAt: 'legal',
   legalAddress: 'legal',
   applicantEmail: 'legal',
   applicantPhone: 'legal',
   amount: 'deal',
   receivedAt: 'deal',
};

// The list's row with this key if the list has it in use, else its first row.
const preferred = (kind: ListKind, key: string) => {
   const items = listOf(kind);
   return (items.find((item) => item.key === key) ?? items[0])?.key ?? '';
};

const blankPerson = (owner: boolean): TeamDraft => ({
   key: crypto.randomUUID(),
   id: '',
   owner,
   name: '',
   role: owner ? 'ceo' : 'other',
   email: '',
   telegram: '',
   whatsapp: '',
   active: true,
});

// A row the fund began to fill in; empty ones are dropped on saving.
const filled = (row: TeamDraft) =>
   !!(row.name.trim() || row.email.trim() || row.telegram || row.whatsapp);

const READ_ONLY = 'field-input bg-ground text-ink-soft';

const NewDealForm = ({
   deal,
   onClose,
   onCreated,
}: Omit<NewDealDialogProps, 'open'>) => {
   const { t, i18n } = useTranslation('deals');
   const { t: tValidation } = useTranslation('validation');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const user = useCurrentUser();
   const { company, tasks } = useDealLinks(deal?.id ?? '');
   const [tab, setTab] = useState<Tab>('main');
   const [values, setValues] = useState<Record<TextKey, string>>(() => ({
      company: deal?.company ?? '',
      legalName: deal?.legalName ?? '',
      industry: deal?.industry ?? '',
      city: deal?.city ?? '',
      foundedYear: deal?.foundedYear ? String(deal.foundedYear) : '',
      employees: deal?.employees != null ? String(deal.employees) : '',
      website: deal?.website ?? '',
      about: deal?.about ?? '',
      aboutEn: deal?.aboutEn ?? '',
      tin: deal?.tin ?? '',
      registeredAt: deal?.registeredAt ?? '',
      legalAddress: deal?.legalAddress ?? '',
      applicantEmail: deal?.applicantEmail ?? '',
      applicantPhone: deal?.applicantPhone ?? '',
      amount: deal?.amount ? String(deal.amount) : '',
      receivedAt: deal ? deal.receivedAt.slice(0, 10) : todayISO(),
   }));
   // the lists of Настройки; an application typed in by hand rarely comes
   // from the website's channels, so the source starts at the fund's network
   const [choices, setChoices] = useState<Record<ListKey, string>>(() =>
      deal
         ? {
              industryKey: deal.industryKey,
              source: deal.source,
              roundStage: deal.roundStage,
              country: deal.country,
           }
         : {
              industryKey: '',
              source: preferred('sources', 'network'),
              roundStage: preferred('rounds', 'seed'),
              country: preferred('countries', 'UZ'),
           },
   );
   const startStage = deal?.stage ?? stageKeys()[0] ?? 'inbox';
   const [stage, setStage] = useState(startStage);
   const [reason, setReason] = useState('');
   const startOwner = deal ? deal.ownerId || deal.proposedOwnerId : '';
   const [ownerId, setOwnerId] = useState(startOwner);
   const [logo, setLogo] = useState<LogoValue>({
      url: deal?.logo ?? '',
      file: null,
   });
   // the application's other rows, as the card shows them
   const [facts, setFacts] = useState<Fact[]>(() => deal?.facts ?? []);
   const people = deal ? cabinetPeople(deal) : [];
   const [team, setTeam] = useState<TeamDraft[]>(() =>
      deal
         ? people.map(({ hasPassword: _, ...person }) => ({
              ...person,
              key: person.id || person.email || crypto.randomUUID(),
           }))
         : [blankPerson(true)],
   );
   const [owners, setOwners] = useState<OwnerDraft[]>(() =>
      (deal?.owners ?? []).map((owner) => ({
         key: crypto.randomUUID(),
         name: owner.name,
         role: owner.role,
         share: String(owner.share),
      })),
   );
   const [removing, setRemoving] = useState<TeamDraft | null>(null);
   const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({});
   const [teamErrors, setTeamErrors] = useState<
      Record<string, Partial<Record<TeamField, boolean>>>
   >({});
   const [capitalWrong, setCapitalWrong] = useState(false);

   const manages =
      !deal ||
      user.role === 'director' ||
      user.role === 'deputy' ||
      deal.ownerId === user.id;
   // a follow-on belongs to a company whose cabinet its first deal opened
   const followOn = !!deal && !deal.applicationId && isFollowOn(deal);
   const teamEditable = manages && !followOn;
   const stageChanged = !!deal && stage !== startStage;

   const setValue = (key: TextKey, value: string) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
   };

   const errorOf = (key: ErrorKey) => errors[key];

   // what the fund has put in since the deal closed, and when a committee decided
   const invested = (company?.investments ?? [])
      .filter(({ dealId }) => dealId === deal?.id)
      .reduce((sum, { amount }) => sum + amount, 0);
   const decidedAt = (deal?.decisions ?? [])
      .filter(({ stage: at, date }) => COMMITTEE_STAGES.includes(at) && date)
      .map(({ date }) => date ?? '')
      .sort()
      .at(-1);

   const saving = useAction(
      async (input: NewDealInput) => {
         // a file is stored only where the deal can keep its link
         const logoUrl =
            logo.file && hasStartupFields()
               ? await deals.uploadLogo(logo.file)
               : logo.url;
         const details = { ...input, logo: logoUrl };
         const capital = owners
            .map((owner) => ({
               name: owner.name.trim(),
               role: owner.role.trim(),
               share: Number(owner.share.replace(',', '.')) || 0,
            }))
            .filter(({ name }) => name);
         const members = team.filter(filled).map(({ key: _, ...row }) => ({
            ...row,
            telegram: normalHandle(row.telegram),
            whatsapp: normalHandle(row.whatsapp),
         }));
         const teamNote = t('Кабинет основателя: команда изменена');

         if (!deal) {
            const created = await deals.createDeal(details, user.id);
            if (ownerId) await deals.setOwner(created.id, ownerId);
            if (capital.length) await deals.setOwners(created.id, capital);
            if (members.length)
               await deals.saveCabinetTeam(
                  created.id,
                  members,
                  user.id,
                  teamNote,
               );
            if (stage !== startStage)
               await deals.moveDeal(
                  created.id,
                  { stage, status: 'active' },
                  '',
                  user.id,
               );
            onClose();
            onCreated?.(created);
            return;
         }

         const changed = (Object.keys(details) as (keyof NewDealInput)[]).some(
            (key) => JSON.stringify(details[key]) !== JSON.stringify(deal[key]),
         );
         const factsChanged =
            !!deal.facts &&
            JSON.stringify(facts) !== JSON.stringify(deal.facts);
         if (changed || factsChanged)
            await deals.updateDetails(
               deal.id,
               details,
               user.id,
               deal.facts && facts,
            );
         if (ownerId !== startOwner) await deals.setOwner(deal.id, ownerId);
         if (JSON.stringify(capital) !== JSON.stringify(deal.owners))
            await deals.setOwners(deal.id, capital);
         if (teamEditable)
            await deals.saveCabinetTeam(deal.id, members, user.id, teamNote);
         if (stageChanged)
            await deals.moveDeal(
               deal.id,
               { stage, status: 'active' },
               reason.trim(),
               user.id,
            );
         onClose();
      },
      deal
         ? { success: t('Данные стартапа сохранены') }
         : {
              kind: 'create',
              success: t('Сделка создана'),
              error: t('Не удалось добавить сделку'),
           },
   );

   // The form's mistakes, each shown at its field; the first one's tab opens.
   const check = () => {
      const result = startupSchema.safeParse(values);
      const found: Partial<Record<ErrorKey, string>> = {};
      if (!result.success)
         for (const [key, message] of Object.entries(
            fieldErrors<TextKey>(result.error),
         ))
            found[key as TextKey] = tValidation(message as ValidationKey);
      if (!choices.industryKey)
         found.industryKey = tValidation('Обязательное поле');

      const wrong: Record<string, Partial<Record<TeamField, boolean>>> = {};
      const seen = new Set<string>();
      for (const row of team.filter(filled)) {
         const email = row.email.trim().toLowerCase();
         const marks: Partial<Record<TeamField, boolean>> = {
            ...(!row.name.trim() && { name: true }),
            ...((!EMAIL.test(email) || seen.has(email)) && { email: true }),
            ...(!handleOk(normalHandle(row.telegram)) && { telegram: true }),
            ...(!handleOk(normalHandle(row.whatsapp)) && { whatsapp: true }),
         };
         seen.add(email);
         if (Object.keys(marks).length) wrong[row.key] = marks;
      }
      const named = owners.filter(({ name }) => name.trim());
      const capitalBad =
         named.length > 0 && Math.abs(shareTotal(named) - 100) > 0.01;

      setErrors(found);
      setTeamErrors(wrong);
      setCapitalWrong(capitalBad);
      const first = (Object.keys(found) as ErrorKey[])
         .map((key) => TAB_OF[key])
         .concat(Object.keys(wrong).length || capitalBad ? ['team'] : [])
         .sort(
            (a, b) =>
               TABS.findIndex(([id]) => id === a) -
               TABS.findIndex(([id]) => id === b),
         )[0];
      if (first) setTab(first);
      return result.success && !first ? result.data : null;
   };

   const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = check();
      if (!data) return;
      const today = todayISO();
      const receivedAt = deal
         ? data.receivedAt === deal.receivedAt.slice(0, 10)
            ? deal.receivedAt
            : `${data.receivedAt} ${deal.receivedAt.slice(11) || '09:00'}`
         : data.receivedAt === today
           ? undefined
           : `${data.receivedAt} 09:00`;
      void saving.run({
         company: data.company,
         about: data.about,
         legalName: data.legalName,
         tin: data.tin,
         foundedYear: Number(data.foundedYear) || null,
         employees: data.employees === '' ? null : Number(data.employees),
         website: data.website,
         logo: logo.url,
         city: data.city,
         aboutEn: data.aboutEn,
         registeredAt: data.registeredAt,
         legalAddress: data.legalAddress,
         applicantEmail: data.applicantEmail,
         applicantPhone: data.applicantPhone,
         ...(receivedAt && { receivedAt }),
         industry: data.industry,
         amount: data.amount,
         ...choices,
         ...(deal?.followOnOf && { followOnOf: deal.followOnOf }),
      });
   };

   const select = (key: ListKey, kind: ListKind, empty?: string) => (
      <select
         aria-invalid={key === 'industryKey' && !!errors.industryKey}
         className='field-input'
         value={choices[key]}
         onChange={(event) => {
            setChoices((prev) => ({ ...prev, [key]: event.target.value }));
            setErrors((prev) => ({ ...prev, [key]: undefined }));
         }}
      >
         {empty !== undefined && <option value=''>{empty}</option>}
         {listOf(kind).map((item) => (
            <option key={item.key} value={item.key}>
               {nameOf(item)}
            </option>
         ))}
         {/* a row turned off in Настройки stays on the deal that has it */}
         {choices[key] &&
            !listOf(kind).some((item) => item.key === choices[key]) && (
               <option value={choices[key]}>
                  {listName(kind, choices[key])}
               </option>
            )}
      </select>
   );

   const input = (
      key: TextKey,
      extra: {
         type?: string;
         inputMode?: 'numeric' | 'tel' | 'email' | 'url';
         placeholder?: string;
         autoFocus?: boolean;
      } = {},
   ) => {
      const { autoFocus, ...rest } = extra;
      return (
         <input
            aria-invalid={!!errors[key]}
            className='field-input'
            maxLength={COMPANY_MAX}
            value={values[key]}
            onChange={(event) => setValue(key, event.target.value)}
            {...(autoFocus && { 'data-autofocus': true })}
            {...rest}
         />
      );
   };

   const area = (key: TextKey) => (
      <textarea
         aria-invalid={!!errors[key]}
         className='field-input field-sizing-content min-h-20 resize-y'
         maxLength={TEXT_MAX}
         rows={3}
         value={values[key]}
         onChange={(event) => setValue(key, event.target.value)}
      />
   );

   // a value the form shows but does not change, with where it comes from
   const readOnly = (label: string, value: string, hint: string) => (
      <Field hint={hint} label={label}>
         <input readOnly className={READ_ONLY} tabIndex={-1} value={value} />
      </Field>
   );

   const extraFacts = facts
      .map((fact, index) => ({ fact, index }))
      .filter(({ fact: [label] }) => !FIELD_FACTS.includes(label));

   const sections: Record<Tab, ReactNode> = {
      main: (
         <div className='grid gap-4 sm:grid-cols-2'>
            <Field
               className='sm:col-span-2'
               error={errorOf('logo')}
               label={t('Логотип')}
            >
               <LogoField
                  error={errorOf('logo')}
                  name={values.company}
                  value={logo}
                  onChange={(value) => {
                     setLogo(value);
                     setErrors((prev) => ({ ...prev, logo: undefined }));
                  }}
                  onError={(message) =>
                     setErrors((prev) => ({ ...prev, logo: message }))
                  }
               />
            </Field>
            <Field error={errorOf('company')} label={t('Название')}>
               {input('company', { autoFocus: true })}
            </Field>
            <Field error={errorOf('legalName')} label={t('Юридическое лицо')}>
               {input('legalName', { placeholder: t('ООО / LLC') })}
            </Field>
            <Field error={errorOf('industryKey')} label={t('Отрасль')}>
               {select('industryKey', 'industries', t('Выберите отрасль'))}
            </Field>
            <Field label={t('Раунд')}>{select('roundStage', 'rounds')}</Field>
            <Field label={t('Этап')}>
               <select
                  className='field-input'
                  value={stage}
                  onChange={(event) => setStage(event.target.value)}
               >
                  {stageKeys().map((key) => (
                     <option key={key} value={key}>
                        {stageName(key)}
                        {deal && key === startStage ? ` · ${t('сейчас')}` : ''}
                     </option>
                  ))}
               </select>
            </Field>
            <Field error={errorOf('city')} label={t('Город')}>
               {input('city', { placeholder: t('Ташкент') })}
            </Field>
            {stageChanged && deal && (
               <div className='grid gap-3 sm:col-span-2'>
                  <MoveNotice deal={deal} stage={stage} tasks={tasks} />
                  <Field
                     hint={t('необязательно; попадёт в историю сделки')}
                     label={t('Причина смены этапа')}
                  >
                     <textarea
                        className='field-input field-sizing-content min-h-16 resize-none'
                        maxLength={400}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                     />
                  </Field>
               </div>
            )}
            <Field label={t('Страна')}>{select('country', 'countries')}</Field>
            <Field error={errorOf('foundedYear')} label={t('Год основания')}>
               {input('foundedYear', { inputMode: 'numeric' })}
            </Field>
            <Field error={errorOf('employees')} label={t('Сотрудников')}>
               {input('employees', { inputMode: 'numeric' })}
            </Field>
            <Field error={errorOf('website')} label={t('Сайт')}>
               {input('website', { inputMode: 'url', placeholder: 'https://' })}
            </Field>
            <Field
               className='sm:col-span-2'
               error={errorOf('industry')}
               hint={t('Например, «Цифровые чеки»')}
               label={t('Ниша')}
            >
               {input('industry')}
            </Field>
            <Field
               className='sm:col-span-2'
               error={errorOf('about')}
               label={t('Описание (RU, для портала)')}
            >
               {area('about')}
            </Field>
            <Field
               className='sm:col-span-2'
               error={errorOf('aboutEn')}
               label={t('Описание (EN, кабинет и сайт)')}
            >
               {area('aboutEn')}
            </Field>
         </div>
      ),
      legal: (
         <div className='grid gap-4 sm:grid-cols-2'>
            <Field error={errorOf('tin')} label={t('ИНН')}>
               {input('tin', {
                  inputMode: 'numeric',
                  placeholder: t('9 цифр'),
               })}
            </Field>
            <Field
               error={errorOf('registeredAt')}
               label={t('Дата регистрации')}
            >
               {input('registeredAt', { type: 'date' })}
            </Field>
            <Field
               className='sm:col-span-2'
               error={errorOf('legalAddress')}
               label={t('Юридический адрес')}
            >
               {input('legalAddress')}
            </Field>
            <Field
               error={errorOf('applicantEmail')}
               label={t('Email компании')}
            >
               {input('applicantEmail', { type: 'email', inputMode: 'email' })}
            </Field>
            <Field error={errorOf('applicantPhone')} label={t('Телефон')}>
               {input('applicantPhone', {
                  type: 'tel',
                  inputMode: 'tel',
                  placeholder: '+998',
               })}
            </Field>
            {extraFacts.length > 0 && (
               <p className='text-ink-soft text-xs font-semibold sm:col-span-2'>
                  {t('Из заявки')}
               </p>
            )}
            {extraFacts.map(({ fact: [label, value], index }) => (
               <Field
                  key={label}
                  className='sm:col-span-2'
                  label={applicationText(t, label)}
               >
                  <input
                     className='field-input'
                     maxLength={TEXT_MAX}
                     value={value}
                     onChange={(event) =>
                        setFacts((prev) =>
                           prev.map((fact, at) =>
                              at === index
                                 ? ([
                                      fact[0],
                                      event.target.value,
                                      ...fact.slice(2),
                                   ] as Fact)
                                 : fact,
                           ),
                        )
                     }
                  />
               </Field>
            ))}
         </div>
      ),
      deal: (
         <div className='grid gap-4 sm:grid-cols-2'>
            <Field
               error={errorOf('amount')}
               label={t('Запрашиваемая сумма, USD')}
            >
               {input('amount', { inputMode: 'numeric' })}
            </Field>
            {readOnly(
               t('Инвестировано, USD'),
               invested ? formatAmount(invested, language) : '—',
               t('Вносится при переводе в портфель и в карточке компании'),
            )}
            <Field label={t('Инвестиционный менеджер')}>
               <select
                  className='field-input'
                  value={ownerId}
                  onChange={(event) => setOwnerId(event.target.value)}
               >
                  <option value=''>{t('Не назначен')}</option>
                  {TEAM.map(({ id, name }) => (
                     <option key={id} value={id}>
                        {shortName(name)}
                     </option>
                  ))}
               </select>
            </Field>
            <Field label={t('Источник')}>{select('source', 'sources')}</Field>
            <Field error={errorOf('receivedAt')} label={t('Заявка подана')}>
               {input('receivedAt', { type: 'date' })}
            </Field>
            {readOnly(
               t('Дата решения ИК'),
               decidedAt ? formatNumericDate(decidedAt) : '—',
               t('Берётся из протокола заседания'),
            )}
         </div>
      ),
      team: (
         <div className='grid gap-5'>
            <section>
               <h3 className='text-ink-soft mb-1.5 text-xs font-semibold'>
                  {t('Доступ в кабинет основателя')}
               </h3>
               {followOn ? (
                  <p className='text-ink-soft text-meta'>
                     {t('Кабинет компании открыт в её первой сделке.')}
                  </p>
               ) : (
                  <>
                     <TeamTable
                        editable={teamEditable}
                        errors={teamErrors}
                        rows={team}
                        onAdd={() =>
                           setTeam((prev) => [
                              ...prev,
                              blankPerson(
                                 !deal?.applicationId && prev.length === 0,
                              ),
                           ])
                        }
                        onChange={(rows) => {
                           setTeam(rows);
                           setTeamErrors({});
                        }}
                        onRemove={(row) =>
                           row.id
                              ? setRemoving(row)
                              : setTeam((prev) =>
                                   prev.filter(({ key }) => key !== row.key),
                                )
                        }
                     />
                     <p
                        className={
                           Object.keys(teamErrors).length
                              ? 'text-danger mt-1.5 text-xs'
                              : 'text-ink-soft mt-1.5 text-xs'
                        }
                     >
                        {Object.keys(teamErrors).length
                           ? t(
                                'У каждого нужны имя и свой email. Telegram и WhatsApp — @username (от 5 символов: латиница, цифры, _) или номер телефона.',
                             )
                           : teamEditable
                             ? t(
                                  'Первый в списке владеет кабинетом. Пароль для входа выдаётся в карточке «Команда в кабинете основателя».',
                               )
                             : t(
                                  'Менять команду кабинета могут директор, заместитель и владелец сделки.',
                               )}
                     </p>
                  </>
               )}
            </section>
            <section>
               <h3 className='text-ink-soft mb-1.5 text-xs font-semibold'>
                  {t('Структура капитала')}
               </h3>
               <CapitalTable
                  editable
                  error={capitalWrong}
                  rows={owners}
                  onChange={(rows) => {
                     setOwners(rows);
                     setCapitalWrong(false);
                  }}
               />
               {capitalWrong && (
                  <p className='text-danger mt-1.5 text-xs'>
                     {t('Сумма долей должна быть 100%, сейчас {{total}}%', {
                        total: Number(
                           shareTotal(
                              owners.filter(({ name }) => name.trim()),
                           ).toFixed(2),
                        ).toLocaleString('ru-RU'),
                     })}
                  </p>
               )}
            </section>
         </div>
      ),
   };

   // a tab with a mistake on it shows a mark
   const wrongTabs = new Set<Tab>([
      ...(Object.keys(errors) as ErrorKey[])
         .filter((key) => errors[key])
         .map((key) => TAB_OF[key]),
      ...(Object.keys(teamErrors).length || capitalWrong
         ? ['team' as Tab]
         : []),
   ]);

   return (
      <>
         <form noValidate className={MODAL_FORM} onSubmit={handleSubmit}>
            <ModalBody>
               <div className='border-line mb-4.5 border-b'>
                  <Tabs
                     active={tab}
                     items={TABS.map(([id, label]) => ({
                        id,
                        label: t(label),
                        count: wrongTabs.has(id) ? '!' : undefined,
                     }))}
                     label={t('Разделы данных стартапа')}
                     onChange={setTab}
                  />
               </div>
               {(!hasStartupFields() || !hasCompanyFields()) && (
                  <Notice warning className='mb-4'>
                     {t(
                        'Логотип, город, описание на английском, дата регистрации, юридический адрес, Telegram и WhatsApp сохранятся, когда в ucode будет партия 23.',
                     )}
                  </Notice>
               )}
               {sections[tab]}
            </ModalBody>
            <ModalFooter
               note={
                  deal
                     ? t('Изменение попадёт в историю сделки')
                     : t(
                          'Заявка попадёт во входящие и пройдёт проверку мандата',
                       )
               }
            >
               <Button
                  hint={t('Закрыть окно, ничего не меняя')}
                  variant='text'
                  onClick={onClose}
               >
                  {t('Отмена')}
               </Button>
               <Button
                  hint={
                     deal
                        ? t(
                             'Сохранить данные стартапа: карточка покажет их сразу',
                          )
                        : t('Создать сделку с этими данными')
                  }
                  loading={saving.pending}
                  type='submit'
               >
                  {deal ? t('Сохранить') : t('Создать сделку')}
               </Button>
            </ModalFooter>
         </form>
         <ConfirmDialog
            confirmLabel={t('Убрать')}
            open={removing !== null}
            subtitle={removing?.email}
            success={t('Убран из списка: доступ закроется после сохранения')}
            title={t('Убрать {{name}} из кабинета?', {
               name: removing?.name ?? '',
            })}
            onClose={() => setRemoving(null)}
            onConfirm={() =>
               setTeam((prev) =>
                  prev.filter(({ key }) => key !== removing?.key),
               )
            }
         >
            <p>
               {t(
                  'После сохранения человек больше не сможет войти в кабинет. Данные компании останутся.',
               )}
            </p>
         </ConfirmDialog>
      </>
   );
};

/* «Данные стартапа», as the prototype has it: every field of the company and
   its deal on four tabs — the main ones with the logo, the legal details and
   contacts, the deal, and the cabinet's team with the capital. A new deal is
   made from the same form. The change goes to the deal's history. */
const NewDealDialog = ({
   open,
   deal,
   onClose,
   onCreated,
}: NewDealDialogProps) => {
   const { t } = useTranslation('deals');

   return (
      <Modal
         open={open}
         size='lg'
         subtitle={deal?.number}
         title={
            deal
               ? t('Данные стартапа: {{name}}', { name: deal.company })
               : t('Новая сделка')
         }
         onClose={onClose}
      >
         {open && (
            <NewDealForm deal={deal} onClose={onClose} onCreated={onCreated} />
         )}
      </Modal>
   );
};

export default NewDealDialog;

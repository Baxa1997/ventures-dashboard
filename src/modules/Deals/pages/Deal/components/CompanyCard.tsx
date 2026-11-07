import { FIELD_FACTS } from '@modules/Deals/constants';
import { applicationText, countryText, factRows } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { EMAIL } from '@modules/Deals/validations';
import { listOf, nameOf } from '@modules/Settings/services';
import { Card, FactList, InlineField } from '@shared/components';
import { formatNumericDate } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { Deal, Fact, NewDealInput } from '@shared/types/deals.types';
import { useTranslation } from 'react-i18next';

interface CompanyCardProps {
   deal: Deal;
   editable: boolean; // the deal is open: every row is changed where it stands
   onEdit: () => void; // opens «Данные стартапа» with everything
}

type TextKey = Extract<
   keyof NewDealInput,
   | 'legalName'
   | 'tin'
   | 'legalAddress'
   | 'city'
   | 'website'
   | 'applicantEmail'
   | 'applicantPhone'
>;

/* «О компании»: what the company does and the application's rows. While the
   deal is open each row is changed where it stands, saved as it is left and
   written to the deal's history; «Все данные» opens «Данные стартапа» for the
   logo, the team and the capital. */
const CompanyCard = ({ deal, editable, onEdit }: CompanyCardProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   const save = (patch: Partial<NewDealInput>) =>
      deals.updateDetails(deal.id, patch, user.id);

   const text = (
      key: TextKey,
      label: string,
      extra: Partial<Parameters<typeof InlineField>[0]> = {},
   ) => ({
      label,
      value: (
         <InlineField
            disabled={!editable}
            label={label}
            value={deal[key] ?? ''}
            onSave={(next) => save({ [key]: next })}
            {...extra}
         />
      ),
   });

   const countries = listOf('countries').map((item) => ({
      value: item.key,
      label: nameOf(item),
   }));

   // the application's other rows: their names stay, their values change
   const facts = deal.facts ?? [];
   const extraFacts = facts
      .map((fact, index) => ({ fact, index }))
      .filter(({ fact: [label] }) => !FIELD_FACTS.includes(label));
   const setFact = (index: number, value: string) =>
      deals.updateDetails(
         deal.id,
         {},
         user.id,
         facts.map(
            (fact, i): Fact =>
               i === index
                  ? fact[2]
                     ? [fact[0], value, fact[2]]
                     : [fact[0], value]
                  : fact,
         ),
      );

   const rows = editable
      ? [
           text('legalName', t('Юр. лицо')),
           text('tin', t('ИНН'), { maxLength: 20, inputMode: 'numeric' }),
           {
              label: t('Дата регистрации'),
              value: (
                 <InlineField
                    kind='date'
                    label={t('Дата регистрации')}
                    value={deal.registeredAt}
                    onSave={(next) => save({ registeredAt: next })}
                 />
              ),
           },
           text('legalAddress', t('Юридический адрес'), { maxLength: 600 }),
           {
              label: t('Год основания'),
              value: (
                 <InlineField
                    inputMode='numeric'
                    label={t('Год основания')}
                    maxLength={4}
                    validate={(next) =>
                       !next ||
                       (/^\d{4}$/.test(next) &&
                          Number(next) <= new Date().getFullYear())
                          ? undefined
                          : t('Укажите год из четырёх цифр', {
                               ns: 'validation',
                            })
                    }
                    value={deal.foundedYear ? String(deal.foundedYear) : ''}
                    onSave={(next) =>
                       save({ foundedYear: next ? Number(next) : null })
                    }
                 />
              ),
           },
           {
              label: t('Сотрудников'),
              value: (
                 <InlineField
                    inputMode='numeric'
                    label={t('Сотрудников')}
                    maxLength={7}
                    validate={(next) =>
                       /^\d{0,7}$/.test(next)
                          ? undefined
                          : t('Укажите целое число', { ns: 'validation' })
                    }
                    value={deal.employees != null ? String(deal.employees) : ''}
                    onSave={(next) =>
                       save({ employees: next ? Number(next) : null })
                    }
                 />
              ),
           },
           text('city', t('Город')),
           {
              label: t('Страна'),
              value: (
                 <InlineField
                    kind='select'
                    label={t('Страна')}
                    options={countries}
                    placeholder={countryText(deal) || '—'}
                    value={deal.country}
                    onSave={(next) => save({ country: next })}
                 />
              ),
           },
           text('website', t('Сайт'), { kind: 'url', placeholder: 'https://' }),
           text('applicantEmail', t('Почта'), {
              kind: 'email',
              validate: (next) =>
                 !next || EMAIL.test(next)
                    ? undefined
                    : t('Введите корректный адрес почты', { ns: 'validation' }),
           }),
           text('applicantPhone', t('Телефон'), { kind: 'tel', maxLength: 30 }),
           {
              label: t('Заявка подана'),
              value: formatNumericDate(deal.receivedAt.slice(0, 10)),
           },
           ...extraFacts.map(({ fact: [label, value, note], index }) => ({
              label: applicationText(t, label),
              note,
              value: (
                 <InlineField
                    label={applicationText(t, label)}
                    value={value}
                    onSave={(next) => setFact(index, next)}
                 />
              ),
           })),
        ]
      : [
           { label: t('Юр. лицо'), value: deal.legalName || '—' },
           { label: t('ИНН'), value: deal.tin || '—' },
           {
              label: t('Дата регистрации'),
              value:
                 deal.registeredAt && formatNumericDate(deal.registeredAt),
           },
           { label: t('Юридический адрес'), value: deal.legalAddress },
           {
              label: t('Год основания'),
              value: String(deal.foundedYear ?? '—'),
           },
           { label: t('Сотрудников'), value: String(deal.employees ?? '—') },
           {
              label: t('Регион'),
              value:
                 [deal.city, countryText(deal)].filter(Boolean).join(', ') ||
                 '—',
           },
           { label: t('Сайт'), value: deal.website || '—' },
           {
              label: t('Контакты'),
              value:
                 [deal.applicantEmail, deal.applicantPhone]
                    .filter(Boolean)
                    .join(' · ') || '—',
           },
           {
              label: t('Заявка подана'),
              value: formatNumericDate(deal.receivedAt.slice(0, 10)),
           },
           ...factRows(
              t,
              facts.filter(([label]) => !FIELD_FACTS.includes(label)),
           ),
        ].filter(({ value }) => value);

   return (
      <Card
         action={
            editable && (
               <button
                  type='button'
                  className='link'
                  data-hint={t(
                     'Открыть «Данные стартапа»: логотип, команда, капитал и все поля',
                  )}
                  onClick={onEdit}
               >
                  {t('Все данные')}
               </button>
            )
         }
         title={t('О компании')}
      >
         {editable ? (
            <div className='border-line border-b px-4.5 py-3'>
               <InlineField
                  className='max-w-[72ch]'
                  kind='multiline'
                  label={t('Чем занимается компания')}
                  maxLength={600}
                  placeholder={t('Чем занимается компания')}
                  value={deal.about}
                  onSave={(next) => save({ about: next })}
               />
            </div>
         ) : (
            deal.about && (
               <div className='border-line border-b px-4.5 py-3.5'>
                  <p className='max-w-[72ch]'>{deal.about}</p>
               </div>
            )
         )}
         <div className='text-meta px-4.5 py-3'>
            <FactList labelWidth='10.5rem' rows={rows} />
         </div>
         {editable && (
            <p className='text-ink-soft border-line border-t px-4.5 py-2.5 text-xs'>
               {t(
                  'Нажмите на значение, чтобы изменить его: оно сохранится, когда вы выйдете из поля, и попадёт в историю сделки.',
               )}
            </p>
         )}
      </Card>
   );
};

export default CompanyCard;

import {
   Button,
   Field,
   MODAL_FORM,
   Modal,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { listName, listOf, nameOf } from '@modules/Settings/services';
import { useAction, useCurrentUser } from '@shared/hooks';
import type { Deal, Fact } from '@shared/types/deals.types';
import type { ListKind } from '@shared/types/settings.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COMPANY_MAX, FIELD_FACTS, TEXT_MAX } from '../constants';
import { applicationText } from '../helpers';
import deals from '../services';
import { hasCompanyFields } from '../services/ucode';
import { fieldErrors, newDealSchema, type ValidationKey } from '../validations';

interface NewDealDialogProps {
   open: boolean;
   deal?: Deal; // given: its details are changed instead of a deal added
   onClose: () => void;
   onCreated?: (deal: Deal) => void;
}

type TextKey =
   | 'company'
   | 'about'
   | 'industry'
   | 'amount'
   | 'legalName'
   | 'tin'
   | 'foundedYear'
   | 'employees'
   | 'website'
   | 'applicantEmail'
   | 'applicantPhone';
type ListKey = 'industryKey' | 'source' | 'roundStage' | 'country';

const INITIAL = {
   company: '',
   about: '',
   industry: '',
   amount: '',
   legalName: '',
   tin: '',
   foundedYear: '',
   employees: '',
   website: '',
   applicantEmail: '',
   applicantPhone: '',
};

// The list's row with this key if the list has it in use, else its first row.
const preferred = (kind: ListKind, key: string) => {
   const items = listOf(kind);
   return (items.find((item) => item.key === key) ?? items[0])?.key ?? '';
};

const NewDealForm = ({
   deal,
   onClose,
   onCreated,
}: Omit<NewDealDialogProps, 'open'>) => {
   const { t } = useTranslation('deals');
   const { t: tValidation } = useTranslation('validation');
   const user = useCurrentUser();
   const [values, setValues] = useState(() =>
      deal
         ? {
              company: deal.company,
              about: deal.about,
              industry: deal.industry,
              amount: deal.amount ? String(deal.amount) : '',
              legalName: deal.legalName,
              tin: deal.tin,
              foundedYear: deal.foundedYear ? String(deal.foundedYear) : '',
              employees: deal.employees ? String(deal.employees) : '',
              website: deal.website,
              applicantEmail: deal.applicantEmail ?? '',
              applicantPhone: deal.applicantPhone ?? '',
           }
         : INITIAL,
   );
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
   // the application's other rows, as the card shows them: the contact, the
   // website, where they heard of the fund, the documents
   const [facts, setFacts] = useState<Fact[]>(() => deal?.facts ?? []);
   const [errors, setErrors] = useState<
      Partial<Record<TextKey | 'industryKey', ValidationKey>>
   >({});

   const setValue = (key: TextKey, value: string) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
   };

   const errorOf = (key: TextKey | 'industryKey') => {
      const message = errors[key];
      return message && tValidation(message);
   };

   // closes the form once ucode has the deal
   const saving = useAction(
      async (input: Parameters<typeof deals.createDeal>[0]) => {
         if (deal) {
            await deals.updateDetails(
               deal.id,
               input,
               user.id,
               deal.facts && facts,
            );
            onClose();
            return;
         }
         const created = await deals.createDeal(input, user.id);
         onClose();
         onCreated?.(created);
      },
      deal
         ? {}
         : {
              kind: 'create',
              success: t('Сделка добавлена во входящие'),
              error: t('Не удалось добавить сделку'),
           },
   );

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const result = newDealSchema.safeParse(values);
      const sectorMissing = !choices.industryKey;
      if (!result.success || sectorMissing) {
         setErrors({
            ...(result.success ? {} : fieldErrors(result.error)),
            ...(sectorMissing && { industryKey: 'Обязательное поле' }),
         });
         return;
      }
      saving.run({
         ...result.data,
         ...choices,
         foundedYear: Number(result.data.foundedYear) || null,
         employees: Number(result.data.employees) || null,
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

   const input = (key: TextKey, extra?: { inputMode: 'numeric' }) => (
      <input
         aria-invalid={!!errors[key]}
         className='field-input'
         maxLength={COMPANY_MAX}
         value={values[key]}
         onChange={(event) => setValue(key, event.target.value)}
         {...extra}
      />
   );

   return (
      <form noValidate className={MODAL_FORM} onSubmit={handleSubmit}>
         <ModalBody>
            <div className='grid gap-4 sm:grid-cols-2'>
               <Field
                  className='sm:col-span-2'
                  error={errorOf('company')}
                  label={t('Компания')}
               >
                  <input
                     data-autofocus
                     aria-invalid={!!errors.company}
                     className='field-input'
                     maxLength={COMPANY_MAX}
                     value={values.company}
                     onChange={(event) =>
                        setValue('company', event.target.value)
                     }
                  />
               </Field>
               <Field
                  className='sm:col-span-2'
                  error={errorOf('about')}
                  label={t('Чем занимается')}
               >
                  <textarea
                     aria-invalid={!!errors.about}
                     className='field-input'
                     maxLength={TEXT_MAX}
                     rows={2}
                     value={values.about}
                     onChange={(event) => setValue('about', event.target.value)}
                  />
               </Field>
               <Field error={errorOf('industryKey')} label={t('Отрасль')}>
                  {select('industryKey', 'industries', t('Выберите отрасль'))}
               </Field>
               <Field
                  error={errorOf('industry')}
                  hint={t('Например, «Цифровые чеки»')}
                  label={t('Ниша')}
               >
                  {input('industry')}
               </Field>
               <Field label={t('Источник')}>
                  {select('source', 'sources')}
               </Field>
               <Field error={errorOf('amount')} label={t('Запрос, $')}>
                  {input('amount', { inputMode: 'numeric' })}
               </Field>
               <Field label={t('Стадия раунда')}>
                  {select('roundStage', 'rounds')}
               </Field>
               <Field label={t('Страна')}>
                  {select('country', 'countries')}
               </Field>
               <Field error={errorOf('legalName')} label={t('Юр. лицо')}>
                  {input('legalName')}
               </Field>
               <Field error={errorOf('tin')} label={t('ИНН')}>
                  {input('tin', { inputMode: 'numeric' })}
               </Field>
               <Field error={errorOf('foundedYear')} label={t('Год основания')}>
                  {input('foundedYear', { inputMode: 'numeric' })}
               </Field>
               <Field error={errorOf('employees')} label={t('Сотрудников')}>
                  {input('employees', { inputMode: 'numeric' })}
               </Field>
               <Field
                  className='sm:col-span-2'
                  error={errorOf('website')}
                  label={t('Сайт')}
               >
                  {input('website')}
               </Field>
               <Field
                  error={errorOf('applicantEmail')}
                  label={t('Эл. почта')}
               >
                  {input('applicantEmail')}
               </Field>
               <Field error={errorOf('applicantPhone')} label={t('Телефон')}>
                  {input('applicantPhone')}
               </Field>
               {!hasCompanyFields() && (
                  <p className='text-ink-soft text-xs sm:col-span-2'>
                     {t(
                        'Юр. лицо, ИНН, год основания и число сотрудников сохранятся, когда в ucode будет партия 17.',
                     )}
                  </p>
               )}
               {facts.map(
                  ([label, value], index) =>
                     !FIELD_FACTS.includes(label) && (
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
                     ),
               )}
            </div>
         </ModalBody>
         <ModalFooter
            note={
               deal
                  ? t('Изменение попадёт в историю сделки')
                  : t('Заявка попадёт во входящие и пройдёт проверку мандата')
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
                     ? t('Сохранить изменения в сделке')
                     : t('Добавить заявку во входящие')
               }
               loading={saving.pending}
               type='submit'
            >
               {deal ? t('Сохранить') : t('Добавить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

/* An application that did not come through the website is entered by hand;
   with a deal, its details are changed (the company, the request, the lists
   and the application's other rows: contact, website, documents), and the
   change goes to its history. */
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
         subtitle={deal?.number}
         title={deal ? t('Данные сделки') : t('Новая сделка')}
         onClose={onClose}
      >
         {open && (
            <NewDealForm deal={deal} onClose={onClose} onCreated={onCreated} />
         )}
      </Modal>
   );
};

export default NewDealDialog;

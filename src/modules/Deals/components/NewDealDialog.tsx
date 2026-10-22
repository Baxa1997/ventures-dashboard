import {
   Button,
   Field,
   MODAL_FORM,
   Modal,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { listOf, nameOf } from '@modules/Settings/services';
import { useCurrentUser } from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import type { ListKind } from '@shared/types/settings.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COMPANY_MAX, TEXT_MAX } from '../constants';
import deals from '../services';
import { fieldErrors, newDealSchema, type ValidationKey } from '../validations';

interface NewDealDialogProps {
   open: boolean;
   onClose: () => void;
   onCreated: (deal: Deal) => void;
}

type TextKey = 'company' | 'about' | 'industry' | 'amount';
type ListKey = 'industryKey' | 'source' | 'roundStage' | 'country';

const INITIAL = { company: '', about: '', industry: '', amount: '' };

// The list's row with this key if the list has it in use, else its first row.
const preferred = (kind: ListKind, key: string) => {
   const items = listOf(kind);
   return (items.find((item) => item.key === key) ?? items[0])?.key ?? '';
};

const NewDealForm = ({
   onClose,
   onCreated,
}: Omit<NewDealDialogProps, 'open'>) => {
   const { t } = useTranslation('deals');
   const { t: tValidation } = useTranslation('validation');
   const user = useCurrentUser();
   const [values, setValues] = useState(INITIAL);
   // the lists of Настройки; an application typed in by hand rarely comes
   // from the website's channels, so the source starts at the fund's network
   const [choices, setChoices] = useState<Record<ListKey, string>>(() => ({
      industryKey: '',
      source: preferred('sources', 'network'),
      roundStage: preferred('rounds', 'seed'),
      country: preferred('countries', 'UZ'),
   }));
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
      const deal = await deals.createDeal(
         { ...result.data, ...choices },
         user.id,
      );
      onClose();
      onCreated(deal);
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
            </div>
         </ModalBody>
         <ModalFooter
            note={t('Заявка попадёт во входящие и пройдёт проверку мандата')}
         >
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button type='submit'>{t('Добавить')}</Button>
         </ModalFooter>
      </form>
   );
};

// An application that did not come through the website is entered by hand.
const NewDealDialog = ({ open, onClose, onCreated }: NewDealDialogProps) => {
   const { t } = useTranslation('deals');

   return (
      <Modal open={open} title={t('Новая сделка')} onClose={onClose}>
         {open && <NewDealForm onClose={onClose} onCreated={onCreated} />}
      </Modal>
   );
};

export default NewDealDialog;

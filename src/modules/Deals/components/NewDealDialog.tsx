import {
   Button,
   Field,
   MODAL_FORM,
   Modal,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type { Deal, DealSource, RoundStage } from '@shared/types/deals.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
   COMPANY_MAX,
   ROUND_STAGE_NAMES,
   ROUND_STAGE_ORDER,
   SOURCE_LABELS,
   SOURCE_ORDER,
   TEXT_MAX,
} from '../constants';
import deals from '../services';
import { fieldErrors, newDealSchema, type ValidationKey } from '../validations';

interface NewDealDialogProps {
   open: boolean;
   onClose: () => void;
   onCreated: (deal: Deal) => void;
}

type TextKey = 'company' | 'about' | 'industry' | 'country' | 'amount';

const INITIAL = {
   company: '',
   about: '',
   industry: '',
   country: 'Узбекистан',
   amount: '',
};

const NewDealForm = ({
   onClose,
   onCreated,
}: Omit<NewDealDialogProps, 'open'>) => {
   const { t } = useTranslation('deals');
   const { t: tValidation } = useTranslation('validation');
   const user = useCurrentUser();
   const [values, setValues] = useState(INITIAL);
   // an application typed in by hand rarely comes from the website
   const [source, setSource] = useState<DealSource>('network');
   const [roundStage, setRoundStage] = useState<RoundStage>('seed');
   const [errors, setErrors] = useState<
      Partial<Record<TextKey, ValidationKey>>
   >({});

   const setValue = (key: TextKey, value: string) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
   };

   const errorOf = (key: TextKey) => {
      const message = errors[key];
      return message && tValidation(message);
   };

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const result = newDealSchema.safeParse(values);
      if (!result.success) {
         setErrors(fieldErrors(result.error));
         return;
      }
      const deal = await deals.createDeal(
         { ...result.data, source, roundStage },
         user.id,
      );
      onClose();
      onCreated(deal);
   };

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
               <Field error={errorOf('industry')} label={t('Отрасль')}>
                  {input('industry')}
               </Field>
               <Field label={t('Источник')}>
                  <select
                     className='field-input'
                     value={source}
                     onChange={(event) =>
                        setSource(event.target.value as DealSource)
                     }
                  >
                     {SOURCE_ORDER.map((value) => (
                        <option key={value} value={value}>
                           {t(SOURCE_LABELS[value])}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field error={errorOf('amount')} label={t('Запрос, $')}>
                  {input('amount', { inputMode: 'numeric' })}
               </Field>
               <Field label={t('Стадия раунда')}>
                  <select
                     className='field-input'
                     value={roundStage}
                     onChange={(event) =>
                        setRoundStage(event.target.value as RoundStage)
                     }
                  >
                     {ROUND_STAGE_ORDER.map((value) => (
                        <option key={value} value={value}>
                           {ROUND_STAGE_NAMES[value]}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field
                  className='sm:col-span-2'
                  error={errorOf('country')}
                  label={t('География')}
               >
                  {input('country')}
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

import { INSTRUMENT_LABELS } from '@modules/Portfolio/constants';
import { Field } from '@shared/components';
import { todayISO } from '@shared/helpers';
import type { Instrument } from '@shared/types/portfolio.types';
import { useTranslation } from 'react-i18next';
import type { InvestmentDraft, InvestmentErrors } from '../helpers/investment';

interface InvestmentFieldsProps {
   value: InvestmentDraft;
   errors: InvestmentErrors;
   stakeHint?: string; // what the stake means here, «можно указать позже» unless given
   onChange: (value: InvestmentDraft) => void;
}

const INSTRUMENTS = Object.keys(INSTRUMENT_LABELS) as Instrument[];

/* What the fund paid when a closed deal joins the portfolio: the company's
   first investment in Портфель, or a follow-on. The stake and the valuation may
   come later, on the company's card. */
const InvestmentFields = ({
   value,
   errors,
   stakeHint,
   onChange,
}: InvestmentFieldsProps) => {
   const { t } = useTranslation('deals');
   const set = (patch: Partial<InvestmentDraft>) =>
      onChange({ ...value, ...patch });

   return (
      <div className='grid gap-4 sm:grid-cols-2'>
         <Field label={t('Инструмент')}>
            <select
               className='field-input'
               value={value.instrument}
               onChange={(event) =>
                  set({ instrument: event.target.value as Instrument })
               }
            >
               {INSTRUMENTS.map((key) => (
                  <option key={key} value={key}>
                     {t(INSTRUMENT_LABELS[key])}
                  </option>
               ))}
            </select>
         </Field>
         <Field error={errors.amount} label={t('Сумма, $')}>
            <input
               aria-invalid={!!errors.amount}
               className='field-input'
               inputMode='numeric'
               value={value.amount}
               onChange={(event) => set({ amount: event.target.value })}
            />
         </Field>
         <Field error={errors.date} label={t('Дата платежа')}>
            <input
               aria-invalid={!!errors.date}
               className='field-input'
               max={todayISO()}
               type='date'
               value={value.date}
               onChange={(event) => set({ date: event.target.value })}
            />
         </Field>
         <Field
            error={errors.stakePct}
            hint={stakeHint ?? t('можно указать позже')}
            label={t('Доля фонда, %')}
         >
            <input
               aria-invalid={!!errors.stakePct}
               className='field-input'
               inputMode='decimal'
               value={value.stakePct}
               onChange={(event) => set({ stakePct: event.target.value })}
            />
         </Field>
         <Field
            className='sm:col-span-2'
            error={errors.valuation}
            hint={t('можно указать позже')}
            label={t('Оценка post-money, $')}
         >
            <input
               aria-invalid={!!errors.valuation}
               className='field-input'
               inputMode='numeric'
               value={value.valuation}
               onChange={(event) => set({ valuation: event.target.value })}
            />
         </Field>
      </div>
   );
};

export default InvestmentFields;

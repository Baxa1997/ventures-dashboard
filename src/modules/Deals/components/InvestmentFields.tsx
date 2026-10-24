import { INSTRUMENT_LABELS } from '@modules/Portfolio/constants';
import { Field } from '@shared/components';
import { todayISO } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import type { Instrument, Investment } from '@shared/types/portfolio.types';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

// The fund's first investment as typed in, before it is checked.
export interface InvestmentDraft {
   instrument: Instrument;
   amount: string;
   date: string;
   stakePct: string;
   valuation: string;
}

export type InvestmentErrors = Partial<
   Record<'amount' | 'date' | 'stakePct' | 'valuation', string>
>;

const INSTRUMENTS = Object.keys(INSTRUMENT_LABELS) as Instrument[];

// The deal's request, paid today as a SAFE, until the owner says otherwise.
export const investmentDraft = (deal: Deal): InvestmentDraft => ({
   instrument: 'safe',
   amount: deal.amount ? String(deal.amount) : '',
   date: todayISO(),
   stakePct: '',
   valuation: '',
});

const toNumber = (text: string) =>
   Number(text.replace(/\s/g, '').replace(',', '.'));

// The investment the draft holds, or what is wrong with it.
export const readInvestment = (
   t: TFunction<'deals'>,
   draft: InvestmentDraft,
): { investment: Investment } | { errors: InvestmentErrors } => {
   const errors: InvestmentErrors = {};
   const amount = toNumber(draft.amount);
   if (!amount || amount <= 0) errors.amount = t('Укажите сумму в долларах');
   if (!draft.date) errors.date = t('Укажите дату платежа');
   else if (draft.date > todayISO())
      errors.date = t('Платёж не может быть позже сегодняшнего дня');
   const stakePct = draft.stakePct.trim() ? toNumber(draft.stakePct) : null;
   if (stakePct !== null && !(stakePct > 0 && stakePct <= 100))
      errors.stakePct = t('Доля — число от 0 до 100');
   const valuation = draft.valuation.trim() ? toNumber(draft.valuation) : null;
   if (valuation !== null && !(valuation > 0))
      errors.valuation = t('Укажите оценку в долларах');
   if (Object.keys(errors).length) return { errors };
   return {
      investment: {
         instrument: draft.instrument,
         amount,
         date: draft.date,
         stakePct,
         valuation,
      },
   };
};

interface InvestmentFieldsProps {
   value: InvestmentDraft;
   errors: InvestmentErrors;
   onChange: (value: InvestmentDraft) => void;
}

/* What the fund paid when a closed deal joins the portfolio: the company's
   first investment in Портфель. The stake and the valuation may come later. */
const InvestmentFields = ({
   value,
   errors,
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
            hint={t('можно указать позже')}
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

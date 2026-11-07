import { termsRows } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { INSTRUMENT_LABELS } from '@modules/Portfolio/constants';
import { Card, FactList, InlineField } from '@shared/components';
import { formatUsd, parseAmount } from '@shared/helpers';
import type { Deal, DealTerms } from '@shared/types/deals.types';
import type { Instrument } from '@shared/types/portfolio.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface TermsCardProps {
   deal: Deal;
   editable: boolean;
}

const INSTRUMENTS = Object.keys(INSTRUMENT_LABELS) as Instrument[];

const NO_TERMS: DealTerms = {
   instrument: '',
   roundSize: null,
   preMoney: null,
   conditions: '',
   valuation: '',
   structure: '',
   founder: '',
   warning: '',
};

type TextTerm = 'conditions' | 'valuation' | 'structure' | 'founder';

/* «Условия сделки»: the instrument, the round and the valuation the owner
   writes once DD has shaped them. They go into the committee's materials and
   into the question the meeting votes on. While the deal is open each term
   is changed where it stands and saved as it is left. */
const TermsCard = ({ deal, editable }: TermsCardProps) => {
   const { t, i18n } = useTranslation('deals');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const terms = deal.terms ?? NO_TERMS;
   const warning = deal.terms?.warning;

   const set = (patch: Partial<DealTerms>) =>
      deals.setTerms(deal.id, { ...terms, ...patch });
   const amountCheck = (text: string) =>
      !text || parseAmount(text) > 0
         ? undefined
         : t('Укажите сумму в долларах');
   const usd = (value: string) =>
      Number(value) ? formatUsd(Number(value), language) : value;

   const share =
      terms.roundSize && deal.amount
         ? Math.round((deal.amount / terms.roundSize) * 100)
         : null;
   const post =
      terms.preMoney && terms.roundSize ? terms.preMoney + terms.roundSize : 0;

   const text = (key: TextTerm, label: string, placeholder: string) => ({
      label,
      value: (
         <InlineField
            label={label}
            placeholder={placeholder}
            value={terms[key]}
            onSave={(next) => set({ [key]: next })}
         />
      ),
   });

   const rows = [
      {
         label: t('Инструмент'),
         value: (
            <InlineField
               kind='select'
               label={t('Инструмент')}
               options={[
                  { value: '', label: t('не выбран') },
                  ...INSTRUMENTS.map((key) => ({
                     value: key,
                     label: t(INSTRUMENT_LABELS[key]),
                  })),
               ]}
               value={terms.instrument}
               onSave={(next) => set({ instrument: next as Instrument | '' })}
            />
         ),
      },
      {
         label: t('Размер раунда, $'),
         note: [
            t('чек фонда {{amount}}', {
               amount: formatUsd(deal.amount, language),
            }),
            share !== null && t('{{pct}}% раунда', { pct: share }),
         ]
            .filter(Boolean)
            .join(' · '),
         value: (
            <InlineField
               format={usd}
               inputMode='numeric'
               label={t('Размер раунда, $')}
               placeholder={t('весь раунд')}
               validate={amountCheck}
               value={terms.roundSize ? String(terms.roundSize) : ''}
               onSave={(next) =>
                  set({ roundSize: next ? parseAmount(next) : null })
               }
            />
         ),
      },
      {
         label: t('Оценка pre-money, $'),
         note:
            post > 0
               ? t('доля фонда ≈ {{pct}}% post-money', {
                    pct: new Intl.NumberFormat(language, {
                       maximumFractionDigits: 1,
                    }).format((deal.amount / post) * 100),
                 })
               : undefined,
         value: (
            <InlineField
               format={usd}
               inputMode='numeric'
               label={t('Оценка pre-money, $')}
               placeholder={t('можно указать позже')}
               validate={amountCheck}
               value={terms.preMoney ? String(terms.preMoney) : ''}
               onSave={(next) =>
                  set({ preMoney: next ? parseAmount(next) : null })
               }
            />
         ),
      },
      text(
         'conditions',
         t('Условия инструмента'),
         t('cap, дисконт, срок — как в term sheet'),
      ),
      text('valuation', t('Оценка по DD'), t('диапазон и на чём он основан')),
      text('structure', t('Структура'), t('холдинг, операционные компании')),
      text('founder', t('Основатель'), t('имя, роль и доля')),
      {
         label: t('Исключение из мандата'),
         value: (
            <InlineField
               className={clsx(
                  terms.warning && 'bg-warning-tint text-warning-ink',
               )}
               kind='multiline'
               label={t('Исключение из мандата')}
               maxLength={600}
               placeholder={t('только если сделка вне мандата')}
               value={terms.warning}
               onSave={(next) => set({ warning: next })}
            />
         ),
      },
   ];

   return (
      <Card title={t('Условия сделки')}>
         {editable ? (
            <div className='px-5 pt-1 pb-1'>
               {!deal.terms && (
                  <p className='text-ink-soft text-meta pt-3'>
                     {t(
                        'Инструмент, раунд и оценка ещё не внесены. Они уходят в материалы ИК и в вопрос, по которому голосует заседание.',
                     )}
                  </p>
               )}
               <FactList divided labelWidth='27%' rows={rows} />
            </div>
         ) : deal.terms ? (
            <div className={clsx('px-5 pt-1', warning ? 'pb-5' : 'pb-1')}>
               <FactList
                  divided
                  labelWidth='27%'
                  rows={termsRows(t, deal, language)}
               />
               {warning && (
                  <p className='bg-warning-tint text-warning-ink text-meta rounded-lg px-4 py-3'>
                     {warning}
                  </p>
               )}
            </div>
         ) : (
            <p className='text-ink-soft text-meta px-5 py-4'>
               {t('Условия не вносились.')}
            </p>
         )}
      </Card>
   );
};

export default TermsCard;

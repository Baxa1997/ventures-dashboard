import { termsRows } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { INSTRUMENT_LABELS } from '@modules/Portfolio/constants';
import {
   Button,
   Card,
   FactList,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import type { Deal, DealTerms } from '@shared/types/deals.types';
import type { Instrument } from '@shared/types/portfolio.types';
import clsx from 'clsx';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRequest } from '@shared/hooks';

interface TermsCardProps {
   deal: Deal;
   editable: boolean;
}

const INSTRUMENTS = Object.keys(INSTRUMENT_LABELS) as Instrument[];

/* «Условия сделки»: the instrument, the round and the valuation the owner
   writes once DD has shaped them. They go into the committee's materials and
   into the question the meeting votes on. */
const TermsCard = ({ deal, editable }: TermsCardProps) => {
   const { t, i18n } = useTranslation('deals');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const [editing, setEditing] = useState(false);
   const warning = deal.terms?.warning;

   return (
      <Card
         action={
            editable &&
            deal.terms && (
               <button
                  type='button'
                  className='link'
                  data-hint={t('Изменить инструмент, раунд и оценку')}
                  onClick={() => setEditing(true)}
               >
                  {t('Изменить')}
               </button>
            )
         }
         title={t('Условия сделки')}
      >
         {deal.terms ? (
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
            <div className='px-5 py-4'>
               <p className='text-ink-soft text-meta'>
                  {t(
                     'Инструмент, раунд и оценка ещё не внесены. Они уходят в материалы ИК и в вопрос, по которому голосует заседание.',
                  )}
               </p>
               {editable && (
                  <Button
                     className='mt-3'
                     hint={t('Внести инструмент, раунд и оценку')}
                     variant='ghost'
                     onClick={() => setEditing(true)}
                  >
                     {t('Внести условия')}
                  </Button>
               )}
            </div>
         )}
         <Modal
            open={editing}
            subtitle={deal.company}
            title={t('Условия сделки')}
            onClose={() => setEditing(false)}
         >
            {editing && (
               <TermsForm deal={deal} onClose={() => setEditing(false)} />
            )}
         </Modal>
      </Card>
   );
};

type Draft = Record<
   | 'roundSize'
   | 'preMoney'
   | 'conditions'
   | 'valuation'
   | 'structure'
   | 'founder'
   | 'warning',
   string
> & { instrument: Instrument | '' };

type Errors = Partial<Record<'roundSize' | 'preMoney', string>>;

const toNumber = (text: string) =>
   Number(text.replace(/\s/g, '').replace(',', '.'));

const TermsForm = ({ deal, onClose }: { deal: Deal; onClose: () => void }) => {
   const { t } = useTranslation('deals');
   const terms = deal.terms;
   const [draft, setDraft] = useState<Draft>({
      instrument: terms?.instrument ?? '',
      roundSize: terms?.roundSize ? String(terms.roundSize) : '',
      preMoney: terms?.preMoney ? String(terms.preMoney) : '',
      conditions: terms?.conditions ?? '',
      valuation: terms?.valuation ?? '',
      structure: terms?.structure ?? '',
      founder: terms?.founder ?? '',
      warning: terms?.warning ?? '',
   });
   const [errors, setErrors] = useState<Errors>({});
   const saving = useRequest();

   const set = (patch: Partial<Draft>) => {
      setDraft((prev) => ({ ...prev, ...patch }));
      setErrors({});
   };

   const amountOf = (text: string) => {
      if (!text.trim()) return null;
      const value = toNumber(text);
      return value > 0 ? value : Number.NaN;
   };

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const roundSize = amountOf(draft.roundSize);
      const preMoney = amountOf(draft.preMoney);
      const found: Errors = {};
      if (Number.isNaN(roundSize))
         found.roundSize = t('Укажите сумму в долларах');
      if (Number.isNaN(preMoney))
         found.preMoney = t('Укажите сумму в долларах');
      if (Object.keys(found).length) {
         setErrors(found);
         return;
      }
      const next: DealTerms = {
         instrument: draft.instrument,
         roundSize,
         preMoney,
         conditions: draft.conditions.trim(),
         valuation: draft.valuation.trim(),
         structure: draft.structure.trim(),
         founder: draft.founder.trim(),
         warning: draft.warning.trim(),
      };
      if (
         await saving.run(async () => {
            await deals.setTerms(deal.id, next);
         })
      )
         onClose();
   };

   const text = (key: keyof Draft, label: string, hint?: string) => (
      <Field className='sm:col-span-2' hint={hint} label={label}>
         <input
            className='field-input'
            maxLength={200}
            value={draft[key]}
            onChange={(event) => set({ [key]: event.target.value })}
         />
      </Field>
   );

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4 sm:grid-cols-2'>
               <Field label={t('Инструмент')}>
                  <select
                     data-autofocus
                     className='field-input'
                     value={draft.instrument}
                     onChange={(event) =>
                        set({
                           instrument: event.target.value as Instrument | '',
                        })
                     }
                  >
                     <option value=''>{t('не выбран')}</option>
                     {INSTRUMENTS.map((key) => (
                        <option key={key} value={key}>
                           {t(INSTRUMENT_LABELS[key])}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field
                  error={errors.roundSize}
                  hint={t('чек фонда — сумма сделки')}
                  label={t('Размер раунда, $')}
               >
                  <input
                     aria-invalid={!!errors.roundSize}
                     className='field-input'
                     inputMode='numeric'
                     value={draft.roundSize}
                     onChange={(event) =>
                        set({ roundSize: event.target.value })
                     }
                  />
               </Field>
               <Field
                  error={errors.preMoney}
                  hint={t('можно указать позже')}
                  label={t('Оценка pre-money, $')}
               >
                  <input
                     aria-invalid={!!errors.preMoney}
                     className='field-input'
                     inputMode='numeric'
                     value={draft.preMoney}
                     onChange={(event) => set({ preMoney: event.target.value })}
                  />
               </Field>
               <div aria-hidden className='max-sm:hidden' />
               {text(
                  'conditions',
                  t('Условия инструмента'),
                  t('cap, дисконт, срок — как в term sheet'),
               )}
               {text(
                  'valuation',
                  t('Оценка по DD'),
                  t('диапазон и на чём он основан'),
               )}
               {text(
                  'structure',
                  t('Структура'),
                  t('холдинг, операционные компании'),
               )}
               {text('founder', t('Основатель'), t('имя, роль и доля'))}
               <Field
                  className='sm:col-span-2'
                  hint={t(
                     'Только если сделка вне мандата: почему фонд всё же её рассматривает. Без этого ИК не голосует.',
                  )}
                  label={t('Исключение из мандата')}
               >
                  <textarea
                     className='field-input field-sizing-content min-h-20 resize-none'
                     maxLength={600}
                     value={draft.warning}
                     onChange={(event) => set({ warning: event.target.value })}
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
               hint={t('Сохранить условия сделки')}
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

export default TermsCard;

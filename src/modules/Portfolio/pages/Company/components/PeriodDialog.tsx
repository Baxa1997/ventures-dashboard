import {
   formatMetric,
   metricName,
   metricUnit,
   monthLabel,
   monthsBetween,
   parseMetric,
   previousQuarter,
   quarterLabel,
   quarterOfDay,
   recentQuarters,
} from '@modules/Portfolio/helpers';
import portfolio from '@modules/Portfolio/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   Notice,
   Segmented,
} from '@shared/components';
import { todayISO } from '@shared/helpers';
import { useAction } from '@shared/hooks';
import type {
   Metric,
   MetricKey,
   PortfolioCompany,
} from '@shared/types/portfolio.types';
import dayjs from 'dayjs';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PeriodGrid } from './PeriodPicker';

export type PeriodKind = 'month' | 'quarter';

// What the window opens on: a kind of period, and the period when it is
// one already in the table (changing it); none, adding.
export interface PeriodTarget {
   kind: PeriodKind;
   at: string | null;
}

// How far back a period can be picked: five years.
const BACK: Record<PeriodKind, number> = { month: 60, quarter: 20 };

export const valuesOf = (metric: Metric, kind: PeriodKind) =>
   kind === 'quarter' ? metric.values : metric.months;

export const periodLabel = (
   t: Parameters<typeof quarterLabel>[0],
   kind: PeriodKind,
   at: string,
) => (kind === 'quarter' ? quarterLabel(t, at) : monthLabel(at, true));

// The months or quarters up to now, the newest first.
const choicesOf = (kind: PeriodKind) => {
   const today = todayISO();
   if (kind === 'quarter')
      return recentQuarters(quarterOfDay(today), BACK.quarter).reverse();
   const now = today.slice(0, 7);
   return monthsBetween(
      dayjs(`${now}-01`)
         .subtract(BACK.month - 1, 'month')
         .format('YYYY-MM'),
      now,
   ).reverse();
};

const hasFigures = (company: PortfolioCompany, kind: PeriodKind, at: string) =>
   company.metrics.some((metric) => valuesOf(metric, kind)[at] != null);

// A new period starts on the newest one without figures (this month or quarter
// when every earlier one has them).
const firstEmpty = (company: PortfolioCompany, kind: PeriodKind) => {
   const choices = choicesOf(kind);
   // from the month that has ended, or the quarter being reported
   return (
      choices.slice(1).find((at) => !hasFigures(company, kind, at)) ??
      choices[0]
   );
};

const previousOf = (kind: PeriodKind, at: string) =>
   kind === 'quarter'
      ? previousQuarter(at)
      : dayjs(`${at}-01`).subtract(1, 'month').format('YYYY-MM');

const textsOf = (company: PortfolioCompany, kind: PeriodKind, at: string) =>
   Object.fromEntries(
      company.metrics.map((metric) => {
         const value = valuesOf(metric, kind)[at];
         return [metric.key, value == null ? '' : String(value)];
      }),
   ) as Record<MetricKey, string>;

interface FormProps {
   company: PortfolioCompany;
   target: PeriodTarget;
   onSaved: (kind: PeriodKind, at: string) => void;
   onDelete: (kind: PeriodKind, at: string) => void;
   onClose: () => void;
}

const PeriodForm = ({
   company,
   target,
   onSaved,
   onDelete,
   onClose,
}: FormProps) => {
   const { t, i18n } = useTranslation('portfolio');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const editing = target.at !== null;
   const [kind, setKind] = useState<PeriodKind>(target.kind);
   const [at, setAt] = useState(target.at ?? firstEmpty(company, target.kind));
   const [texts, setTexts] = useState(() => textsOf(company, kind, at));
   const [tried, setTried] = useState(false);
   const stored = textsOf(company, kind, at);
   const filled = hasFigures(company, kind, at);
   const previous = previousOf(kind, at);

   // another period: its own figures, if it has any
   const choose = (nextKind: PeriodKind, nextAt: string) => {
      setKind(nextKind);
      setAt(nextAt);
      setTexts(textsOf(company, nextKind, nextAt));
      setTried(false);
   };

   const parsed = company.metrics.map((metric) => ({
      metric,
      value: parseMetric(texts[metric.key] ?? '', metric.format),
   }));
   const wrong = parsed.some(({ value }) => Number.isNaN(value));
   const changed = company.metrics.some(
      (metric) =>
         (texts[metric.key] ?? '').trim() !== (stored[metric.key] ?? ''),
   );
   const typed = parsed.some(({ value }) => value !== null);

   const saving = useAction(
      () =>
         portfolio.saveMetrics(company.id, {
            [at]: Object.fromEntries(
               parsed
                  .filter(
                     ({ metric }) =>
                        (texts[metric.key] ?? '').trim() !==
                        (stored[metric.key] ?? ''),
                  )
                  .map(({ metric, value }) => [metric.key, value]),
            ),
         } as Record<string, Record<MetricKey, number | null>>),
      {
         success: t('Показатели за {{period}} сохранены', {
            period: periodLabel(t, kind, at),
         }),
      },
   );

   const submit = async (event: FormEvent) => {
      event.preventDefault();
      setTried(true);
      if (wrong) return;
      if (!changed) {
         onClose();
         return;
      }
      if (await saving.run()) onSaved(kind, at);
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               {editing ? (
                  <p className='text-ink-soft'>
                     {t(
                        'Цифры компании {{company}} за {{period}}. Пустое поле — цифры нет.',
                        {
                           company: company.name,
                           period: periodLabel(t, kind, at),
                        },
                     )}
                  </p>
               ) : (
                  <div className='grid gap-4 sm:grid-cols-[auto_minmax(0,22rem)] sm:items-start'>
                     <Field label={t('Период')}>
                        <Segmented
                           items={[
                              { id: 'month', label: t('Месяц') },
                              { id: 'quarter', label: t('Квартал') },
                           ]}
                           label={t('Период')}
                           value={kind}
                           onChange={(next) =>
                              choose(next, firstEmpty(company, next))
                           }
                        />
                     </Field>
                     <Field
                        label={
                           kind === 'month'
                              ? t('Какой месяц')
                              : t('Какой квартал')
                        }
                     >
                        <PeriodGrid
                           key={kind}
                           kind={kind}
                           marked={(choice) =>
                              hasFigures(company, kind, choice)
                           }
                           max={choicesOf(kind)[0]}
                           min={choicesOf(kind).at(-1) ?? at}
                           value={at}
                           onChange={(choice) => choose(kind, choice)}
                        />
                     </Field>
                  </div>
               )}
               {!editing && filled && (
                  <Notice>
                     {t(
                        'За {{period}} цифры уже есть: они ниже, и здесь их можно изменить.',
                        {
                           period: periodLabel(t, kind, at),
                        },
                     )}
                  </Notice>
               )}
               {kind === 'quarter' && (
                  <p className='text-ink-faint text-meta'>
                     {t(
                        'Квартальные цифры обычно присылает компания из кабинета основателя; здесь их можно внести или поправить.',
                     )}
                  </p>
               )}
               {company.metrics.length ? (
                  <div className='border-line divide-line divide-y rounded-lg border'>
                     {company.metrics.map((metric) => {
                        const unit = metricUnit(t, metric);
                        const name = metricName(t, metric.key);
                        const value = parseMetric(
                           texts[metric.key] ?? '',
                           metric.format,
                        );
                        const before = valuesOf(metric, kind)[previous];
                        return (
                           <label
                              key={metric.key}
                              className='grid items-center gap-x-4 gap-y-1 px-3.5 py-2.5 sm:grid-cols-[minmax(0,1fr)_11rem]'
                           >
                              <span className='min-w-0'>
                                 <span className='font-semibold'>{name}</span>
                                 {unit && (
                                    <span className='text-ink-faint ml-1.5 text-xs'>
                                       {unit}
                                    </span>
                                 )}
                                 <span className='text-ink-faint block text-xs'>
                                    {before != null
                                       ? t('{{period}}: {{value}}', {
                                            period: periodLabel(
                                               t,
                                               kind,
                                               previous,
                                            ),
                                            value: formatMetric(
                                               t,
                                               metric,
                                               before,
                                               language,
                                            ),
                                         })
                                       : t('{{period}}: нет цифры', {
                                            period: periodLabel(
                                               t,
                                               kind,
                                               previous,
                                            ),
                                         })}
                                 </span>
                              </span>
                              <span>
                                 <input
                                    aria-invalid={tried && Number.isNaN(value)}
                                    className='field-input text-right tabular-nums'
                                    inputMode='decimal'
                                    maxLength={16}
                                    placeholder='—'
                                    value={texts[metric.key] ?? ''}
                                    onChange={(event) =>
                                       setTexts((known) => ({
                                          ...known,
                                          [metric.key]: event.target.value,
                                       }))
                                    }
                                 />
                                 {tried && Number.isNaN(value) && (
                                    <span className='text-danger mt-1 block text-xs'>
                                       {t('Нужно число')}
                                    </span>
                                 )}
                              </span>
                           </label>
                        );
                     })}
                  </div>
               ) : (
                  <Notice warning>
                     {t(
                        'Показателей ещё нет: добавьте их в «Настройки → Портфель → Показатели».',
                     )}
                  </Notice>
               )}
            </div>
         </ModalBody>
         <ModalFooter
            note={
               editing && filled ? (
                  <Button
                     hint={t('Удалить все цифры за этот период')}
                     size='sm'
                     variant='danger'
                     onClick={() => onDelete(kind, at)}
                  >
                     {t('Удалить цифры за период')}
                  </Button>
               ) : (
                  t('Пустое поле — цифры нет; стёртая цифра удаляется.')
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
               disabled={
                  !company.metrics.length || (!editing && !filled && !typed)
               }
               hint={
                  !editing && !filled && !typed
                     ? t('Введите хотя бы одну цифру')
                     : t('Сохранить цифры за {{period}}', {
                          period: periodLabel(t, kind, at),
                       })
               }
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

interface PeriodDialogProps {
   company: PortfolioCompany;
   target: PeriodTarget | null; // null: closed
   onSaved: (kind: PeriodKind, at: string) => void;
   onDelete: (kind: PeriodKind, at: string) => void;
   onClose: () => void;
}

/* «Добавить показатели» on a portfolio company's «Показатели»: a month or a
   quarter picked, and a figure for each of the company's metrics, with the
   period before beside it; a period already in the table is changed here
   the same way, or its figures deleted. */
const PeriodDialog = ({
   company,
   target,
   onSaved,
   onDelete,
   onClose,
}: PeriodDialogProps) => {
   const { t } = useTranslation('portfolio');
   return (
      <Modal
         open={target !== null}
         size='wide'
         subtitle={company.name}
         title={
            target?.at
               ? t('Показатели за {{period}}', {
                    period: periodLabel(t, target.kind, target.at),
                 })
               : t('Добавить показатели')
         }
         onClose={onClose}
      >
         {target && (
            <PeriodForm
               key={`${target.kind}:${target.at ?? 'new'}`}
               company={company}
               target={target}
               onClose={onClose}
               onDelete={onDelete}
               onSaved={onSaved}
            />
         )}
      </Modal>
   );
};

export default PeriodDialog;

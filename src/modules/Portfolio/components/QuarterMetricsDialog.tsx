import {
   metricFormat,
   metricName,
   quarterLabel,
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
} from '@shared/components';
import { SETTINGS_PATH } from '@shared/constants';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useRequest } from '@shared/hooks';

interface QuarterMetricsDialogProps {
   company: PortfolioCompany;
   quarter: string; // the last closed quarter, the latest one offered
   initial?: string; // the quarter picked first; the last closed one if not
   open: boolean;
   onClose: () => void;
}

// Quarters the analyst can fill in: the last closed one and those before it.
const QUARTERS_OFFERED = 8;

// What a figure is counted in, under its field.
const UNITS = {
   usd: 'в долларах',
   percent: 'в процентах',
   months: 'в месяцах',
   number: '',
} as const;

const toNumber = (text: string) => {
   const value = Number(text.replace(/\s/g, '').replace(',', '.'));
   return text.trim() === '' ? null : Number.isFinite(value) ? value : NaN;
};

const QuarterForm = ({
   company,
   quarter: latest,
   initial,
   onClose,
}: Omit<QuarterMetricsDialogProps, 'open'>) => {
   const { t } = useTranslation('portfolio');
   const quarters = recentQuarters(latest, QUARTERS_OFFERED).reverse();
   const first = initial && quarters.includes(initial) ? initial : latest;
   const [quarter, setQuarter] = useState(first);
   const valuesOf = (at: string) =>
      Object.fromEntries(
         company.metrics.map((metric) => [
            metric.key,
            metric.values[at] == null ? '' : String(metric.values[at]),
         ]),
      );
   const [values, setValues] = useState<Record<string, string>>(() =>
      valuesOf(first),
   );
   const [invalid, setInvalid] = useState<string[]>([]);
   const saving = useRequest();

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const parsed = Object.fromEntries(
         Object.entries(values).map(([key, text]) => [key, toNumber(text)]),
      );
      const wrong = Object.entries(parsed)
         .filter(([, value]) => Number.isNaN(value))
         .map(([key]) => key);
      if (wrong.length) {
         setInvalid(wrong);
         return;
      }
      // only the figures that changed are written
      const changed = Object.fromEntries(
         Object.entries(parsed).filter(
            ([key, value]) =>
               value !==
               (company.metrics.find((metric) => metric.key === key)?.values[
                  quarter
               ] ?? null),
         ),
      ) as Record<string, number | null>;
      if (
         await saving.run(async () => {
            await portfolio.saveQuarterMetrics(company.id, quarter, changed);
         })
      )
         onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4 sm:grid-cols-2'>
               <Field className='sm:col-span-2' label={t('Квартал')}>
                  <select
                     data-autofocus
                     className='field-input sm:w-60'
                     value={quarter}
                     onChange={(event) => {
                        setQuarter(event.target.value);
                        setValues(valuesOf(event.target.value));
                        setInvalid([]);
                     }}
                  >
                     {quarters.map((value) => (
                        <option key={value} value={value}>
                           {quarterLabel(t, value)}
                        </option>
                     ))}
                  </select>
               </Field>
               {company.metrics.map((metric) => {
                  const unit = UNITS[metricFormat(metric.key)];
                  return (
                     <Field
                        key={metric.key}
                        error={
                           invalid.includes(metric.key)
                              ? t('Введите число')
                              : undefined
                        }
                        hint={unit ? t(unit) : undefined}
                        label={metricName(t, metric.key)}
                     >
                        <input
                           aria-invalid={invalid.includes(metric.key)}
                           className='field-input'
                           inputMode='decimal'
                           value={values[metric.key] ?? ''}
                           onChange={(event) => {
                              setValues((prev) => ({
                                 ...prev,
                                 [metric.key]: event.target.value,
                              }));
                              setInvalid((prev) =>
                                 prev.filter((key) => key !== metric.key),
                              );
                           }}
                        />
                     </Field>
                  );
               })}
            </div>
            <p className='text-ink-soft mt-4 text-xs'>
               {t(
                  'Пустое поле — показателя за квартал нет; стёртое значение удаляется. Список показателей —',
               )}{' '}
               <Link className='link' to={`${SETTINGS_PATH}/metrics`}>
                  {t('Настройки → Показатели')}
               </Link>
            </p>
         </ModalBody>
         <ModalFooter>
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button loading={saving.pending} type='submit'>
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

/* A company's figures for one quarter, entered or corrected by hand: the
   analyst writes what the report brought, changes a figure or clears it.
   The metrics are Настройки → Показатели. */
const QuarterMetricsDialog = ({
   company,
   quarter,
   initial,
   open,
   onClose,
}: QuarterMetricsDialogProps) => {
   const { t } = useTranslation('portfolio');

   return (
      <Modal
         open={open}
         subtitle={company.name}
         title={t('Показатели за квартал')}
         onClose={onClose}
      >
         {open && (
            <QuarterForm
               company={company}
               initial={initial}
               quarter={quarter}
               onClose={onClose}
            />
         )}
      </Modal>
   );
};

export default QuarterMetricsDialog;

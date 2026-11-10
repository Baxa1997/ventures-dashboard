import {
   Button,
   Modal,
   ModalBody,
   ModalFooter,
   Segmented,
} from '@shared/components';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { Check, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Period = 'month' | 'quarter';

interface MetricsViewProps {
   open: boolean;
   period: Period;
   onPeriod: (next: Period) => void;
   periods: string[]; // the range's, oldest first: 2026-03 or 2026-Q1
   hidden: string[]; // those the person hid
   rangeText: string; // «с … по …», as above the table
   withFigures: (at: string) => boolean;
   onChange: (hidden: string[]) => void;
   onClose: () => void;
}

/* «Вид таблицы» of Показатели (10 Nov): every month or quarter of the
   range «с … по …» as a chip, by year; a click hides it from the table or
   brings it back. The figures never change; what is hidden is the person's
   own, for this company and view (prefs). */
const MetricsView = ({
   open,
   period,
   onPeriod,
   periods,
   hidden,
   rangeText,
   withFigures,
   onChange,
   onClose,
}: MetricsViewProps) => {
   const { t } = useTranslation('portfolio');
   const outside = hidden.filter((at) => !periods.includes(at));
   const shown = periods.filter((at) => !hidden.includes(at));
   const years = [...new Set(periods.map((at) => at.slice(0, 4)))];
   const short = (at: string) =>
      period === 'quarter' ? at.slice(5) : dayjs(`${at}-01`).format('MMM');
   const toggle = (at: string) =>
      onChange(
         hidden.includes(at)
            ? hidden.filter((one) => one !== at)
            : [...hidden, at],
      );

   return (
      <Modal open={open} title={t('Вид таблицы')} onClose={onClose}>
         <ModalBody>
            <div className='grid gap-4'>
               <div className='flex flex-wrap items-center justify-between gap-2'>
                  <Segmented
                     items={[
                        { id: 'month', label: t('Месяцы') },
                        { id: 'quarter', label: t('Кварталы') },
                     ]}
                     label={t('Период')}
                     value={period}
                     onChange={onPeriod}
                  />
                  <span className='text-ink-soft text-meta'>
                     {t('Показано {{shown}} из {{total}}', {
                        shown: shown.length,
                        total: periods.length,
                     })}
                  </span>
               </div>
               <p className='text-ink-soft text-meta'>
                  {t(
                     'Нажмите на месяц или квартал, чтобы скрыть его из таблицы или вернуть. Цифры компании при этом не меняются.',
                  )}{' '}
                  {t('Диапазон {{range}} меняется над таблицей.', {
                     range: rangeText,
                  })}
               </p>
               {years.map((year) => (
                  <section key={year}>
                     <h3 className='text-ink-strong text-meta mb-1.5 font-semibold'>
                        {year}
                     </h3>
                     <div
                        className={clsx(
                           'grid gap-1.5',
                           period === 'quarter' ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-6',
                        )}
                     >
                        {periods
                           .filter((at) => at.startsWith(year))
                           .map((at) => {
                              const on = !hidden.includes(at);
                              return (
                                 <button
                                    key={at}
                                    type='button'
                                    aria-pressed={on}
                                    className={clsx(
                                       'text-meta relative flex h-9 items-center justify-center gap-1.5 rounded-lg border font-medium capitalize transition-colors',
                                       on
                                          ? 'border-accent-soft bg-accent-tint text-accent-strong'
                                          : 'border-line text-ink-faint hover:bg-hover bg-white line-through',
                                    )}
                                    data-hint={
                                       on
                                          ? t('Скрыть из таблицы')
                                          : t('Вернуть в таблицу')
                                    }
                                    onClick={() => toggle(at)}
                                 >
                                    {on ? (
                                       <Check aria-hidden className='size-3.5' />
                                    ) : (
                                       <EyeOff aria-hidden className='size-3.5' />
                                    )}
                                    {short(at)}
                                    {withFigures(at) && (
                                       <span
                                          aria-hidden
                                          className='bg-success absolute top-1 right-1.5 size-1.5 rounded-full'
                                       />
                                    )}
                                 </button>
                              );
                           })}
                     </div>
                  </section>
               ))}
               <p className='text-ink-faint flex items-center gap-1.5 text-xs'>
                  <span className='bg-success size-1.5 rounded-full' />
                  {t('есть цифры')}
               </p>
            </div>
         </ModalBody>
         <ModalFooter>
            <Button
               disabled={periods.every((at) => withFigures(at) || hidden.includes(at))}
               hint={t('Скрыть месяцы и кварталы, за которые цифр нет')}
               variant='ghost'
               onClick={() =>
                  onChange([
                     ...outside,
                     ...periods.filter(
                        (at) => hidden.includes(at) || !withFigures(at),
                     ),
                  ])
               }
            >
               {t('Только с цифрами')}
            </Button>
            <Button
               disabled={shown.length === periods.length}
               hint={t('Вернуть в таблицу все периоды диапазона')}
               variant='ghost'
               onClick={() => onChange(outside)}
            >
               {t('Показать все')}
            </Button>
            <Button hint={t('Закрыть окно')} onClick={onClose}>
               {t('Готово')}
            </Button>
         </ModalFooter>
      </Modal>
   );
};

export default MetricsView;

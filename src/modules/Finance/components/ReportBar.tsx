import { FilterSelect, Segmented } from '@shared/components';
import type { FinPeriod } from '@shared/types/finance.types';
import { CalendarDays, CalendarRange } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PERIODS } from '../constants';

interface ReportBarProps {
   years: number[];
   year: number;
   period: FinPeriod;
   currencies: string[];
   currency: string;
   onChange: (patch: {
      year?: number;
      period?: FinPeriod;
      currency?: string;
   }) => void;
   children?: ReactNode; // at the right: the page's own note or link
}

const PERIOD_ICONS = { month: CalendarDays, quarter: CalendarRange };

// What a report shows: its year, months or quarters, and the currency of
// the accounts it counts, when the fund keeps more than one.
const ReportBar = ({
   years,
   year,
   period,
   currencies,
   currency,
   onChange,
   children,
}: ReportBarProps) => {
   const { t } = useTranslation('finance');
   return (
      <div className='mb-3.5 flex flex-wrap items-center gap-2'>
         <FilterSelect
            label={t('Год')}
            options={years.map((one) => ({
               value: String(one),
               label: t('{{year}} год', { year: one }),
            }))}
            showLabel={false}
            value={String(year)}
            onChange={(value) => onChange({ year: Number(value) })}
         />
         <Segmented
            items={(Object.keys(PERIODS) as FinPeriod[]).map((id) => ({
               id,
               label: t(PERIODS[id]),
               icon: PERIOD_ICONS[id],
            }))}
            label={t('Колонки')}
            value={period}
            onChange={(id) => onChange({ period: id })}
         />
         {currencies.length > 1 && (
            <Segmented
               items={currencies.map((id) => ({ id, label: id }))}
               label={t('Валюта счетов')}
               value={currency}
               onChange={(id) => onChange({ currency: id })}
            />
         )}
         {children && (
            <div className='text-ink-soft ml-auto text-xs'>{children}</div>
         )}
      </div>
   );
};

export default ReportBar;

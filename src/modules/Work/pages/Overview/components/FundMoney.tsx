import type { FundOverview } from '@shared/types/work.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { MONEY_PARTS } from '../constants';
import { formatMillions } from '../helpers';

interface FundMoneyProps {
   money: NonNullable<FundOverview['money']>;
}

// Where the money on the accounts stands: one bar split into its parts, and
// under it the same parts with their amounts.
const FundMoney = ({ money }: FundMoneyProps) => {
   const { t, i18n } = useTranslation('work');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const millions = (amount: number, digits?: number) =>
      t('{{amount}} млн', {
         amount: formatMillions(amount, language, digits),
      });
   const free = money.parts.find(({ part }) => part === 'free')?.amount ?? 0;
   const parts = money.parts.map((item) => ({
      ...item,
      label: t(MONEY_PARTS[item.part].label),
      value: millions(item.amount),
   }));

   return (
      <div className='p-5'>
         <div className='flex flex-wrap items-end justify-between gap-x-6 gap-y-3'>
            <div>
               <div className='text-ink-soft text-meta'>
                  {t('Свободно для новых сделок')}
               </div>
               <div className='mt-1 text-[19px] leading-6 font-bold'>
                  {t('{{free}} из {{total}} на счетах', {
                     free: millions(free),
                     total: millions(money.onAccounts),
                  })}
               </div>
            </div>
            <div className='sm:text-right'>
               <div className='text-ink-soft text-meta'>
                  {t('План размещения на {{year}} год', {
                     year: money.plan.year,
                  })}
               </div>
               <div className='text-meta mt-1 font-medium'>
                  {t(
                     '{{plan}} · вложено с начала {{invested}} · одобрено {{approved}}',
                     {
                        plan: millions(money.plan.amount, 1),
                        invested: millions(money.plan.invested),
                        approved: millions(money.plan.approved),
                     },
                  )}
               </div>
            </div>
         </div>

         <div
            role='img'
            aria-label={parts
               .map(({ label, value }) => `${label}: ${value}`)
               .join('; ')}
            className='animate-fill mt-3.5 flex h-7 gap-0.5 overflow-hidden rounded-md'
         >
            {parts.map(({ part, amount, label, value }) => (
               <span
                  key={part}
                  title={`${label}: ${value}`}
                  className={clsx('min-w-1.5', MONEY_PARTS[part].fill)}
                  style={{ flex: `${amount} 0 0` }}
               />
            ))}
         </div>

         <dl className='mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4'>
            {parts.map(({ part, label, value, note }) => (
               <div key={part}>
                  <dt className='text-ink-soft text-meta flex items-center gap-2'>
                     <span
                        aria-hidden
                        className={clsx(
                           'size-2.5 shrink-0 rounded-[3px]',
                           MONEY_PARTS[part].fill,
                        )}
                     />
                     {label}
                  </dt>
                  <dd className='mt-1.5'>
                     <div className='text-title font-bold'>{value}</div>
                     <div className='text-ink-soft mt-1.5 max-w-60 text-xs'>
                        {note}
                     </div>
                  </dd>
               </div>
            ))}
         </dl>
      </div>
   );
};

export default FundMoney;

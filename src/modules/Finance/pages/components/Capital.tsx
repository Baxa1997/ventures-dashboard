import { MONEY_PARTS } from '@modules/Finance/constants';
import {
   formatMillions,
   moneyParts,
   operatingLeft,
} from '@modules/Finance/helpers';
import type { FinanceData } from '@modules/Finance/hooks';
import { Card, FactList, STACK } from '@shared/components';
import { formatDate, formatUsd } from '@shared/helpers';
import clsx from 'clsx';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import PaymentCard from './PaymentCard';

interface CapitalProps {
   data: FinanceData;
   onActuals: () => void;
}

/* How much is free for new deals: the money on the accounts by the latest
   statements, less what is approved and waits for payment, the follow-on
   reserve and the operating budget left for the year. */
const Capital = ({ data, onActuals }: CapitalProps) => {
   const { t, i18n } = useTranslation('finance');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const usd = (value: number) => formatUsd(value, language);
   const money = moneyParts(data);
   const statement = formatDate(data.statementDate);
   const open = data.payments.filter(({ status }) => status !== 'paid');
   const current = data.accounts.find(({ id }) => id === 'current');
   const invested = data.companies.reduce(
      (sum, { invested: value }) => sum + value,
      0,
   );
   const year = String(data.plan.year);
   // the deals the committee decides on this month, at ИК-2
   const october = dayjs(data.statementDate).add(1, 'day').format('YYYY-MM');
   const atCommittee = data.meetings
      .filter(
         ({ body, stage, status, date }) =>
            body === 'ic' &&
            stage === 'ic2' &&
            status !== 'held' &&
            date.startsWith(october),
      )
      .flatMap(({ agenda }) =>
         agenda.filter(({ kind, amount }) => kind === 'decision' && amount),
      );

   const parts = (['free', 'approved', 'reserve', 'operating'] as const).map(
      (part) => ({
         part,
         amount: money[part],
         label: t(MONEY_PARTS[part].label),
      }),
   );

   const row = (
      title: ReactNode,
      note: ReactNode,
      amount: string,
      key: string,
   ) => (
      <li
         key={key}
         className='flex items-center justify-between gap-4 py-3 pr-5 pl-9'
      >
         <div className='min-w-0'>
            <div>{title}</div>
            {note && <div className='text-ink-soft mt-0.5 text-xs'>{note}</div>}
         </div>
         <span className='shrink-0 tabular-nums'>{amount}</span>
      </li>
   );
   const group = (title: string, amount: string) => (
      <div className='bg-ground/70 border-line flex justify-between gap-4 border-y px-5 py-2.5 font-semibold'>
         <span>{title}</span>
         <span className='tabular-nums'>{amount}</span>
      </div>
   );
   const liabilities = money.approved + money.reserve + money.operating;

   return (
      <>
         <div className='gap-section grid flex-1 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]'>
            <Card
               action={
                  <button type='button' className='link' onClick={onActuals}>
                     {t('Фактические данные')}
                  </button>
               }
               hint={t('по выпискам на {{date}}', { date: statement })}
               title={t('Свободно для новых сделок')}
            >
               <div className='px-5 pt-4 pb-4'>
                  <p className='flex flex-wrap items-baseline gap-x-3'>
                     <span className='text-display font-bold'>
                        {usd(money.free)}
                     </span>
                     <span className='text-ink-soft'>
                        {t('из {{total}} на счетах фонда в SQB', {
                           total: usd(money.onAccounts),
                        })}
                     </span>
                  </p>
                  <div
                     role='img'
                     aria-label={parts
                        .map(({ label, amount }) => `${label}: ${usd(amount)}`)
                        .join('; ')}
                     className='animate-fill mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full'
                  >
                     {parts.map(({ part, amount, label }) => (
                        <span
                           key={part}
                           title={`${label}: ${usd(amount)}`}
                           className={clsx('min-w-1', MONEY_PARTS[part].fill)}
                           style={{ flex: `${Math.max(amount, 0)} 0 0` }}
                        />
                     ))}
                  </div>
                  <ul className='text-ink-soft mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs'>
                     {parts.map(({ part, label }) => (
                        <li key={part} className='flex items-center gap-1.5'>
                           <span
                              aria-hidden
                              className={clsx(
                                 'size-2.5 rounded-[3px]',
                                 MONEY_PARTS[part].fill,
                              )}
                           />
                           {label}
                        </li>
                     ))}
                  </ul>
               </div>
               {group(t('Деньги на счетах'), usd(money.onAccounts))}
               <ul className='divide-line divide-y'>
                  {data.accounts.map((account) =>
                     row(
                        account.name,
                        account.balance === null
                           ? account.note
                           : [
                                account.note,
                                t('{{amount}} млн сум', {
                                   amount: formatMillions(
                                      account.balance,
                                      language,
                                   ),
                                }),
                             ].join(' · '),
                        account.balance === null ? '—' : usd(account.usd),
                        account.id,
                     ),
                  )}
               </ul>
               {group(t('Минус обязательства'), `−${usd(liabilities)}`)}
               <ul className='divide-line divide-y'>
                  {row(
                     t('Одобрено ИК и НС, ждёт оплаты'),
                     open
                        .map(({ title, amount }) => `${title} ${usd(amount)}`)
                        .join(' · '),
                     `−${usd(money.approved)}`,
                     'approved',
                  )}
                  {row(
                     t('Резерв follow-on'),
                     data.reserves
                        .map(({ title, note }) => `${title} · ${note}`)
                        .join('; '),
                     `−${usd(money.reserve)}`,
                     'reserve',
                  )}
                  {row(
                     t('Операционные расходы до конца года'),
                     t('остаток бюджета {{year}} · {{amount}} млн сум', {
                        year,
                        amount: formatMillions(operatingLeft(data), language),
                     }),
                     `−${usd(money.operating)}`,
                     'operating',
                  )}
               </ul>
               <div className='border-line flex items-center justify-between gap-4 border-t px-5 py-4'>
                  <span className='text-title font-bold'>
                     {t('Свободно для новых сделок')}
                  </span>
                  <span className='text-xl font-bold tabular-nums'>
                     {usd(money.free)}
                  </span>
               </div>
               {current && current.usd < money.approved && (
                  <div className='bg-warning-tint mx-5 rounded-lg px-4 py-3'>
                     <p className='font-semibold'>
                        {t('Платежи идут с расчётного счёта')}
                     </p>
                     <p className='mt-1'>
                        {t(
                           'На расчётном счёте {{current}}, к оплате {{due}}. Перед платежами фонд возвращает часть депозита письмом в банк — в выписке это строка «возврат части основного долга».',
                           {
                              current: usd(current.usd),
                              due: usd(money.approved),
                           },
                        )}
                     </p>
                  </div>
               )}
               <p className='text-ink-soft px-5 pt-3 pb-4 text-xs'>
                  {t(
                     'Пересчитывается при каждой загрузке выписки. Все счета фонда в сумах, в доллары переводятся по курсу ЦБ на дату выписки. Будущие проценты по депозиту не учитываются.',
                  )}
               </p>
            </Card>

            <div className={STACK}>
               <Card
                  hint={open.length}
                  title={t('Ближайшие платежи по сделкам')}
               >
                  <div className='divide-line flex flex-col divide-y px-5'>
                     {open.map((payment) => (
                        <div key={payment.id} className='py-4'>
                           <PaymentCard payment={payment} />
                        </div>
                     ))}
                  </div>
                  <p className='text-ink-soft px-5 pb-4 text-xs'>
                     {t(
                        'Платёжное поручение формирует бухгалтерия (Г. Абдуллаева), когда все основания закрыты. До этого кнопка «Передать в оплату» недоступна.',
                     )}
                  </p>
               </Card>
               <Card title={t('План размещения {{year}}', { year })}>
                  <FactList
                     className='px-5 py-2'
                     labelWidth='9rem'
                     rows={[
                        {
                           label: t('Вложено с начала'),
                           value: t('{{amount}} · {{count}} компания', {
                              amount: usd(invested),
                              count: data.companies.length,
                           }),
                        },
                        {
                           label: t('План по прямым сделкам'),
                           value: usd(data.plan.directDeals),
                        },
                        {
                           label: t('Одобрено и в оплате'),
                           value: usd(money.approved),
                        },
                        {
                           label: t('На ИК-2 в октябре'),
                           value: atCommittee.length
                              ? `${usd(atCommittee.reduce((sum, { amount }) => sum + (amount ?? 0), 0))} · ${atCommittee.map(({ title }) => title).join(', ')}`
                              : '—',
                        },
                     ]}
                  />
               </Card>
            </div>
         </div>
         <p className='text-ink-soft mt-section text-xs'>
            {t(
               'Проинвестировано $950 000 — из отчёта по ПП-59 за август 2026. Остатки на счетах и разбивка по сделкам на макете примерные.',
            )}
         </p>
      </>
   );
};

export default Capital;

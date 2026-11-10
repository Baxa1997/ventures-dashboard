import {
   Button,
   Card,
   Loading,
   Notice,
   PageBody,
   PageHeader,
   StatTile,
} from '@shared/components';
import type { FinCash, FinCategory } from '@shared/types/finance.types';
import dayjs from 'dayjs';
import {
   ArrowLeftRight,
   FileDown,
   Landmark,
   Rocket,
   Wallet,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import FlowChart from '../components/FlowChart';
import ReportBar from '../components/ReportBar';
import AdjustCell from '../components/AdjustCell';
import LineName from '../components/LineName';
import ReportTable, {
   exportReport,
   type ReportLine,
} from '../components/ReportTable';
import { CASH_GROUPS, FINANCE_PAGES } from '../constants';
import {
   balanceBefore,
   categoryName,
   currenciesOf,
   formatShort,
   formatSum,
   inCurrency,
   monthsOfYear,
   periodColumns,
   sumOf,
   sumsByMonth,
   yearsOf,
} from '../helpers';
import { useFinance, useFinanceEditable, useReportParams } from '../hooks';
import StoredNotice from './StoredNotice';

const GROUPS: Exclude<FinCash, 'none'>[] = [
   'operating',
   'investing',
   'financing',
];

/* Cash Flow, as the design draws it: the money on the fund's accounts at the
   start of each month or quarter, what came in and went out by line item in
   the three activities, and what was left at the end. It is counted from
   every operation of «Транзакции», so the balance at the end is what the
   accounts hold: transfers between them and operations still unsorted show
   on lines of their own. The table goes to Excel as the page shows it. */
const CashFlow = () => {
   const { t, i18n } = useTranslation('finance');
   const { t: tLayout } = useTranslation('layout');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const data = useFinance();
   const editable = useFinanceEditable();
   const years = yearsOf(data?.transactions ?? []);
   const currencies = data?.accounts.length
      ? currenciesOf(data.accounts)
      : ['USD'];
   const { year, period, currency, set } = useReportParams(years, currencies);
   const title = t('Движение денежных средств');

   if (!data)
      return (
         <>
            <PageHeader
               label={t('Cash Flow')}
               section={tLayout('Финансы')}
               title={title}
            />
            <Loading />
         </>
      );

   const money = (value: number) => formatSum(value, currency, language);
   const short = (value: number) => formatShort(value, currency);
   const months = monthsOfYear(year);
   const columns = periodColumns(months, period);
   const operations = inCurrency(data.transactions, data.accounts, currency);
   const sums = sumsByMonth(operations);
   const known = new Set(data.categories.map(({ key }) => key));
   const values = (of: (list: string[]) => number) =>
      columns.map((column) => of(column.months));

   const openingOf = (list: string[]) =>
      list.length
         ? balanceBefore(
              `${list[0]}-01`,
              data.transactions,
              data.accounts,
              currency,
           )
         : 0;
   const netOf = (list: string[]) =>
      operations
         .filter(({ date }) => list.includes(date.slice(0, 7)))
         .reduce((sum, { amount }) => sum + amount, 0);
   const closingOf = (list: string[]) => openingOf(list) + netOf(list);

   const inGroup = (group: FinCash) =>
      data.categories.filter(
         (one) =>
            one.cash === group &&
            (one.active || sumOf(sums, [one.key], months) !== 0),
      );
   const groupOf = (group: FinCash, list: string[]) =>
      sumOf(
         sums,
         inGroup(group).map(({ key }) => key),
         list,
      );
   // what no group takes: transfers, deleted line items, unsorted operations
   const outside = data.categories.filter(
      (one) => one.cash === 'none' && sumOf(sums, [one.key], months) !== 0,
   );
   const deleted = [...sums.keys()].filter((key) => key && !known.has(key));
   const unsortedOf = (list: string[]) => sumOf(sums, [''], list);

   // a month's figure changes where it stands, by an adjustment operation;
   // a quarter's only reads, as do the totals and balances
   const adjustable =
      editable && data.stored && period === 'month';

   const lineOf = (category: FinCategory): ReportLine => ({
      labelNode: (
         <LineName
            category={category}
            disabled={!editable || !data.stored}
            link={`${FINANCE_PAGES.transactions}?category=${encodeURIComponent(category.key)}&year=${year}`}
            linkHint={t('Операции по статье за год')}
         />
      ),
      cell: adjustable
         ? (index) => (
              <AdjustCell
                 category={category.key}
                 currency={currency}
                 format={money}
                 month={columns[index].months[0]}
                 name={categoryName(category, language)}
                 value={sumOf(sums, [category.key], columns[index].months)}
              />
           )
         : undefined,
      key: category.key,
      kind: 'line',
      label: categoryName(category, language),
      link: `${FINANCE_PAGES.transactions}?category=${encodeURIComponent(category.key)}&year=${year}`,
      values: values((list) => sumOf(sums, [category.key], list)),
      total: sumOf(sums, [category.key], months),
   });
   const total = (
      key: string,
      label: string,
      of: (list: string[]) => number,
      yearTotal = of(months),
   ): ReportLine => ({
      key,
      kind: 'total',
      label,
      values: values(of),
      total: yearTotal,
   });

   const lines: ReportLine[] = [
      total(
         'opening',
         t('Остаток на начало периода'),
         openingOf,
         openingOf(months),
      ),
      ...GROUPS.flatMap((group): ReportLine[] => [
         {
            key: group,
            kind: 'group',
            label: t(CASH_GROUPS[group]),
            values: [],
         },
         ...inGroup(group).map(lineOf),
         total(`${group}-total`, t('Итого'), (list) => groupOf(group, list)),
      ]),
      ...(outside.length || deleted.length || unsortedOf(months)
         ? [
              {
                 key: 'outside',
                 kind: 'group' as const,
                 label: t('Вне групп'),
                 values: [],
              },
              ...outside.map(lineOf),
              ...deleted.map((key): ReportLine => ({
                 key,
                 kind: 'line',
                 label: t('Удалённая статья «{{key}}»', { key }),
                 values: values((list) => sumOf(sums, [key], list)),
                 total: sumOf(sums, [key], months),
              })),
              ...(unsortedOf(months)
                 ? [
                      {
                         key: 'unsorted',
                         kind: 'line' as const,
                         label: t('Не разнесено'),
                         link: `${FINANCE_PAGES.transactions}?category=none&year=${year}`,
                         values: values(unsortedOf),
                         total: unsortedOf(months),
                      },
                   ]
                 : []),
           ]
         : []),
      total('net', t('Чистый денежный поток'), netOf),
      total(
         'closing',
         t('Остаток на конец периода'),
         closingOf,
         closingOf(months),
      ),
   ];

   const invested = groupOf('investing', months);
   const lastMonth = months[months.length - 1];
   const unsortedCount = operations.filter(
      ({ category, date }) => !category && date.startsWith(String(year)),
   ).length;

   return (
      <>
         <PageHeader
            actions={
               <Button
                  hint={t(
                     'Таблица как на странице: файл CSV, который открывает Excel',
                  )}
                  variant='ghost'
                  onClick={() =>
                     exportReport(
                        `cash-flow-${year}-${currency}.csv`,
                        [
                           t('Статья'),
                           ...columns.map(({ label }) => label),
                           t('Итого {{year}}', { year }),
                        ],
                        lines,
                        false,
                     )
                  }
               >
                  <FileDown aria-hidden />
                  {t('Выгрузить в Excel')}
               </Button>
            }
            label={t('Cash Flow')}
            meta={t(
               'Деньги на счетах фонда за {{year}} год: остаток, поступления и списания по статьям «Транзакций».',
               { year },
            )}
            section={tLayout('Финансы')}
            title={title}
         />
         <PageBody>
            <StoredNotice stored={data.stored} />
            <ReportBar
               currencies={currencies}
               currency={currency}
               period={period}
               year={year}
               years={years}
               onChange={set}
            />
            {data.stored && !data.accounts.length && (
               <Notice className='mb-3.5'>
                  {t(
                     'Добавьте счета фонда с остатком на дату начала: без них остаток считается от нуля.',
                  )}{' '}
                  <Link
                     className='font-semibold underline'
                     to={`${FINANCE_PAGES.transactions}?open=accounts`}
                  >
                     {t('Счета фонда')}
                  </Link>
               </Notice>
            )}
            {unsortedCount > 0 && (
               <Notice warning className='mb-3.5'>
                  {t(
                     'Операций без статьи за год: {{count}}. Они в строке «Не разнесено», пока у них нет статьи.',
                     { count: unsortedCount },
                  )}{' '}
                  <Link
                     className='font-semibold underline'
                     to={`${FINANCE_PAGES.transactions}?category=none&year=${year}`}
                  >
                     {t('Разнести')}
                  </Link>
               </Notice>
            )}
            <div className='mb-section grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4'>
               <StatTile
                  color='indigo'
                  icon={Landmark}
                  label={t('Остаток на 1 января')}
                  value={short(openingOf([`${year}-01`]))}
               />
               <StatTile
                  color='success'
                  icon={Wallet}
                  label={t('Остаток сейчас')}
                  note={
                     lastMonth
                        ? t('на конец: {{month}}', {
                             month: dayjs(`${lastMonth}-01`).format(
                                'MMMM YYYY',
                             ),
                          })
                        : undefined
                  }
                  value={short(closingOf(months))}
               />
               <StatTile
                  color='sky'
                  icon={ArrowLeftRight}
                  label={t('Чистый поток с начала года')}
                  tone={netOf(months) < 0 ? 'danger' : 'ink'}
                  value={short(netOf(months))}
               />
               <StatTile
                  color='warning'
                  icon={Rocket}
                  label={t('Инвестиционная деятельность')}
                  note={t('вложено и получено от выходов за {{year}} год', {
                     year,
                  })}
                  value={short(invested)}
               />
            </div>
            <Card className='mb-section'>
               <ReportTable
                  columns={columns.map(({ label }) => label)}
                  format={money}
                  linkHint={t('Операции по статье за год')}
                  lines={lines}
                  totalLabel={t('Итого {{year}}', { year })}
               />
            </Card>
            <Card title={t('Остаток денежных средств')}>
               <FlowChart
                  bars={[
                     {
                        label: t('Чистый поток'),
                        color: 'var(--color-sky)',
                        colorOf: (value) =>
                           value < 0
                              ? 'var(--color-danger)'
                              : 'var(--color-sky)',
                        values: values(netOf),
                     },
                  ]}
                  format={short}
                  label={t('Остаток денежных средств')}
                  labels={columns.map(({ label }) => label)}
                  line={{
                     label: t('Остаток на конец периода'),
                     color: 'var(--color-navy)',
                     values: values(closingOf),
                  }}
               />
            </Card>
         </PageBody>
      </>
   );
};

export default CashFlow;

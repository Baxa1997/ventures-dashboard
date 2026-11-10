import settings, { rulesOf } from '@modules/Settings/services';
import {
   Button,
   Card,
   InlineField,
   Loading,
   Notice,
   PageBody,
   PageHeader,
   StatTile,
} from '@shared/components';
import { parseAmount } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { FinCategory } from '@shared/types/finance.types';
import {
   ArrowDownLeft,
   ArrowUpRight,
   CalendarClock,
   FileDown,
   Scale,
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
   shareOf,
} from '../components/ReportTable';
import { FINANCE_PAGES } from '../constants';
import {
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
import finance from '../services';
import StoredNotice from './StoredNotice';

/* P&L, as the design draws it: the income and expenses of the fund's
   management company for a year, by month or quarter, against the year's
   budget, then the profit before tax, the tax and the net profit. The
   figures are the operations of «Транзакции» sorted into the line items
   that P&L takes; a line item's name opens its operations. The budget and
   the tax rate are changed where they stand; the table goes to Excel as
   the page shows it. */
const Pnl = () => {
   const { t, i18n } = useTranslation('finance');
   const { t: tLayout } = useTranslation('layout');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const user = useCurrentUser();
   const data = useFinance();
   const editable = useFinanceEditable();
   const years = yearsOf(data?.transactions ?? []);
   const currencies = data?.accounts.length
      ? currenciesOf(data.accounts)
      : ['USD'];
   const { year, period, currency, set } = useReportParams(years, currencies);
   const title = t('P&L фонда');

   if (!data)
      return (
         <>
            <PageHeader section={tLayout('Финансы')} title={title} />
            <Loading />
         </>
      );

   const money = (value: number) => formatSum(value, currency, language);
   const short = (value: number) => formatShort(value, currency);
   const months = monthsOfYear(year);
   const columns = periodColumns(months, period);
   const operations = inCurrency(data.transactions, data.accounts, currency);
   const sums = sumsByMonth(operations);
   const used = (category: FinCategory) =>
      category.active || sumOf(sums, [category.key], months) !== 0;
   const income = data.categories.filter(
      (one) => one.pnl === 'income' && used(one),
   );
   const expenses = data.categories.filter(
      (one) => one.pnl === 'expense' && used(one),
   );
   const keys = (list: FinCategory[]) => list.map(({ key }) => key);
   // the budget is the fund's, kept in its first currency: others show none
   const budgeted = currency === currencies[0];
   const planOf = (list: FinCategory[]) =>
      list.reduce((sum, { budgets }) => sum + (budgets[String(year)] ?? 0), 0);
   const rate = rulesOf().profitTaxRate;

   const incomeOf = (list: string[]) => sumOf(sums, keys(income), list);
   const expensesOf = (list: string[]) => sumOf(sums, keys(expenses), list);
   const beforeTax = (list: string[]) => incomeOf(list) + expensesOf(list);
   const taxOf = (profit: number) =>
      -Math.max(0, Math.round((profit * rate) / 100));
   const incomePlan = planOf(income);
   const expensePlan = -planOf(expenses);
   const planBeforeTax = incomePlan + expensePlan;

   const unsorted = operations.filter(
      ({ category, date }) => !category && date.startsWith(String(year)),
   );
   const elapsed = Math.max(months.length, 1);

   const values = (of: (list: string[]) => number) =>
      columns.map((column) => of(column.months));

   // a month's figure changes where it stands, by an adjustment operation;
   // a quarter's only reads, as do the totals
   const adjustable =
      editable && data.stored && period === 'month';

   const line = (category: FinCategory, sign: 1 | -1): ReportLine => {
      const plan = sign * (category.budgets[String(year)] ?? 0);
      const name = categoryName(category, language);
      const link = `${FINANCE_PAGES.transactions}?category=${encodeURIComponent(category.key)}&year=${year}`;
      return {
         labelNode: (
            <LineName
               category={category}
               disabled={!editable || !data.stored}
               link={link}
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
                    name={name}
                    value={sumOf(sums, [category.key], columns[index].months)}
                 />
              )
            : undefined,
         key: category.key,
         kind: 'line',
         label: name,
         link: `${FINANCE_PAGES.transactions}?category=${encodeURIComponent(category.key)}&year=${year}`,
         values: values((list) => sumOf(sums, [category.key], list)),
         total: sumOf(sums, [category.key], months),
         budget: budgeted ? plan : undefined,
         budgetNode: budgeted && (
            <InlineField
               className='justify-end text-right tabular-nums'
               disabled={!editable || !data.stored}
               format={(text) =>
                  Number(text) ? money(sign * Number(text)) : '—'
               }
               inputMode='numeric'
               kind='number'
               label={t('Бюджет {{year}}: {{name}}', { year, name })}
               placeholder='—'
               value={String(category.budgets[String(year)] ?? '')}
               onSave={(text) =>
                  finance.setBudget(
                     category.key,
                     year,
                     parseAmount(text) || 0,
                     user.id,
                  )
               }
            />
         ),
      };
   };

   const total = (
      key: string,
      label: string,
      of: (list: string[]) => number,
      plan: number,
      extra: Partial<ReportLine> = {},
   ): ReportLine => ({
      key,
      kind: 'total',
      label,
      values: values(of),
      total: of(months),
      budget: budgeted ? plan : undefined,
      ...extra,
   });

   const lines: ReportLine[] = [
      { key: 'income', kind: 'group', label: t('Доходы'), values: [] },
      ...income.map((category) => line(category, 1)),
      total('income-total', t('Итого доходы'), incomeOf, incomePlan),
      { key: 'expenses', kind: 'group', label: t('Расходы'), values: [] },
      ...expenses.map((category) => line(category, -1)),
      total('expenses-total', t('Итого расходы'), expensesOf, expensePlan),
      { key: 'result', kind: 'group', label: t('Результат'), values: [] },
      total(
         'before-tax',
         t('Прибыль до налогообложения'),
         beforeTax,
         planBeforeTax,
      ),
      total(
         'tax',
         t('Налог на прибыль, {{rate}}%', { rate }),
         (list) => taxOf(beforeTax(list)),
         taxOf(planBeforeTax),
         {
            labelNode: (
               <span className='inline-flex items-center gap-1 font-normal'>
                  {t('Налог на прибыль')},
                  <InlineField
                     className='w-12'
                     disabled={!editable}
                     format={(text) => `${text}%`}
                     inputMode='decimal'
                     kind='number'
                     label={t('Ставка налога на прибыль, %')}
                     validate={(text) =>
                        Number(text) >= 0 && Number(text) <= 100
                           ? undefined
                           : t('От 0 до 100')
                     }
                     value={String(rate)}
                     onSave={(text) =>
                        settings.saveRules(
                           { profitTaxRate: Number(text) || 0 },
                           user.id,
                           { profitTaxRate: t('Ставка налога на прибыль, %') },
                        )
                     }
                  />
               </span>
            ),
         },
      ),
      total(
         'net',
         t('Чистая прибыль'),
         (list) => beforeTax(list) + taxOf(beforeTax(list)),
         planBeforeTax + taxOf(planBeforeTax),
      ),
   ];
   const budgetLabels: [string, string] | undefined = budgeted
      ? [t('Бюджет {{year}}', { year }), t('Исполнение')]
      : undefined;

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
                        `pnl-${year}-${currency}.csv`,
                        [
                           t('Статья'),
                           ...columns.map(({ label }) => label),
                           t('Итого {{year}}', { year }),
                           ...(budgetLabels ?? []),
                        ],
                        lines,
                        budgeted,
                     )
                  }
               >
                  <FileDown aria-hidden />
                  {t('Выгрузить в Excel')}
               </Button>
            }
            meta={t(
               'Доходы и расходы управляющей компании за {{year}} год по статьям «Транзакций», в валюте счетов.',
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
            {unsorted.length > 0 && (
               <Notice warning className='mb-3.5'>
                  {t(
                     'Операций без статьи за год: {{count}}. В P&L их нет, пока у них нет статьи.',
                     { count: unsorted.length },
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
                  color='success'
                  icon={ArrowDownLeft}
                  label={t('Доходы с начала года')}
                  note={
                     budgeted && incomePlan
                        ? t('{{share}} годового бюджета', {
                             share: shareOf(incomeOf(months), incomePlan),
                          })
                        : undefined
                  }
                  value={short(incomeOf(months))}
               />
               <StatTile
                  color='warning'
                  icon={ArrowUpRight}
                  label={t('Расходы с начала года')}
                  note={
                     budgeted && expensePlan
                        ? t('{{share}} годового бюджета', {
                             share: shareOf(expensesOf(months), expensePlan),
                          })
                        : undefined
                  }
                  value={short(Math.abs(expensesOf(months)))}
               />
               <StatTile
                  color='indigo'
                  icon={Scale}
                  label={t('Прибыль до налога')}
                  tone={beforeTax(months) < 0 ? 'danger' : 'ink'}
                  value={short(beforeTax(months))}
               />
               <StatTile
                  color='sky'
                  icon={CalendarClock}
                  label={t('Расходы в месяц')}
                  note={t('в среднем за {{count}} мес.', { count: elapsed })}
                  value={short(Math.abs(expensesOf(months)) / elapsed)}
               />
            </div>
            <Card className='mb-section'>
               <ReportTable
                  budgetLabels={budgetLabels}
                  columns={columns.map(({ label }) => label)}
                  format={money}
                  linkHint={t('Операции по статье за год')}
                  lines={lines}
                  totalLabel={t('Итого {{year}}', { year })}
               />
            </Card>
            <Card title={t('Доходы и расходы')}>
               <FlowChart
                  bars={[
                     {
                        label: t('Доходы'),
                        color: 'var(--color-sky)',
                        values: values(incomeOf),
                     },
                     {
                        label: t('Расходы'),
                        color: 'var(--color-lavender)',
                        values: values((list) => Math.abs(expensesOf(list))),
                     },
                  ]}
                  format={short}
                  label={t('Доходы и расходы')}
                  labels={columns.map(({ label }) => label)}
                  line={{
                     label: t('Прибыль до налога'),
                     color: 'var(--color-navy)',
                     values: values(beforeTax),
                  }}
               />
            </Card>
         </PageBody>
      </>
   );
};

export default Pnl;

import {
   CASH_FLOW_LABELS,
   type Currency,
   type Period,
} from '@modules/Finance/constants';
import {
   accountCount,
   budgetPlan,
   categoryAmount,
   formatMillions,
   groupTotal,
   inCurrency,
   monthlyBars,
   waitingOperations,
} from '@modules/Finance/helpers';
import type { FinanceData } from '@modules/Finance/hooks';
import finance from '@modules/Finance/services';
import {
   Badge,
   Button,
   Card,
   FilterBar,
   FilterSelect,
   STACK,
   StatTile,
} from '@shared/components';
import { formatDate, formatUsd } from '@shared/helpers';
import type { Operation } from '@shared/types/finance.types';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { Download } from 'lucide-react';
import { Fragment, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PnlChart from './PnlChart';

interface ActualsProps {
   data: FinanceData;
}

/* What actually went through the fund's accounts: P&L and cash flow by the
   cash method, the statements behind them, the operations still without a
   category, and the balance completed from the other sections. */
const Actuals = ({ data }: ActualsProps) => {
   const { t, i18n } = useTranslation('finance');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const [period, setPeriod] = useState<Period>('year');
   const [currency, setCurrency] = useState<Currency>('uzs');
   const quarter = period === 'quarter';
   const unit = currency === 'uzs' ? t('млн сум') : t('тыс. $');
   // tenths for small figures, whole numbers from a hundred up, as the design
   const money = (millions: number) => {
      const value = inCurrency(data, millions, currency);
      return formatMillions(
         Math.abs(value) >= 100
            ? Math.round(value)
            : Math.round(value * 10) / 10,
         language,
      );
   };
   const months = quarter ? data.monthly.slice(-3) : data.monthly;
   const span = quarter
      ? t('III квартал')
      : t('{{count}} месяц', { count: data.monthly.length });

   const income = groupTotal(data, 'income', quarter);
   const expense = groupTotal(data, 'expense', quarter);
   const result = income + expense;
   const plan = Math.round(
      (budgetPlan(data, 'income') - budgetPlan(data, 'expense')) *
         (months.length / 12),
   );
   const cash = data.accounts.reduce(
      (sum, { balance }) => sum + (balance ?? 0),
      0,
   );
   const onAccountsUsd = data.accounts.reduce((sum, { usd }) => sum + usd, 0);

   const statement = formatDate(data.statementDate);
   const firstMonth = dayjs(`${months[0].month}-01`).format('MMMM');
   const lastMonth = dayjs(`${months.at(-1)?.month}-01`).format('MMMM');

   return (
      <>
         <FilterBar>
            <FilterSelect
               label={t('Период')}
               options={[
                  {
                     value: 'year',
                     label: t('январь–сентябрь {{year}}', {
                        year: data.plan.year,
                     }),
                  },
                  {
                     value: 'quarter',
                     label: t('III квартал {{year}}', { year: data.plan.year }),
                  },
               ]}
               value={period}
               onChange={setPeriod}
            />
            <FilterSelect
               label={t('Валюта')}
               options={[
                  { value: 'uzs', label: t('млн сум') },
                  { value: 'usd', label: t('тыс. $') },
               ]}
               value={currency}
               onChange={setCurrency}
            />
            <span className='text-ink-soft text-meta ml-auto'>
               {t('Метод: кассовый — только то, что прошло по счетам')}
            </span>
         </FilterBar>

         <div className='mt-section gap-section stagger grid sm:grid-cols-2 xl:grid-cols-4'>
            <StatTile
               label={t('Деньги на счетах · {{date}}', {
                  date: dayjs(data.statementDate).format('D MMM'),
               })}
               note={t('≈ {{usd}} · {{count}} счёт в SQB', {
                  usd: formatUsd(onAccountsUsd, language),
                  count: accountCount(data),
               })}
               value={`${money(cash)} ${unit}`}
            />
            <StatTile
               label={t('Доходы · {{span}}', { span })}
               note={t('проценты по депозиту')}
               value={`${money(income)} ${unit}`}
            />
            <StatTile
               label={t('Расходы · {{span}}', { span })}
               note={t('без инвестиций в компании')}
               value={`${money(Math.abs(expense))} ${unit}`}
            />
            <StatTile
               label={t('Операционный результат')}
               note={t('план {{span}} {{plan}} · {{diff}}', {
                  span: quarter ? t('квартала') : t('9 мес.'),
                  plan: money(plan),
                  diff:
                     result >= plan
                        ? t('лучше на {{value}}', {
                             value: money(result - plan),
                          })
                        : t('хуже на {{value}}', {
                             value: money(plan - result),
                          }),
               })}
               value={`${money(result)} ${unit}`}
            />
         </div>

         <div className='mt-section gap-section grid flex-1 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]'>
            <div className={STACK}>
               <Card hint={unit} title={t('P&L — доходы и расходы')}>
                  <div className='px-5 pt-4 pb-2'>
                     <PnlChart
                        format={(value) => inCurrency(data, value, currency)}
                        months={monthlyBars(data).slice(-months.length)}
                        unit={unit}
                     />
                  </div>
                  <PnlTable data={data} money={money} />
               </Card>
               <Card
                  hint={`${firstMonth}–${lastMonth} · ${unit}`}
                  title={t('Движение денег')}
               >
                  <CashFlow cash={cash} data={data} money={money} />
               </Card>
            </div>
            <div className={STACK}>
               <Statements data={data} />
               <Operations data={data} money={money} />
            </div>
         </div>

         <Card
            className='mt-section'
            hint={t('на {{date}} · {{unit}}', { date: statement, unit })}
            title={t('Баланс')}
         >
            <BalanceSheet cash={cash} data={data} money={money} />
         </Card>
         <p className='text-ink-soft mt-section text-xs'>
            {t(
               'P&L и движение денег считаются кассовым методом: только то, что прошло по счетам фонда в SQB. Баланс дополняется вложениями из «Портфеля», задолженностью из «Договоров» и прочими статьями от главного бухгалтера. Официальная отчётность остаётся в бухгалтерии. Все суммы на макете примерные.',
            )}
         </p>
      </>
   );
};

interface PartProps {
   data: FinanceData;
   money: (millions: number) => string;
}

const ROW = 'flex items-center justify-between gap-4 px-5 py-2.5';

// Income and expenses by category, for the quarter and since January.
const PnlTable = ({ data, money }: PartProps) => {
   const { t } = useTranslation('finance');
   const groups = [
      { group: 'income' as const, label: t('Доходы') },
      { group: 'expense' as const, label: t('Расходы') },
   ];
   const total = (quarter: boolean) =>
      groupTotal(data, 'income', quarter) +
      groupTotal(data, 'expense', quarter);
   const cells = (quarter: number, year: number, strong = false) => (
      <span
         className={clsx(
            'flex shrink-0 gap-4 tabular-nums',
            strong && 'font-semibold',
         )}
      >
         <span className='w-20 text-right'>{money(quarter)}</span>
         <span className='w-20 text-right'>{money(year)}</span>
      </span>
   );

   return (
      <div className='text-meta border-line border-t'>
         <div className={clsx(ROW, 'text-ink-soft text-xs')}>
            <span>{t('Статья')}</span>
            <span className='flex shrink-0 gap-4'>
               <span className='w-20 text-right'>{t('III квартал')}</span>
               <span className='w-20 text-right'>
                  {t('{{count}} месяц', { count: data.monthly.length })}
               </span>
            </span>
         </div>
         {groups.map(({ group, label }) => (
            <Fragment key={group}>
               <div className={clsx(ROW, 'bg-ground/70 font-semibold')}>
                  <span>{label}</span>
                  {cells(
                     groupTotal(data, group, true),
                     groupTotal(data, group, false),
                     true,
                  )}
               </div>
               {data.categories
                  .filter((category) => category.group === group)
                  .map((category) => (
                     <div
                        key={category.id}
                        className={clsx(ROW, 'border-line border-b pl-8')}
                     >
                        <span>{category.title}</span>
                        {cells(
                           categoryAmount(data, category, true),
                           categoryAmount(data, category, false),
                        )}
                     </div>
                  ))}
            </Fragment>
         ))}
         <div className={clsx(ROW, 'font-semibold')}>
            <span>{t('Операционный результат')}</span>
            {cells(total(true), total(false), true)}
         </div>
      </div>
   );
};

const CashFlow = ({ data, money, cash }: PartProps & { cash: number }) => {
   const { t } = useTranslation('finance');
   const closing = data.cashFlow.reduce((sum, { amount }) => sum + amount, 0);
   const matches = Math.abs(closing - cash) < 1;
   return (
      <ul className='divide-line text-meta divide-y'>
         {data.cashFlow.map((line) => (
            <li key={line.key} className={ROW}>
               <span>
                  <span
                     className={clsx(line.key === 'opening' && 'font-semibold')}
                  >
                     {t(CASH_FLOW_LABELS[line.key])}
                  </span>
                  {line.note && (
                     <span className='text-ink-soft block text-xs'>
                        {line.note}
                     </span>
                  )}
               </span>
               <span className='tabular-nums'>
                  {line.amount > 0 && line.key !== 'opening' ? '+' : ''}
                  {money(line.amount)}
               </span>
            </li>
         ))}
         <li className={ROW}>
            <span>
               <span className='font-semibold'>
                  {t('Остаток на {{date}}', {
                     date: formatDate(data.statementDate),
                  })}
               </span>
               <span
                  className={clsx(
                     'block text-xs',
                     matches ? 'text-success-ink' : 'text-warning-ink',
                  )}
               >
                  {matches
                     ? t('совпадает с выписками')
                     : t('расходится с выписками на {{value}}', {
                          value: money(closing - cash),
                       })}
               </span>
            </span>
            <span className='font-semibold tabular-nums'>{money(closing)}</span>
         </li>
      </ul>
   );
};

// The statements uploaded from the bank's client and their balances.
const Statements = ({ data }: { data: FinanceData }) => {
   const { t, i18n } = useTranslation('finance');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const input = useRef<HTMLInputElement>(null);
   const [over, setOver] = useState(false);
   const upload = (files: FileList | null) => {
      const names = [...(files ?? [])].map(({ name }) => name);
      if (names.length) finance.uploadStatements(names);
   };

   return (
      <Card
         hint={t('{{count}} счёт · SQB', { count: accountCount(data) })}
         title={t('Выписки')}
      >
         <div className='px-5 pt-4'>
            <button
               type='button'
               className={clsx(
                  'flex w-full flex-col items-center rounded-lg border border-dashed px-4 py-5 text-center',
                  over
                     ? 'border-accent bg-accent-tint'
                     : 'border-line-strong bg-ground/50',
               )}
               onClick={() => input.current?.click()}
               onDragLeave={() => setOver(false)}
               onDragOver={(event) => {
                  event.preventDefault();
                  setOver(true);
               }}
               onDrop={(event) => {
                  event.preventDefault();
                  setOver(false);
                  upload(event.dataTransfer.files);
               }}
            >
               <Download aria-hidden className='text-accent size-4' />
               <span className='mt-2 font-semibold'>
                  {t('Перетащите выписки или выберите файлы')}
               </span>
               <span className='text-ink-soft mt-1 text-xs'>
                  {t(
                     'Выписки из банк-клиента SQB — XLSX «Kochirma». Можно несколько файлов сразу. Повторные операции отсекаются по номеру документа.',
                  )}
               </span>
            </button>
            <input
               ref={input}
               hidden
               multiple
               accept='.xlsx,.xls'
               type='file'
               onChange={(event) => {
                  upload(event.target.files);
                  event.target.value = '';
               }}
            />
            {data.uploads.length > 0 && (
               <ul className='text-ink-soft mt-2 text-xs'>
                  {data.uploads.slice(0, 3).map(({ name, date }) => (
                     <li key={`${name}-${date}`}>
                        {t(
                           'Загружено {{date}}: {{name}} — разбор выписок появится вместе с сервером',
                           {
                              date: formatDate(date),
                              name,
                           },
                        )}
                     </li>
                  ))}
               </ul>
            )}
         </div>
         <ul className='divide-line divide-y px-5 pb-1'>
            {data.accounts.map((account) => (
               <li
                  key={account.id}
                  className='flex items-center justify-between gap-4 py-3'
               >
                  <span>
                     <span className='block font-medium'>{account.name}</span>
                     <span
                        className={clsx(
                           'block text-xs',
                           account.balance === null
                              ? 'text-warning-ink'
                              : 'text-ink-soft',
                        )}
                     >
                        {account.note}
                     </span>
                  </span>
                  <span className='shrink-0 tabular-nums'>
                     {account.balance === null
                        ? '—'
                        : t('{{amount}} млн сум', {
                             amount: formatMillions(account.balance, language),
                          })}
                  </span>
               </li>
            ))}
         </ul>
      </Card>
   );
};

// Operations the rules could not place; each needs a category from a person.
const Operations = ({ data, money }: PartProps) => {
   const { t } = useTranslation('finance');
   const waiting = waitingOperations(data);
   return (
      <Card
         hint={waiting.length + data.hiddenOperations}
         title={t('Операции без статьи')}
      >
         <ul className='divide-line divide-y px-5'>
            {waiting.map((operation) => (
               <OperationRow
                  key={operation.id}
                  data={data}
                  money={money}
                  operation={operation}
               />
            ))}
         </ul>
         <p className='text-ink-soft px-5 pb-4 text-xs'>
            {data.hiddenOperations > 0 &&
               `${t('Ещё {{count}} операция.', { count: data.hiddenOperations })} `}
            {t(
               'Комиссии банка разносятся сами и показываются вместе с платежом.',
            )}
         </p>
      </Card>
   );
};

const OperationRow = ({
   data,
   money,
   operation,
}: PartProps & { operation: Operation }) => {
   const { t } = useTranslation('finance');
   const [categoryId, setCategoryId] = useState(operation.suggested ?? '');
   return (
      <li className='py-3.5'>
         <div className='flex justify-between gap-3'>
            <span className='font-semibold'>{operation.title}</span>
            <span className='font-semibold tabular-nums'>
               {money(operation.amount)}
            </span>
         </div>
         <div className='text-ink-soft mt-0.5 text-xs'>{operation.detail}</div>
         <div className='mt-2.5 flex gap-2'>
            <select
               aria-label={t('Статья для операции «{{title}}»', {
                  title: operation.title,
               })}
               className='field-input text-meta h-9 min-w-0 flex-1'
               value={categoryId}
               onChange={(event) => setCategoryId(event.target.value)}
            >
               <option value=''>{t('Выберите статью')}</option>
               {data.categories
                  .filter(({ group }) =>
                     operation.amount < 0
                        ? group === 'expense'
                        : group === 'income',
                  )
                  .map((category) => (
                     <option key={category.id} value={category.id}>
                        {category.title}
                     </option>
                  ))}
            </select>
            <Button
               className='h-9 px-4'
               disabled={!categoryId}
               variant='ghost'
               onClick={() => finance.assignOperation(operation.id, categoryId)}
            >
               {t('Разнести')}
            </Button>
         </div>
         <div
            className={clsx(
               'mt-1.5 text-xs',
               operation.warning ? 'text-warning-ink' : 'text-ink-soft',
            )}
         >
            {operation.note}
         </div>
      </li>
   );
};

// Assets from the statements, the portfolio and the chief accountant against
// the debts under the contracts.
const BalanceSheet = ({ data, money, cash }: PartProps & { cash: number }) => {
   const { t, i18n } = useTranslation('finance');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const invested = data.companies.reduce(
      (sum, { invested: value }) => sum + value,
      0,
   );
   const investedMillions = (invested * data.rate) / 1_000_000;
   const assets = cash + investedMillions + data.balance.other;
   const equity = assets - data.balance.liabilities;
   const line = (title: string, note: string, amount: number) => (
      <li className='flex items-center justify-between gap-4 py-2.5 pl-4'>
         <span>
            <span className='block'>{title}</span>
            <span className='text-ink-soft block text-xs'>{note}</span>
         </span>
         <span className='tabular-nums'>{money(amount)}</span>
      </li>
   );
   const head = (title: string, amount: number) => (
      <div className='border-line flex justify-between border-b py-2.5 font-semibold'>
         <span>{title}</span>
         <span className='tabular-nums'>{money(amount)}</span>
      </div>
   );

   return (
      <div className='text-meta px-5 pt-2 pb-4'>
         <div className='grid gap-x-10 gap-y-4 lg:grid-cols-2'>
            <div>
               {head(t('Активы'), assets)}
               <ul className='divide-line divide-y'>
                  {line(
                     t('Деньги и депозиты'),
                     t('расчётный счёт, депозит и карты — из выписок'),
                     cash,
                  )}
                  {line(
                     t('Вложения в портфельные компании'),
                     t('{{amount}} по стоимости вложения · из «Портфеля»', {
                        amount: formatUsd(invested, language),
                     }),
                     investedMillions,
                  )}
                  {line(
                     t('Прочие активы'),
                     t('от главного бухгалтера, раз в квартал'),
                     data.balance.other,
                  )}
               </ul>
            </div>
            <div>
               {head(t('Обязательства'), data.balance.liabilities)}
               <ul className='divide-line divide-y'>
                  {line(
                     t('Задолженность по договорам'),
                     t('ABACUS, ГПХ · из «Договоров»'),
                     data.balance.liabilities,
                  )}
               </ul>
               <div className='border-line flex justify-between border-b py-2.5 font-semibold'>
                  <span>{t('Собственный капитал')}</span>
                  <span className='tabular-nums'>{money(equity)}</span>
               </div>
            </div>
         </div>
         {!data.balance.reconciled && (
            <p className='text-ink-soft mt-3 flex flex-wrap items-center gap-3 text-xs'>
               <Badge tone='warning'>{t('Не сверено')}</Badge>
               {t(
                  'Сверка с учётом главного бухгалтера за III квартал не проведена',
               )}
            </p>
         )}
      </div>
   );
};

export default Actuals;

import {
   ActionMenu,
   Button,
   Card,
   ConfirmDialog,
   FilterSelect,
   Loading,
   type MenuAction,
   PageBody,
   PageHeader,
   SearchField,
   Segmented,
   StatTile,
   Table,
   TD,
   TH,
} from '@shared/components';
import {
   downloadCsv,
   formatNumericDate,
   personName,
   todayISO,
} from '@shared/helpers';
import { toast } from '@shared/helpers/toast';
import { useCurrentUser } from '@shared/hooks';
import type {
   FinAccount,
   FinCategory,
   FinTransaction,
} from '@shared/types/finance.types';
import clsx from 'clsx';
import dayjs from 'dayjs';
import {
   ArrowDownLeft,
   ArrowUpRight,
   FileDown,
   FileSpreadsheet,
   Landmark,
   ListTree,
   Plus,
   Scale,
   Tag,
   Trash2,
   Upload,
   WandSparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import AccountsDialog from '../components/AccountsDialog';
import CategoriesDialog from '../components/CategoriesDialog';
import ImportDialog from '../components/ImportDialog';
import RulesDialog from '../components/RulesDialog';
import TransactionDialog from '../components/TransactionDialog';
import { PAGE_SIZE } from '../constants';
import {
   accountBalance,
   categoriesFor,
   categoryName,
   formatShort,
   formatSum,
} from '../helpers';
import { useFinance, useFinanceEditable } from '../hooks';
import finance from '../services';
import StoredNotice from './StoredNotice';

type Direction = 'all' | 'in' | 'out';
type Dialog = 'import' | 'accounts' | 'categories' | 'rules' | null;
const DIALOGS: Exclude<Dialog, null>[] = [
   'import',
   'accounts',
   'categories',
   'rules',
];

// Sums by currency, the dollar first: «$12.5K · 150M UZS»
const byCurrency = (
   list: FinTransaction[],
   currencyOf: (one: FinTransaction) => string,
   pick: (amount: number) => number,
) => {
   const sums = new Map<string, number>();
   list.forEach((one) => {
      const currency = currencyOf(one);
      sums.set(currency, (sums.get(currency) ?? 0) + pick(one.amount));
   });
   return [...sums].sort(([a], [b]) =>
      a === 'USD' ? -1 : b === 'USD' ? 1 : a.localeCompare(b),
   );
};

/* «Транзакции», as the design draws them: the operations on the fund's
   accounts from bank statements and entered by hand, each sorted into a
   line item, which P&L and Cash Flow then count. The line item is chosen
   in the row; a row opens the operation's window. «Действия» hold the
   accounts, the line items, the sorting rules and the export. The address
   keeps a filter a report opened it with (?category=none, ?year=2026). */
const Transactions = () => {
   const { t, i18n } = useTranslation('finance');
   const { t: tLayout } = useTranslation('layout');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const data = useFinance();
   const user = useCurrentUser();
   const editable = useFinanceEditable();
   const [params, setParams] = useSearchParams();
   const [account, setAccount] = useState('');
   // '', a year or a month: '2026', '2026-11'
   const [period, setPeriod] = useState(
      params.get('month') ?? params.get('year') ?? '',
   );
   const [category, setCategory] = useState(params.get('category') ?? '');
   const [direction, setDirection] = useState<Direction>('all');
   const [query, setQuery] = useState('');
   const [shown, setShown] = useState(PAGE_SIZE);
   const [editing, setEditing] = useState<FinTransaction | null>(null);
   const [adding, setAdding] = useState(false);
   const [dialog, setDialog] = useState<Dialog>(
      DIALOGS.find((one) => one === params.get('open')) ?? null,
   );
   const [undoing, setUndoing] = useState<string | null>(null);
   const title = t('Транзакции');

   // a report's link opens the page on its filter; the address is then left clean
   useEffect(() => {
      if (params.size) setParams({}, { replace: true });
   }, [params, setParams]);

   if (!data)
      return (
         <>
            <PageHeader section={tLayout('Финансы')} title={title} />
            <Loading />
         </>
      );

   const accountOf = (id: string): FinAccount | undefined =>
      data.accounts.find((one) => one.id === id);
   const currencyOf = (one: FinTransaction) =>
      accountOf(one.accountId)?.currency || 'USD';
   const categoryOf = (key: string): FinCategory | undefined =>
      data.categories.find((one) => one.key === key);
   const search = query.trim().toLowerCase();

   const list = data.transactions.filter(
      (one) =>
         (!account || one.accountId === account) &&
         (!period || one.date.startsWith(period)) &&
         (!category ||
            (category === 'none'
               ? !one.category
               : one.category === category)) &&
         (direction === 'all' ||
            (direction === 'in' ? one.amount > 0 : one.amount < 0)) &&
         (!search ||
            `${one.party} ${one.purpose} ${one.note}`
               .toLowerCase()
               .includes(search)),
   );
   const unsorted = data.transactions.filter((one) => !one.category).length;
   const months = [
      ...new Set(data.transactions.map(({ date }) => date.slice(0, 7))),
   ]
      .sort()
      .reverse();
   const years = [...new Set(months.map((one) => one.slice(0, 4)))];

   const sumText = (pick: (amount: number) => number, signed = false) => {
      const parts = byCurrency(list, currencyOf, pick);
      return parts.length
         ? parts
              .map(([currency, sum]) => formatShort(sum, currency))
              .join(' · ')
         : signed
           ? formatShort(0, 'USD')
           : '$0';
   };
   const incoming = list.filter(({ amount }) => amount > 0);
   const outgoing = list.filter(({ amount }) => amount < 0);

   // the filtered list by line item, the largest first
   const byCategory = [
      ...list.reduce((map, one) => {
         const key = `${one.category}|${currencyOf(one)}`;
         map.set(key, (map.get(key) ?? 0) + one.amount);
         return map;
      }, new Map<string, number>()),
   ].sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));

   const exportList = () =>
      downloadCsv(`transactions-${todayISO()}.csv`, [
         [
            t('Дата'),
            t('Счёт'),
            t('Контрагент'),
            t('Назначение платежа'),
            t('Статья'),
            t('Сумма'),
            t('Валюта'),
            t('Комментарий'),
         ],
         ...list.map((one) => [
            formatNumericDate(one.date),
            accountOf(one.accountId)?.name ?? '',
            one.party,
            one.purpose,
            categoryName(categoryOf(one.category), language) ||
               t('Не разнесено'),
            String(one.amount).replace('.', ','),
            currencyOf(one),
            one.note,
         ]),
      ]);

   const actions: MenuAction[] = [
      {
         label: t('Счета фонда'),
         icon: Landmark,
         hint: t('Банковские счета фонда и остатки на дату начала'),
         onSelect: () => setDialog('accounts'),
      },
      {
         label: t('Статьи'),
         icon: ListTree,
         hint: t('Статьи доходов и расходов и их место в P&L и Cash Flow'),
         onSelect: () => setDialog('categories'),
      },
      {
         label: t('Правила разнесения'),
         icon: WandSparkles,
         hint: t('Какие операции сразу получают статью при импорте'),
         onSelect: () => setDialog('rules'),
      },
      {
         label: t('Выгрузить в Excel'),
         icon: FileDown,
         hint: t('Операции по фильтру в файл CSV, который открывает Excel'),
         onSelect: exportList,
      },
   ];

   const change = (one: FinTransaction, key: string) =>
      finance.setCategory(one.id, key).then(
         () => toast.success(t('Статья сохранена')),
         () => toast.error(t('Не удалось сохранить статью')),
      );
   const undo = data.imports.find(({ id }) => id === undoing);

   return (
      <>
         <PageHeader
            actions={
               <>
                  <ActionMenu
                     bordered
                     actions={actions}
                     label={t('Счета, статьи, правила и выгрузка')}
                     name={title}
                     text={t('Действия')}
                  />
                  {editable && (
                     <Button
                        disabled={!data.stored}
                        hint={t('Внести операцию, которой нет в выписке')}
                        variant='ghost'
                        onClick={() => setAdding(true)}
                     >
                        <Plus aria-hidden />
                        {t('Операция')}
                     </Button>
                  )}
                  {editable && (
                     <Button
                        disabled={!data.stored}
                        hint={t('Загрузить выписку из банка: CSV или 1С')}
                        onClick={() => setDialog('import')}
                     >
                        <Upload aria-hidden />
                        {t('Импорт выписки')}
                     </Button>
                  )}
               </>
            }
            meta={t(
               'Операции по счетам фонда из банковских выписок. Разнесённые по статьям операции считаются в P&L и Cash Flow.',
            )}
            section={tLayout('Финансы')}
            title={title}
         />
         <PageBody>
            <StoredNotice stored={data.stored} />
            <div className='mb-section grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4'>
               <StatTile
                  color='success'
                  icon={ArrowDownLeft}
                  label={t('Поступления')}
                  note={t('{{count}} операция', { count: incoming.length })}
                  value={sumText((amount) => Math.max(amount, 0))}
               />
               <StatTile
                  color='warning'
                  icon={ArrowUpRight}
                  label={t('Списания')}
                  note={t('{{count}} операция', { count: outgoing.length })}
                  value={sumText((amount) => Math.max(-amount, 0))}
               />
               <StatTile
                  color='indigo'
                  icon={Scale}
                  label={t('Сальдо')}
                  note={
                     period.length === 7
                        ? dayjs(`${period}-01`).format('MMMM YYYY')
                        : period
                          ? t('{{year}} год', { year: period })
                          : t('за всё время')
                  }
                  value={sumText((amount) => amount, true)}
               />
               <StatTile
                  color={unsorted ? 'warning' : 'success'}
                  icon={Tag}
                  label={t('Не разнесено')}
                  note={
                     unsorted ? (
                        <button
                           className='text-accent font-semibold hover:underline'
                           data-hint={t('Показать операции без статьи')}
                           type='button'
                           onClick={() => setCategory('none')}
                        >
                           {t('показать')}
                        </button>
                     ) : (
                        t('все операции разнесены')
                     )
                  }
                  tone={unsorted ? 'warning' : 'ink'}
                  value={String(unsorted)}
               />
            </div>
            <div className='mb-3.5 flex flex-wrap items-center gap-2'>
               <FilterSelect
                  label={t('Счёт')}
                  options={[
                     { value: '', label: t('Все счета') },
                     ...data.accounts.map((one) => ({
                        value: one.id,
                        label: [one.name, one.number.slice(-4)]
                           .filter(Boolean)
                           .join(' · '),
                     })),
                  ]}
                  showLabel={false}
                  value={account}
                  onChange={setAccount}
               />
               <FilterSelect
                  label={t('Период')}
                  options={[
                     { value: '', label: t('Весь период') },
                     ...years.flatMap((one) => [
                        { value: one, label: t('{{year}} год', { year: one }) },
                        ...months
                           .filter((each) => each.startsWith(one))
                           .map((each) => ({
                              value: each,
                              label: `· ${dayjs(`${each}-01`).format('MMMM YYYY')}`,
                           })),
                     ]),
                  ]}
                  showLabel={false}
                  value={period}
                  onChange={setPeriod}
               />
               <FilterSelect
                  accent={category === 'none'}
                  label={t('Статья')}
                  options={[
                     { value: '', label: t('Все статьи') },
                     { value: 'none', label: t('Не разнесено') },
                     ...data.categories.map((one) => ({
                        value: one.key,
                        label: categoryName(one, language),
                     })),
                  ]}
                  showLabel={false}
                  value={category}
                  onChange={setCategory}
               />
               <Segmented
                  items={[
                     { id: 'all', label: t('Все') },
                     { id: 'in', label: t('Приход') },
                     { id: 'out', label: t('Расход') },
                  ]}
                  label={t('Направление')}
                  value={direction}
                  onChange={setDirection}
               />
               <div className='w-full sm:ml-auto sm:w-72'>
                  <SearchField
                     label={t('Контрагент или назначение')}
                     value={query}
                     onChange={setQuery}
                  />
               </div>
            </div>
            <div className='grid items-start gap-section xl:grid-cols-[minmax(0,1fr)_20rem]'>
               <Card>
                  <Table
                     className='min-w-3xl'
                     head={
                        <>
                           <th className={TH}>{t('Дата')}</th>
                           <th className={TH}>
                              {t('Контрагент и назначение платежа')}
                           </th>
                           <th className={TH}>{t('Статья')}</th>
                           <th className={clsx(TH, 'text-right')}>
                              {t('Сумма')}
                           </th>
                        </>
                     }
                  >
                     {list.slice(0, shown).map((one) => {
                        const own = accountOf(one.accountId);
                        const source = data.imports.find(
                           ({ id }) => id === one.importId,
                        );
                        return (
                           <tr
                              key={one.id}
                              className='hover:bg-hover cursor-pointer'
                              data-hint={t('Открыть операцию')}
                              onClick={() => setEditing(one)}
                           >
                              <td
                                 className={clsx(
                                    TD,
                                    'align-top whitespace-nowrap',
                                 )}
                              >
                                 {formatNumericDate(one.date)}
                                 <div className='text-ink-faint text-xs'>
                                    {own?.name ?? '—'}
                                 </div>
                              </td>
                              <td className={clsx(TD, 'min-w-64 align-top')}>
                                 <div className='font-semibold'>
                                    {one.party || '—'}
                                 </div>
                                 {one.dealId && (
                                    <div className='text-accent text-xs font-semibold'>
                                       →{' '}
                                       {data.deals.find(
                                          ({ id }) => id === one.dealId,
                                       )?.company ?? t('Сделка не в работе')}
                                    </div>
                                 )}
                                 {one.purpose && (
                                    <div className='text-ink-soft line-clamp-2 text-xs'>
                                       {one.purpose}
                                    </div>
                                 )}
                                 <div className='text-ink-faint mt-0.5 flex items-center gap-1 text-[11px]'>
                                    {source ? (
                                       <>
                                          <FileSpreadsheet
                                             aria-hidden
                                             className='size-3'
                                          />
                                          {source.fileName}
                                       </>
                                    ) : (
                                       t('внесена вручную')
                                    )}
                                    {one.note && <i>· {one.note}</i>}
                                 </div>
                              </td>
                              <td
                                 className={clsx(TD, 'align-top')}
                                 onClick={(event) => event.stopPropagation()}
                              >
                                 <select
                                    aria-label={t('Статья: {{party}}', {
                                       party: one.party,
                                    })}
                                    className={clsx(
                                       'field-input h-8 max-w-56 min-w-44 text-xs',
                                       !one.category &&
                                          'border-warning/60 bg-warning-tint text-warning-ink',
                                    )}
                                    disabled={!editable || !data.stored}
                                    value={one.category}
                                    onChange={(event) =>
                                       change(one, event.target.value)
                                    }
                                 >
                                    <option value=''>
                                       {t('Не разнесено')}
                                    </option>
                                    {categoriesFor(
                                       data.categories,
                                       one.amount,
                                       one.category,
                                    ).map((item) => (
                                       <option key={item.key} value={item.key}>
                                          {categoryName(item, language)}
                                       </option>
                                    ))}
                                 </select>
                              </td>
                              <td
                                 className={clsx(
                                    TD,
                                    'text-right align-top font-bold whitespace-nowrap tabular-nums',
                                    one.amount < 0
                                       ? 'text-danger'
                                       : 'text-success-ink',
                                 )}
                              >
                                 {formatSum(
                                    one.amount,
                                    currencyOf(one),
                                    language,
                                    true,
                                 )}
                              </td>
                           </tr>
                        );
                     })}
                     {!list.length && (
                        <tr>
                           <td
                              className='text-ink-soft px-4.5 py-10 text-center'
                              colSpan={4}
                           >
                              {data.transactions.length
                                 ? t('Операций по этим условиям нет.')
                                 : t(
                                      'Операций пока нет. Загрузите выписку из банка.',
                                   )}
                           </td>
                        </tr>
                     )}
                  </Table>
                  <footer className='border-line text-ink-soft flex flex-wrap items-center justify-between gap-2 border-t px-4.5 py-2.5 text-xs'>
                     <span>
                        {t('{{count}} операция', { count: list.length })}
                     </span>
                     {list.length > shown ? (
                        <Button
                           hint={t('Показать следующие операции')}
                           size='sm'
                           variant='ghost'
                           onClick={() =>
                              setShown((count) => count + PAGE_SIZE)
                           }
                        >
                           {t('Показать ещё {{count}}', {
                              count: Math.min(PAGE_SIZE, list.length - shown),
                           })}
                        </Button>
                     ) : (
                        <span>
                           {t(
                              'Нажмите на строку, чтобы добавить комментарий или правило',
                           )}
                        </span>
                     )}
                  </footer>
               </Card>
               <div className='grid gap-section'>
                  <Card hint={t('по фильтру')} title={t('По статьям')}>
                     <ul className='divide-line divide-y'>
                        {byCategory.map(([key, sum]) => {
                           const [item, currency] = key.split('|');
                           return (
                              <li
                                 key={key}
                                 className='flex items-center justify-between gap-3 px-4.5 py-2 text-sm'
                              >
                                 <button
                                    className={clsx(
                                       'min-w-0 truncate text-left hover:underline',
                                       !item &&
                                          'text-warning-ink font-semibold',
                                    )}
                                    data-hint={t('Показать операции статьи')}
                                    type='button'
                                    onClick={() => setCategory(item || 'none')}
                                 >
                                    {item
                                       ? categoryName(
                                            categoryOf(item),
                                            language,
                                         ) || item
                                       : t('Не разнесено')}
                                 </button>
                                 <b
                                    className={clsx(
                                       'shrink-0 tabular-nums',
                                       sum < 0
                                          ? 'text-danger'
                                          : 'text-success-ink',
                                    )}
                                 >
                                    {formatShort(sum, currency)}
                                 </b>
                              </li>
                           );
                        })}
                        {!byCategory.length && (
                           <li className='text-ink-soft px-4.5 py-4 text-sm'>
                              {t('Нет операций')}
                           </li>
                        )}
                     </ul>
                  </Card>
                  <Card title={t('Загруженные выписки')}>
                     <ul className='divide-line divide-y'>
                        {data.imports.slice(0, 8).map((one) => (
                           <li
                              key={one.id}
                              className='flex items-start gap-2.5 px-4.5 py-2.5'
                           >
                              <FileSpreadsheet
                                 aria-hidden
                                 className='text-ink-soft mt-0.5 size-4 shrink-0'
                              />
                              <div className='min-w-0 flex-1'>
                                 <div className='truncate text-sm font-semibold'>
                                    {one.fileName}
                                 </div>
                                 <div className='text-ink-soft text-xs'>
                                    {[
                                       formatNumericDate(one.date),
                                       accountOf(one.accountId)?.name,
                                       t('{{count}} операция', {
                                          count: one.count,
                                       }),
                                       personName(one.byId),
                                    ]
                                       .filter(Boolean)
                                       .join(' · ')}
                                 </div>
                              </div>
                              {editable && (
                                 <button
                                    aria-label={t('Удалить выписку: {{file}}', {
                                       file: one.fileName,
                                    })}
                                    className='text-ink-soft hover:bg-danger/12 hover:text-danger grid size-7 shrink-0 place-items-center rounded-md'
                                    data-hint={t(
                                       'Удалить выписку с её операциями',
                                    )}
                                    type='button'
                                    onClick={() => setUndoing(one.id)}
                                 >
                                    <Trash2 aria-hidden className='size-4' />
                                 </button>
                              )}
                           </li>
                        ))}
                        {!data.imports.length && (
                           <li className='text-ink-soft px-4.5 py-4 text-sm'>
                              {t('Выписки ещё не загружались.')}
                           </li>
                        )}
                     </ul>
                  </Card>
                  <Card
                     action={
                        <button
                           className='head-link'
                           data-hint={t(
                              'Банковские счета фонда и остатки на дату начала',
                           )}
                           type='button'
                           onClick={() => setDialog('accounts')}
                        >
                           {editable ? t('Изменить') : t('Открыть')}
                        </button>
                     }
                     title={t('Счета фонда')}
                  >
                     <ul className='divide-line divide-y'>
                        {data.accounts.map((one) => (
                           <li
                              key={one.id}
                              className='flex items-start gap-2.5 px-4.5 py-2.5'
                           >
                              <Landmark
                                 aria-hidden
                                 className='text-ink-soft mt-0.5 size-4 shrink-0'
                              />
                              <div className='min-w-0 flex-1'>
                                 <div
                                    className={clsx(
                                       'truncate text-sm font-semibold',
                                       !one.active && 'text-ink-faint',
                                    )}
                                 >
                                    {one.name}
                                 </div>
                                 <div className='text-ink-soft text-xs tabular-nums'>
                                    {[one.bank, one.number, one.currency]
                                       .filter(Boolean)
                                       .join(' · ')}
                                 </div>
                              </div>
                              <span className='shrink-0 text-sm font-semibold tabular-nums'>
                                 {formatShort(
                                    accountBalance(one, data.transactions),
                                    one.currency,
                                 )}
                              </span>
                           </li>
                        ))}
                        {!data.accounts.length && (
                           <li className='text-ink-soft px-4.5 py-4 text-sm'>
                              {t(
                                 'Счетов пока нет. Добавьте их в «Действия» → «Счета фонда».',
                              )}
                           </li>
                        )}
                     </ul>
                  </Card>
               </div>
            </div>
         </PageBody>
         <TransactionDialog
            data={data}
            editable={editable}
            open={editing !== null || adding}
            transaction={editing}
            onClose={() => {
               setEditing(null);
               setAdding(false);
            }}
         />
         <ImportDialog
            data={data}
            open={dialog === 'import'}
            onAccounts={() => setDialog('accounts')}
            onClose={() => setDialog(null)}
         />
         <AccountsDialog
            data={data}
            editable={editable}
            open={dialog === 'accounts'}
            onClose={() => setDialog(null)}
         />
         <CategoriesDialog
            data={data}
            editable={editable}
            open={dialog === 'categories'}
            onClose={() => setDialog(null)}
         />
         <RulesDialog
            data={data}
            editable={editable}
            open={dialog === 'rules'}
            onClose={() => setDialog(null)}
         />
         <ConfirmDialog
            open={undoing !== null}
            subtitle={undo?.fileName}
            title={t('Удалить выписку?')}
            onClose={() => setUndoing(null)}
            onConfirm={async () => {
               if (undoing) await finance.removeImport(undoing, user.id);
               setUndoing(null);
            }}
         >
            <p>
               {t(
                  'Вместе с выпиской удалятся её операции ({{count}}), и отчёты пересчитаются. Выписку можно загрузить снова.',
                  {
                     count: data.transactions.filter(
                        ({ importId }) => importId === undoing,
                     ).length,
                  },
               )}
            </p>
         </ConfirmDialog>
      </>
   );
};

export default Transactions;

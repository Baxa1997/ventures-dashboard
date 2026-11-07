import { FINANCE_PATH } from '@shared/constants';
import type {
   FinCash,
   FinCategory,
   FinFlow,
   FinPeriod,
   FinPnl,
} from '@shared/types/finance.types';

// Texts are keys of the "finance" translations.

export const FINANCE_PAGES = {
   pnl: `${FINANCE_PATH}/pnl`,
   cashFlow: `${FINANCE_PATH}/cash-flow`,
   transactions: `${FINANCE_PATH}/transactions`,
} as const;

export const FLOWS = {
   in: 'Приход',
   out: 'Расход',
   both: 'Приход и расход',
} as const satisfies Record<FinFlow, string>;

export const PNL_PLACES = {
   income: 'Доход',
   expense: 'Расход',
   none: 'Не входит',
} as const satisfies Record<FinPnl, string>;

export const CASH_GROUPS = {
   operating: 'Операционная деятельность',
   investing: 'Инвестиционная деятельность',
   financing: 'Финансовая деятельность',
   none: 'Не входит',
} as const satisfies Record<FinCash, string>;

export const PERIODS = {
   month: 'Месяцы',
   quarter: 'Кварталы',
} as const satisfies Record<FinPeriod, string>;

export const CURRENCIES = ['USD', 'UZS', 'EUR', 'RUB'] as const;

// The line item of transfers between the fund's own accounts: it is in
// neither report, so moving money between accounts changes no figure.
export const TRANSFER = 'transfer';

const item = (
   key: string,
   names: FinCategory['names'],
   flow: FinFlow,
   pnl: FinPnl,
   cash: FinCash,
   sortOrder: number,
   system = false,
): FinCategory => ({
   id: '',
   key,
   names,
   flow,
   pnl,
   cash,
   budgets: {},
   active: true,
   system,
   sortOrder,
});

/* The line items the design starts with, used while ucode's table has no
   rows (batch 27 writes the same ones); the first change writes them all. */
export const BUILT_IN_CATEGORIES: FinCategory[] = [
   item(
      'fee',
      {
         ru: 'Плата за управление (от SQB)',
         uz: 'Boshqaruv haqi (SQB dan)',
         en: 'Management fee (from SQB)',
      },
      'in',
      'income',
      'operating',
      1,
   ),
   item(
      'interest',
      {
         ru: 'Процентный доход по депозитам',
         uz: 'Depozitlar bo‘yicha foiz daromadi',
         en: 'Interest on deposits',
      },
      'in',
      'income',
      'operating',
      2,
   ),
   item(
      'exit',
      {
         ru: 'Поступления от выходов',
         uz: 'Chiqishlardan tushumlar',
         en: 'Exit proceeds',
      },
      'in',
      'income',
      'investing',
      3,
   ),
   item(
      'capital',
      {
         ru: 'Взносы капитала от SQB',
         uz: 'SQB kapital badallari',
         en: 'Capital contributions from SQB',
      },
      'in',
      'none',
      'financing',
      4,
   ),
   item(
      'payroll',
      { ru: 'Фонд оплаты труда', uz: 'Ish haqi fondi', en: 'Payroll' },
      'out',
      'expense',
      'operating',
      5,
   ),
   item(
      'rent',
      { ru: 'Аренда офиса', uz: 'Ofis ijarasi', en: 'Office rent' },
      'out',
      'expense',
      'operating',
      6,
   ),
   item(
      'legal',
      {
         ru: 'Юридические и аудиторские услуги',
         uz: 'Yuridik va audit xizmatlari',
         en: 'Legal and audit services',
      },
      'out',
      'expense',
      'operating',
      7,
   ),
   item(
      'events',
      {
         ru: 'Маркетинг и мероприятия',
         uz: 'Marketing va tadbirlar',
         en: 'Marketing and events',
      },
      'out',
      'expense',
      'operating',
      8,
   ),
   item(
      'it',
      { ru: 'IT и подписки', uz: 'IT va obunalar', en: 'IT and subscriptions' },
      'out',
      'expense',
      'operating',
      9,
   ),
   item(
      'bank_fee',
      {
         ru: 'Банковские комиссии',
         uz: 'Bank komissiyalari',
         en: 'Bank fees',
      },
      'out',
      'expense',
      'operating',
      10,
   ),
   item(
      'other',
      { ru: 'Прочие расходы', uz: 'Boshqa xarajatlar', en: 'Other expenses' },
      'out',
      'expense',
      'operating',
      11,
   ),
   item(
      'invest',
      {
         ru: 'Инвестиции в портфельные компании',
         uz: 'Portfel kompaniyalariga investitsiyalar',
         en: 'Investments in portfolio companies',
      },
      'out',
      'none',
      'investing',
      12,
   ),
   item(
      TRANSFER,
      {
         ru: 'Перевод между своими счетами',
         uz: 'O‘z hisoblar o‘rtasida o‘tkazma',
         en: 'Transfer between own accounts',
      },
      'both',
      'none',
      'none',
      13,
      true,
   ),
];

// How many operations the list shows before «Показать ещё».
export const PAGE_SIZE = 200;

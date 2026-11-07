import { todayISO } from '@shared/helpers';
import type {
   FinAccount,
   FinCategory,
   FinDeal,
   FinPeriod,
   FinRule,
   FinTransaction,
   StatementRow,
} from '@shared/types/finance.types';
import type { SupportedLanguageType } from '@shared/types/system/language.types';
import dayjs from 'dayjs';
import { TRANSFER } from '../constants';

// ---- a bank statement

// "52 000,00", "-5,400.00", "1 234" → a number; NaN when it is none
export const statementNumber = (raw: string) => {
   let value = String(raw ?? '')
      .replace(/[\s ]/g, '')
      .replace(/[^\d,.\-+−]/g, '')
      .replace('−', '-');
   if (/,\d{1,2}$/.test(value))
      value = value.replace(/\./g, '').replace(',', '.');
   else value = value.replace(/,/g, '');
   return value ? parseFloat(value) : NaN;
};

// "07.11.2026", "7/11/2026", "2026-11-07" → "2026-11-07"; '' when it is none
export const statementDate = (raw: string) => {
   const value = String(raw ?? '').trim();
   const local = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
   if (local)
      return `${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}`;
   return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
};

// 1С's exchange with a client bank: СекцияДокумент=… blocks of key=value
const parseClientBank = (text: string, ownNumber: string) => {
   const own = ownNumber.replace(/\s/g, '');
   return text
      .split(/СекцияДокумент=/)
      .slice(1)
      .flatMap((section): StatementRow[] => {
         const fields: Record<string, string> = {};
         section.split(/\r?\n/).forEach((line) => {
            const at = line.indexOf('=');
            if (at > 0)
               fields[line.slice(0, at).trim()] = line.slice(at + 1).trim();
         });
         const sum = statementNumber(fields['Сумма']);
         if (Number.isNaN(sum)) return [];
         const outgoing =
            !!own &&
            (fields['ПлательщикСчет'] ?? '').replace(/\s/g, '') === own;
         const partyAccount = outgoing
            ? fields['ПолучательСчет'] || fields['ПолучательРасчСчет'] || ''
            : fields['ПлательщикСчет'] || fields['ПлательщикРасчСчет'] || '';
         return [
            {
               date: statementDate(
                  fields['ДатаСписано'] ||
                     fields['ДатаПоступило'] ||
                     fields['Дата'] ||
                     '',
               ),
               party: outgoing
                  ? fields['Получатель1'] || fields['Получатель'] || ''
                  : fields['Плательщик1'] || fields['Плательщик'] || '',
               purpose: fields['НазначениеПлатежа'] ?? '',
               amount: outgoing ? -sum : sum,
               partyAccount: partyAccount.replace(/\s/g, ''),
            },
         ];
      })
      .filter((row) => row.date && row.amount);
};

// a line of a CSV, with quoted cells that may hold the separator
const cellsOf = (line: string, separator: string) => {
   const cells: string[] = [];
   let current = '';
   let quoted = false;
   for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (char === '"') {
         if (quoted && line[index + 1] === '"') {
            current += '"';
            index++;
         } else quoted = !quoted;
      } else if (char === separator && !quoted) {
         cells.push(current);
         current = '';
      } else current += char;
   }
   cells.push(current);
   return cells.map((cell) => cell.trim());
};

/* The operations of a statement: a CSV or Excel saved as CSV («Дата;
   Контрагент; Назначение; Сумма», or «Дебет» and «Кредит» in place of the
   sum, in Russian, Uzbek or English), or 1С's .txt exchange with a client
   bank, where the account's own number tells money out from money in. */
export const parseStatement = (text: string, ownNumber = '') => {
   if (/1CClientBankExchange|СекцияДокумент/i.test(text))
      return parseClientBank(text, ownNumber);
   const lines = text.split(/\r?\n/).filter((line) => line.trim());
   const first = lines[0] ?? '';
   const separator = first.includes(';')
      ? ';'
      : first.includes('\t')
        ? '\t'
        : ',';
   const head = cellsOf(first, separator).map((cell) => cell.toLowerCase());
   const column = (pattern: RegExp) =>
      head.findIndex((cell) => pattern.test(cell));
   let date = column(/дата|date|sana/);
   let party = column(
      /контрагент|получатель|плательщик|counterparty|party|kontragent/,
   );
   let purpose = column(/назначение|purpose|описание|description|maqsad|izoh/);
   let amount = column(/сумма|amount|summa/);
   // the counterparty's account, when the bank gives it a column
   const partyAccount = column(
      /сч[её]т (контрагента|получателя|плательщика)|counterparty account|kontragent hisob/,
   );
   const debit = column(/дебет|debit|расход|списан|chiqim/);
   const credit = column(/кредит|credit|приход|поступ|kirim/);
   const headed = date > -1 && (amount > -1 || debit > -1);
   if (!headed) {
      date = 0;
      party = 1;
      purpose = 2;
      amount = 3;
   }
   return lines.slice(headed ? 1 : 0).flatMap((line): StatementRow[] => {
      const cells = cellsOf(line, separator);
      const sum =
         amount > -1
            ? statementNumber(cells[amount])
            : (statementNumber(cells[credit]) || 0) -
              (statementNumber(cells[debit]) || 0);
      const day = statementDate(cells[date]);
      if (!day || Number.isNaN(sum) || !sum) return [];
      return [
         {
            date: day,
            party: party > -1 ? (cells[party] ?? '') : '',
            purpose: purpose > -1 ? (cells[purpose] ?? '') : '',
            amount: Math.round(sum * 100) / 100,
            partyAccount:
               partyAccount > -1
                  ? (cells[partyAccount] ?? '').replace(/\s/g, '')
                  : '',
         },
      ];
   });
};

// Reads a file as UTF-8, or as Windows-1251 when UTF-8 leaves it broken,
// as statements from older banking software are.
export const readStatementFile = async (file: File) => {
   const buffer = await file.arrayBuffer();
   const utf = new TextDecoder('utf-8').decode(buffer);
   return utf.includes('�')
      ? new TextDecoder('windows-1251').decode(buffer)
      : utf;
};

// The same operation saved before: an account, a day, a sum and a counterparty.
export const duplicateKey = (row: StatementRow, accountId: string) =>
   [
      accountId,
      row.date,
      row.amount.toFixed(2),
      row.party.trim().toLowerCase(),
   ].join('|');

// The keys of the operations saved: a statement's rows are looked up in them.
export const savedKeys = (transactions: FinTransaction[]) =>
   new Set(transactions.map((one) => duplicateKey(one, one.accountId)));

// ---- line items

export const categoryName = (
   category: FinCategory | undefined,
   language: string,
) =>
   category
      ? category.names[language as SupportedLanguageType] || category.names.ru
      : '';

// The line items an operation may take: the ones of its direction.
export const categoriesFor = (
   categories: FinCategory[],
   amount: number,
   current = '',
) =>
   categories.filter(
      (category) =>
         category.key === current ||
         (category.active &&
            (category.flow === 'both' ||
               !amount ||
               category.flow === (amount > 0 ? 'in' : 'out'))),
   );

const digits = (value: string) => value.replace(/\D/g, '');

/* The line item the rules give an operation: money to or from another of
   the fund's own accounts is a transfer; then the first rule whose text the
   counterparty or the purpose holds, of the operation's direction; a bank's
   own fee is known by the word «комиссия». */
export const autoCategory = (
   row: Pick<StatementRow, 'party' | 'purpose' | 'amount'> &
      Partial<Pick<StatementRow, 'partyAccount'>>,
   rules: FinRule[],
   categories: FinCategory[],
   ownAccounts: string[] = [], // the fund's account numbers
) => {
   const text = `${row.party} ${row.purpose}`.toLowerCase();
   const allowed = new Set(
      categoriesFor(categories, row.amount).map(({ key }) => key),
   );
   const party = digits(row.partyAccount ?? '');
   if (
      party &&
      allowed.has(TRANSFER) &&
      ownAccounts.some((number) => digits(number) === party)
   )
      return TRANSFER;
   const rule = rules.find(
      ({ match, category }) =>
         match.trim() &&
         allowed.has(category) &&
         text.includes(match.trim().toLowerCase()),
   );
   if (rule) return rule.category;
   return row.amount < 0 &&
      /комисси|komissiya|commission/.test(text) &&
      allowed.has('bank_fee')
      ? 'bank_fee'
      : '';
};

/* The deal an investment or an exit is about: the one whose company's name
   the counterparty or the purpose holds («Транш Paxta Link по договору…»),
   the longest name first, so «Paxta Link Pro» wins over «Paxta Link». */
export const autoDeal = (
   row: Pick<StatementRow, 'party' | 'purpose'>,
   deals: FinDeal[],
) => {
   const text = `${row.party} ${row.purpose}`.toLowerCase();
   return (
      [...deals]
         .filter(({ company }) => company.trim().length >= 3)
         .sort((a, b) => b.company.length - a.company.length)
         .find(({ company }) => text.includes(company.trim().toLowerCase()))
         ?.id ?? ''
   );
};

// Whether a line item is about the portfolio: an investment or an exit.
export const isInvesting = (category: FinCategory | undefined) =>
   category?.cash === 'investing';

// ---- periods

export interface PeriodColumn {
   key: string; // '2026-03' or '2026-Q1'
   label: string;
   months: string[]; // 'YYYY-MM'
}

// The months of a year up to the current one: a report runs to today.
export const monthsOfYear = (year: number, today = todayISO()) => {
   const now = dayjs(today);
   const last =
      year < now.year() ? 12 : year > now.year() ? 0 : now.month() + 1;
   return Array.from(
      { length: last },
      (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`,
   );
};

export const periodColumns = (
   months: string[],
   period: FinPeriod,
): PeriodColumn[] => {
   if (period === 'month')
      return months.map((month) => ({
         key: month,
         label: dayjs(`${month}-01`).format('MMM'),
         months: [month],
      }));
   const quarters = new Map<string, string[]>();
   months.forEach((month) => {
      const key = `${month.slice(0, 4)}-Q${Math.ceil(Number(month.slice(5)) / 3)}`;
      quarters.set(key, [...(quarters.get(key) ?? []), month]);
   });
   return [...quarters].map(([key, list]) => ({
      key,
      label: key.slice(5),
      months: list,
   }));
};

// The years the operations reach, and the current one, newest first.
export const yearsOf = (transactions: FinTransaction[], today = todayISO()) =>
   [
      ...new Set([
         Number(today.slice(0, 4)),
         ...transactions.map(({ date }) => Number(date.slice(0, 4))),
      ]),
   ]
      .filter(Boolean)
      .sort((a, b) => b - a);

// The currencies of the fund's accounts, the dollar first.
export const currenciesOf = (accounts: FinAccount[]) =>
   [...new Set(accounts.map(({ currency }) => currency || 'USD'))].sort(
      (a, b) => (a === 'USD' ? -1 : b === 'USD' ? 1 : a.localeCompare(b)),
   );

// ---- the reports

// The operations of one currency's accounts, from each account's opening day.
export const inCurrency = (
   transactions: FinTransaction[],
   accounts: FinAccount[],
   currency: string,
) => {
   const own = new Map(
      accounts
         .filter((account) => (account.currency || 'USD') === currency)
         .map((account) => [account.id, account]),
   );
   return transactions.filter((one) => {
      const account = own.get(one.accountId);
      return (
         !!account && (!account.openingDate || one.date >= account.openingDate)
      );
   });
};

// Sums of the operations by line item and month: sums.get(key)?.get(month)
export const sumsByMonth = (transactions: FinTransaction[]) => {
   const sums = new Map<string, Map<string, number>>();
   transactions.forEach(({ category, date, amount }) => {
      const key = category || '';
      const byMonth = sums.get(key) ?? new Map<string, number>();
      const month = date.slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + amount);
      sums.set(key, byMonth);
   });
   return sums;
};

export const sumOf = (
   sums: Map<string, Map<string, number>>,
   keys: string[],
   months: string[],
) =>
   keys.reduce(
      (total, key) =>
         total +
         months.reduce(
            (sum, month) => sum + (sums.get(key)?.get(month) ?? 0),
            0,
         ),
      0,
   );

// The money on the accounts of a currency before a day: the opening balances
// and every operation before it.
export const balanceBefore = (
   day: string,
   transactions: FinTransaction[],
   accounts: FinAccount[],
   currency: string,
) =>
   accounts
      .filter((account) => (account.currency || 'USD') === currency)
      .reduce((sum, { openingBalance }) => sum + openingBalance, 0) +
   inCurrency(transactions, accounts, currency)
      .filter(({ date }) => date < day)
      .reduce((sum, { amount }) => sum + amount, 0);

// The balance of one account now: its opening and its operations since.
export const accountBalance = (
   account: FinAccount,
   transactions: FinTransaction[],
) =>
   account.openingBalance +
   transactions
      .filter(
         ({ accountId, date }) =>
            accountId === account.id &&
            (!account.openingDate || date >= account.openingDate),
      )
      .reduce((sum, { amount }) => sum + amount, 0);

// 1 234 567 → «1 234 567», −1 234 → «−1 234», with the currency's sign
export const formatSum = (
   value: number,
   currency: string,
   language: string,
   signed = false,
) => {
   const figure = new Intl.NumberFormat(language, {
      maximumFractionDigits: Math.abs(value) < 100 && value % 1 ? 2 : 0,
   }).format(Math.abs(value));
   const sign = value < 0 ? '−' : signed && value > 0 ? '+' : '';
   if (currency === 'USD') return `${sign}$${figure}`;
   if (currency === 'EUR') return `${sign}€${figure}`;
   return `${sign}${figure} ${currency}`;
};

// A sum as short as a tile writes it: $850, $150K, −$2.45M
export const formatShort = (value: number, currency: string) => {
   const abs = Math.abs(value);
   const short =
      abs >= 1_000_000
         ? `${Number((abs / 1_000_000).toFixed(2))}M`
         : abs >= 1000
           ? `${Number((abs / 1000).toFixed(1))}K`
           : `${Math.round(abs)}`;
   const sign = value < 0 ? '−' : '';
   if (currency === 'USD') return `${sign}$${short}`;
   if (currency === 'EUR') return `${sign}€${short}`;
   return `${sign}${short} ${currency}`;
};

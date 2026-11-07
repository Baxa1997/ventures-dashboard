/* Финансы (docs/ucode-migration.md, batch 27): the fund's bank accounts,
   their operations from bank statements or entered by hand, the line items
   («статьи») the operations are sorted into, and the rules that sort them.
   P&L and Cash Flow are counted from the sorted operations. */

// Where an operation of the line item may go: money in, out, or either.
export type FinFlow = 'in' | 'out' | 'both';

// Its place in P&L: income, expense, or not there (capital, transfers).
export type FinPnl = 'income' | 'expense' | 'none';

// Its group in Cash Flow; 'none' leaves it out (transfers between accounts).
export type FinCash = 'operating' | 'investing' | 'financing' | 'none';

export interface FinCategory {
   id: string; // the ucode row, '' while it is a built-in one
   key: string; // the slug operations and rules keep
   names: Record<'ru' | 'uz' | 'en', string>;
   flow: FinFlow;
   pnl: FinPnl;
   cash: FinCash;
   budgets: Record<string, number>; // a year's budget, a positive sum: {"2026": 900000}
   active: boolean;
   system: boolean; // the panel's logic names it: its kind stays
   sortOrder: number;
}

export interface FinAccount {
   id: string;
   name: string; // «Основной счёт»
   bank: string;
   number: string;
   currency: string; // USD, UZS, EUR
   openingBalance: number; // on the opening date, before its operations
   openingDate: string;
   active: boolean;
   sortOrder: number;
}

export interface FinTransaction {
   id: string;
   date: string;
   accountId: string;
   party: string; // the counterparty
   purpose: string; // «назначение платежа»
   amount: number; // signed, in the account's currency: minus is money out
   category: string; // a line item's key, '' while not sorted
   note: string;
   // the deal (the portfolio company) an investment went to or an exit came
   // from, '' for the rest
   dealId: string;
   partyAccount: string; // the counterparty's account, as a 1С statement gives it
   importId: string; // the statement it came from, '' when entered by hand
   createdBy: string;
}

export type FinTransactionInput = Omit<
   FinTransaction,
   'id' | 'importId' | 'createdBy'
>;

export interface FinImport {
   id: string;
   fileName: string;
   accountId: string;
   date: string;
   count: number;
   byId: string;
}

export interface FinRule {
   id: string;
   match: string; // text in the counterparty or the purpose
   category: string;
   sortOrder: number;
}

// An operation read from a statement, before it is saved.
export interface StatementRow {
   date: string;
   party: string;
   purpose: string;
   amount: number;
   partyAccount: string; // '' when the statement does not give it
}

// A deal an investment operation may be tied to.
export interface FinDeal {
   id: string;
   company: string;
   portfolio: boolean; // in the portfolio, or still in work
}

export interface FinanceState {
   accounts: FinAccount[];
   categories: FinCategory[]; // in their order, the built-in ones while the table is empty
   categoriesStored: boolean; // the table has rows: changes go there
   transactions: FinTransaction[]; // newest first
   imports: FinImport[]; // newest first
   rules: FinRule[];
   stored: boolean; // ucode has batch 27's tables
   deals: FinDeal[]; // the portfolio's and those in work, for investments
}

// Months or quarters as the columns of P&L and Cash Flow.
export type FinPeriod = 'month' | 'quarter';

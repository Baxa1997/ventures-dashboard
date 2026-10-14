// Финансы: the fund's money from the bank statements, payments for deals,
// the budget and the financial reporting.

export interface Account {
   id: string;
   name: string; // Расчётный счёт · сум
   count: number; // accounts or cards behind the line
   note: string; // what the statement says about it
   balance: number | null; // млн сум; null when the statement came empty
   usd: number; // the balance in dollars at the rate of the statement's day
}

export type PaymentStatus = 'waiting' | 'sent' | 'paid';

export interface PaymentBasis {
   id: string;
   text: string;
   done: boolean;
}

export interface Payment {
   id: string;
   title: string;
   dealId?: string;
   amount: number; // USD
   condition: string; // when it may go, besides the bases
   due: string; // YYYY-MM-DD
   bases: PaymentBasis[];
   status: PaymentStatus;
   sentAt: string | null;
}

export type ReportStatus =
   | 'not_started'
   | 'draft'
   | 'review'
   | 'director'
   | 'approved'
   | 'filed'
   | 'archive';

export interface FinanceReport {
   id: string;
   title: string;
   authority: string; // where it goes, or who must agree it
   file: string | null;
   period: string;
   due: string; // as the accountant writes it: "до 20 октября", "к заседанию НС"
   status: ReportStatus;
   ownerId: string;
}

export type FlowGroup = 'income' | 'expense';

// A line of the budget; the fact is the sum of its categories of operations.
export interface BudgetLine {
   id: string;
   group: FlowGroup;
   title: string;
   plan: number; // млн сум a year
}

// A category of the operations in the statements (Статьи и правила).
export interface Category {
   id: string;
   group: FlowGroup;
   title: string;
   lineId: string; // the budget line it counts towards
   quarter: number; // млн сум in the current quarter, expenses negative
   total: number; // млн сум since the start of the year
}

export interface Operation {
   id: string;
   title: string;
   detail: string;
   amount: number; // млн сум, expenses negative
   month: string; // YYYY-MM
   note: string;
   warning: boolean; // the note asks for a decision
   suggested: string | null; // the category a rule proposes
   categoryId: string | null; // set once somebody assigns it
}

export type CashFlowKey =
   'opening' | 'operating' | 'investing' | 'financing' | 'fx';

export interface FinanceState {
   capital: number; // USD
   rate: number; // сум per dollar on the day of the last statement
   statementDate: string; // YYYY-MM-DD
   accounts: Account[];
   payments: Payment[];
   reserves: { title: string; amount: number; note: string }[];
   plan: { year: number; directDeals: number };
   reports: FinanceReport[];
   budget: BudgetLine[];
   budgetFile: string | null;
   categories: Category[];
   monthly: { month: string; income: number; expense: number }[];
   operations: Operation[];
   hiddenOperations: number; // waiting operations the sample does not list
   cashFlow: { key: CashFlowKey; note: string; amount: number }[];
   balance: { other: number; liabilities: number; reconciled: boolean };
   uploads: { name: string; date: string }[];
}

export interface NewPaymentInput {
   title: string;
   dealId?: string;
   amount: number;
   due: string;
   condition: string;
   bases: string[];
}

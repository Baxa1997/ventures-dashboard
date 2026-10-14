import { formatNumber } from '@shared/helpers';
import type { Category, FinanceState } from '@shared/types/finance.types';

/* Everything the finance pages show is counted here from the statements'
   data, so an operation that gets its category moves the P&L, the budget's
   fact and the money left for operating costs at once. */

// What an operation with a category adds to it.
const assignedTo = (
   state: FinanceState,
   categoryId: string,
   quarter: boolean,
) =>
   state.operations
      .filter(
         (operation) =>
            operation.categoryId === categoryId &&
            (!quarter || operation.month >= '2026-07'),
      )
      .reduce((sum, { amount }) => sum + amount, 0);

export const categoryAmount = (
   state: FinanceState,
   category: Category,
   quarter: boolean,
) =>
   (quarter ? category.quarter : category.total) +
   assignedTo(state, category.id, quarter);

export const groupTotal = (
   state: FinanceState,
   group: Category['group'],
   quarter: boolean,
) =>
   state.categories
      .filter((category) => category.group === group)
      .reduce(
         (sum, category) => sum + categoryAmount(state, category, quarter),
         0,
      );

// The fact of a budget line since the start of the year, as a positive figure.
export const lineFact = (state: FinanceState, lineId: string) =>
   Math.abs(
      state.categories
         .filter((category) => category.lineId === lineId)
         .reduce(
            (sum, category) => sum + categoryAmount(state, category, false),
            0,
         ),
   );

export const budgetPlan = (state: FinanceState, group: Category['group']) =>
   state.budget
      .filter((line) => line.group === group)
      .reduce((sum, { plan }) => sum + plan, 0);

// The operating budget left for the rest of the year, in млн сум.
export const operatingLeft = (state: FinanceState) =>
   Math.max(
      0,
      budgetPlan(state, 'expense') -
         Math.abs(groupTotal(state, 'expense', false)),
   );

// млн сум → dollars at the statement's rate, to the thousand
export const toUsd = (state: FinanceState, millions: number, step = 1000) =>
   Math.round((millions * 1_000_000) / state.rate / step) * step;

export const monthlyBars = (state: FinanceState) =>
   state.monthly.map((month) => ({
      ...month,
      expense:
         month.expense +
         Math.abs(
            state.operations
               .filter(
                  ({ categoryId, month: day }) =>
                     categoryId && day === month.month,
               )
               .reduce((sum, { amount }) => sum + Math.min(0, amount), 0),
         ),
   }));

// How many accounts and cards the statements cover.
export const accountCount = (state: FinanceState) =>
   state.accounts.reduce((sum, { count }) => sum + count, 0);

export const waitingOperations = (state: FinanceState) =>
   state.operations.filter(({ categoryId }) => !categoryId);

export const unassignedCount = (state: FinanceState) =>
   waitingOperations(state).length + state.hiddenOperations;

// The money on the accounts and what is already promised from it, in dollars.
export const moneyParts = (state: FinanceState) => {
   const onAccounts = state.accounts.reduce((sum, { usd }) => sum + usd, 0);
   const approved = state.payments
      .filter(({ status }) => status !== 'paid')
      .reduce((sum, { amount }) => sum + amount, 0);
   const reserve = state.reserves.reduce((sum, { amount }) => sum + amount, 0);
   const operating = toUsd(state, operatingLeft(state));
   return {
      onAccounts,
      approved,
      reserve,
      operating,
      free: onAccounts - approved - reserve - operating,
   };
};

// −55,2 · 905 · 0; whole numbers without decimals
export const formatMillions = (value: number, language: string) => {
   const digits = Math.abs(value - Math.round(value)) < 1e-6 ? 0 : 1;
   const text = formatNumber(Math.abs(value), language, digits);
   return value < 0 ? `−${text}` : text;
};

// A figure in the chosen currency: млн сум, or thousands of dollars.
export const inCurrency = (
   state: FinanceState,
   millions: number,
   currency: 'uzs' | 'usd',
) => (currency === 'uzs' ? millions : (millions * 1000) / state.rate);

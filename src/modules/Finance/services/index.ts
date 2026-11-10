import deals from '@modules/Deals/services';
import settings from '@modules/Settings/services';
import {
   createRow,
   day,
   deleteRow,
   fromJson,
   listRows,
   num,
   type Row,
   str,
   toJson,
   updateRow,
} from '@shared/api/ucode';
import { createStore, newId, todayISO } from '@shared/helpers';
import type {
   FinAccount,
   FinanceState,
   FinCash,
   FinCategory,
   FinDeal,
   FinFlow,
   FinImport,
   FinPnl,
   FinRule,
   FinTransaction,
   FinTransactionInput,
   StatementRow,
} from '@shared/types/finance.types';
import { BUILT_IN_CATEGORIES } from '../constants';
import { autoCategory, autoDeal, inCurrency, isInvesting } from '../helpers';

// the counterparty of an operation that sets a report's figure by hand
export const ADJUSTMENT = 'Корректировка';

/* Финансы in ucode (docs/ucode-migration.md, batch 27): fin_accounts,
   fin_categories, fin_transactions, fin_imports and fin_rules. `stored` is
   false until the batch has made the tables: the pages say so and offer
   nothing to save. The line items are the built-in ones while their table
   is empty; the first change writes them all. What changes the books —
   a statement loaded or deleted, an operation entered, changed or deleted,
   an account, a line item, a budget, a rule — goes to Настройки → Журнал
   изменений; sorting an operation into a line item does not, it is the
   daily work. */

const FLOWS: FinFlow[] = ['in', 'out', 'both'];
const PNL: FinPnl[] = ['income', 'expense', 'none'];
const CASH: FinCash[] = ['operating', 'investing', 'financing', 'none'];
const oneOf = <T extends string>(value: unknown, list: T[], fallback: T) =>
   list.includes(str(value) as T) ? (str(value) as T) : fallback;

const bySort = (a: Row, b: Row) => num(a.sort_order) - num(b.sort_order);
const newestFirst = (a: Row, b: Row) =>
   str(b.created_at).localeCompare(str(a.created_at));

const toAccount = (row: Row): FinAccount => ({
   id: row.guid,
   name: str(row.name),
   bank: str(row.bank),
   number: str(row.number),
   currency: str(row.currency) || 'USD',
   openingBalance: num(row.opening_balance),
   openingDate: day(row.opening_date),
   active: row.is_active !== false,
   sortOrder: num(row.sort_order),
});

const accountRow = (account: Omit<FinAccount, 'id'>) => ({
   name: account.name,
   bank: account.bank,
   number: account.number,
   currency: account.currency,
   opening_balance: account.openingBalance,
   opening_date: account.openingDate || null,
   is_active: account.active,
   sort_order: account.sortOrder,
});

const toCategory = (row: Row): FinCategory => ({
   id: row.guid,
   key: str(row.slug),
   names: {
      ru: str(row.name_ru),
      uz: str(row.name_uz) || str(row.name_ru),
      en: str(row.name_en) || str(row.name_ru),
   },
   flow: oneOf(row.flow, FLOWS, 'both'),
   pnl: oneOf(row.pnl, PNL, 'none'),
   cash: oneOf(row.cash, CASH, 'none'),
   budgets: fromJson<Record<string, number>>(row.budgets, {}),
   active: row.is_active !== false,
   system: row.is_system === true,
   sortOrder: num(row.sort_order),
});

const categoryRow = (category: FinCategory) => ({
   slug: category.key,
   name_ru: category.names.ru,
   name_uz: category.names.uz,
   name_en: category.names.en,
   flow: category.flow,
   pnl: category.pnl,
   cash: category.cash,
   budgets: toJson(category.budgets),
   is_active: category.active,
   is_system: category.system,
   sort_order: category.sortOrder,
});

const toTransaction = (row: Row): FinTransaction => ({
   id: row.guid,
   date: day(row.op_date) || day(row.created_at),
   accountId: str(row.account_id),
   party: str(row.party),
   purpose: str(row.purpose),
   amount: num(row.amount),
   category: str(row.category),
   note: str(row.note),
   dealId: str(row.deal_id),
   partyAccount: str(row.party_account),
   importId: str(row.import_id),
   createdBy: str(row.created_by),
});

const transactionRow = (one: Omit<FinTransaction, 'id'>) => ({
   op_date: one.date || null,
   account_id: one.accountId,
   party: one.party,
   purpose: one.purpose,
   amount: one.amount,
   category: one.category,
   note: one.note,
   deal_id: one.dealId,
   party_account: one.partyAccount,
   import_id: one.importId,
   created_by: one.createdBy,
});

const toImport = (row: Row): FinImport => ({
   id: row.guid,
   fileName: str(row.file_name),
   accountId: str(row.account_id),
   date: day(row.imported_on) || day(row.created_at),
   count: num(row.rows_count),
   byId: str(row.by_id),
});

const toRule = (row: Row): FinRule => ({
   id: row.guid,
   match: str(row.match_text),
   category: str(row.category),
   sortOrder: num(row.sort_order),
});

// newest day first; the same day, the one saved last first
const byDate = (a: FinTransaction, b: FinTransaction) =>
   b.date.localeCompare(a.date);

// The deals an investment may go to: the portfolio's, then those in work.
const dealsOf = async (): Promise<FinDeal[]> =>
   (await deals.getDeals().catch(() => []))
      .filter(({ status }) => status === 'portfolio' || status === 'active')
      .map((deal) => ({
         id: deal.id,
         company: deal.company,
         portfolio: deal.status === 'portfolio',
      }))
      .sort(
         (a, b) =>
            Number(b.portfolio) - Number(a.portfolio) ||
            a.company.localeCompare(b.company),
      );

const store = createStore<FinanceState>(async () => {
   const [[accounts, categories, transactions, imports, rules], dealList] =
      await Promise.all([
         Promise.all(
            [
               'fin_accounts',
               'fin_categories',
               'fin_transactions',
               'fin_imports',
               'fin_rules',
            ].map((table) => listRows(table).catch(() => null)),
         ),
         dealsOf(),
      ]);
   const stored = transactions !== null && accounts !== null;
   const ownCategories = (categories ?? []).sort(bySort).map(toCategory);
   return {
      accounts: (accounts ?? []).sort(bySort).map(toAccount),
      categories: ownCategories.length ? ownCategories : BUILT_IN_CATEGORIES,
      categoriesStored: ownCategories.length > 0,
      transactions: (transactions ?? [])
         .sort(newestFirst)
         .map(toTransaction)
         .sort(byDate),
      imports: (imports ?? []).sort(newestFirst).map(toImport),
      rules: (rules ?? []).sort(bySort).map(toRule),
      stored,
      deals: dealList,
   };
});

// Writes many rows a few at a time, so a long statement does not flood ucode.
const inBatches = async <T>(
   items: T[],
   write: (item: T) => Promise<unknown>,
) => {
   for (let at = 0; at < items.length; at += 8)
      await Promise.all(items.slice(at, at + 8).map(write));
};

// The journal's line for a change in Финансы.
const log = (userId: string, what: string, from: string, to: string) =>
   settings.log(userId, `Финансы · ${what}`, from, to);

const money = (amount: number, currency = '') =>
   `${amount > 0 ? '+' : ''}${amount}${currency ? ` ${currency}` : ''}`;

const accountText = (account: Omit<FinAccount, 'id' | 'sortOrder'>) =>
   [
      account.name,
      account.bank,
      account.number,
      account.currency,
      `${account.openingBalance} на ${account.openingDate || '—'}`,
      account.active ? '' : 'закрыт',
   ]
      .filter(Boolean)
      .join(' · ');

const categoryText = (category: FinCategory) =>
   [
      category.names.ru,
      category.flow,
      `P&L: ${category.pnl}`,
      `Cash Flow: ${category.cash}`,
      category.active ? '' : 'выключена',
   ]
      .filter(Boolean)
      .join(' · ');

const operationText = (one: Omit<FinTransaction, 'id'>, state: FinanceState) =>
   [
      one.date,
      one.party,
      money(
         one.amount,
         state.accounts.find(({ id }) => id === one.accountId)?.currency,
      ),
      state.categories.find(({ key }) => key === one.category)?.names.ru ||
         'не разнесено',
      one.note,
   ]
      .filter(Boolean)
      .join(' · ');

class FinanceService {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   getState() {
      return store.get();
   }

   // ---- accounts

   async saveAccount(
      id: string | null,
      input: Omit<FinAccount, 'id' | 'sortOrder'>,
      userId: string,
   ) {
      const { accounts } = await store.get();
      if (id) {
         const before = accounts.find((account) => account.id === id);
         if (!before) return;
         const next = { ...before, ...input };
         await updateRow('fin_accounts', { guid: id, ...accountRow(next) });
         await log(
            userId,
            `Счёт · ${next.name}`,
            accountText(before),
            accountText(next),
         );
      } else {
         await createRow('fin_accounts', {
            guid: newId(),
            ...accountRow({
               ...input,
               sortOrder:
                  Math.max(0, ...accounts.map(({ sortOrder }) => sortOrder)) +
                  1,
            }),
         });
         await log(userId, `Счёт · ${input.name}`, '', accountText(input));
      }
      await store.reload();
   }

   // An account with operations is turned off, not deleted: they keep it.
   async removeAccount(id: string, userId: string) {
      const account = (await store.get()).accounts.find((one) => one.id === id);
      await deleteRow('fin_accounts', id);
      if (account)
         await log(
            userId,
            `Счёт · ${account.name}`,
            accountText(account),
            'удалён',
         );
      await store.reload();
   }

   // ---- line items

   /* Writes the built-in line items into their table the first time one is
      changed, so every change after it has a row to go to. */
   private async ownCategories() {
      const state = await store.get();
      if (state.categoriesStored) return state.categories;
      await inBatches(state.categories, (category) =>
         createRow('fin_categories', {
            guid: newId(),
            ...categoryRow(category),
         }),
      );
      return (await store.reload()).categories;
   }

   async saveCategory(
      key: string | null,
      patch: Partial<FinCategory>,
      userId: string,
   ) {
      const categories = await this.ownCategories();
      if (key) {
         const before = categories.find((category) => category.key === key);
         if (!before) return;
         // the transfers' item keeps its kind: the reports leave it out
         const next = before.system
            ? {
                 ...before,
                 ...patch,
                 key: before.key,
                 flow: before.flow,
                 pnl: before.pnl,
                 cash: before.cash,
              }
            : { ...before, ...patch, key: before.key };
         await updateRow('fin_categories', {
            guid: before.id,
            ...categoryRow(next),
         });
         // a budget has its own line in the journal (setBudget)
         if (!patch.budgets)
            await log(
               userId,
               `Статья · ${next.names.ru}`,
               categoryText(before),
               categoryText(next),
            );
      } else {
         const category: FinCategory = {
            id: '',
            key: patch.key ?? `item_${newId().slice(0, 8)}`,
            names: patch.names ?? { ru: '', uz: '', en: '' },
            flow: patch.flow ?? 'out',
            pnl: patch.pnl ?? 'expense',
            cash: patch.cash ?? 'operating',
            budgets: {},
            active: true,
            system: false,
            sortOrder:
               Math.max(0, ...categories.map(({ sortOrder }) => sortOrder)) + 1,
         };
         await createRow('fin_categories', {
            guid: newId(),
            ...categoryRow(category),
         });
         await log(
            userId,
            `Статья · ${category.names.ru}`,
            '',
            categoryText(category),
         );
      }
      await store.reload();
   }

   async setBudget(key: string, year: number, amount: number, userId: string) {
      const category = (await store.get()).categories.find(
         (one) => one.key === key,
      );
      if (!category) return;
      const before = category.budgets[String(year)] ?? 0;
      const next = Math.abs(amount);
      if (before === next) return;
      const budgets = { ...category.budgets };
      if (next) budgets[String(year)] = next;
      else delete budgets[String(year)];
      await this.saveCategory(key, { budgets }, userId);
      await log(
         userId,
         `Бюджет ${year} · ${category.names.ru}`,
         before ? String(before) : '',
         next ? String(next) : '',
      );
   }

   // How many operations and rules name a line item: one that is used is
   // turned off rather than deleted.
   async categoryUsage(key: string) {
      const { transactions, rules } = await store.get();
      return (
         transactions.filter(({ category }) => category === key).length +
         rules.filter(({ category }) => category === key).length
      );
   }

   async removeCategory(key: string, userId: string) {
      const categories = await this.ownCategories();
      const category = categories.find((one) => one.key === key);
      if (!category || category.system) return;
      await deleteRow('fin_categories', category.id);
      await log(
         userId,
         `Статья · ${category.names.ru}`,
         categoryText(category),
         'удалена',
      );
      await store.reload();
   }

   // ---- operations

   async saveTransaction(
      id: string | null,
      input: FinTransactionInput,
      userId: string,
   ) {
      const state = await store.get();
      // an operation about the portfolio keeps its deal; the rest have none
      const dealOf = (category: string, dealId: string) =>
         isInvesting(state.categories.find(({ key }) => key === category))
            ? dealId
            : '';
      if (id) {
         const before = state.transactions.find((one) => one.id === id);
         if (!before) return;
         // a statement's date, sum, account and counterparty stay as the bank wrote them
         const next = before.importId
            ? {
                 ...before,
                 category: input.category,
                 note: input.note,
                 dealId: dealOf(input.category, input.dealId),
              }
            : {
                 ...before,
                 ...input,
                 dealId: dealOf(input.category, input.dealId),
              };
         await updateRow('fin_transactions', {
            guid: id,
            ...transactionRow(next),
         });
         // a statement's operation sorted or noted is daily work, not a change of the books
         if (!before.importId)
            await log(
               userId,
               'Операция вручную',
               operationText(before, state),
               operationText(next, state),
            );
      } else {
         const one = {
            ...input,
            dealId: dealOf(input.category, input.dealId),
            importId: '',
            createdBy: userId,
         };
         await createRow('fin_transactions', {
            guid: newId(),
            ...transactionRow(one),
         });
         await log(userId, 'Операция вручную', '', operationText(one, state));
      }
      await store.reload();
   }

   /* Sorts an operation into a line item where it stands; one about the
      portfolio gets the deal its text names, if it has none. */
   async setCategory(id: string, category: string) {
      const state = await store.get();
      const one = state.transactions.find((item) => item.id === id);
      if (!one) return;
      const investing = isInvesting(
         state.categories.find(({ key }) => key === category),
      );
      const dealId = investing ? one.dealId || autoDeal(one, state.deals) : '';
      await updateRow('fin_transactions', {
         guid: id,
         category,
         deal_id: dealId,
      });
      store.set((current) => ({
         ...current,
         transactions: current.transactions.map((item) =>
            item.id === id ? { ...item, category, dealId } : item,
         ),
      }));
   }

   /* A line item's figure for a month in P&L or Cash Flow, typed in the
      report: the difference goes into one «Корректировка» operation of that
      line item, month and currency, made, changed, or removed when it comes
      to nothing. The reports stay sums of operations, and Транзакции lists
      the adjustment. It goes on the currency's first account open that month. */
   async adjust(
      {
         category,
         month,
         currency,
         target,
      }: { category: string; month: string; currency: string; target: number },
      userId: string,
   ) {
      const state = await store.get();
      const counted = inCurrency(state.transactions, state.accounts, currency);
      const ofCell = counted.filter(
         (one) => one.category === category && one.date.startsWith(month),
      );
      const current = ofCell.reduce((sum, { amount }) => sum + amount, 0);
      const difference = Math.round((target - current) * 100) / 100;
      if (!difference) return;
      const existing = ofCell.find(
         (one) => !one.importId && one.party === ADJUSTMENT,
      );
      if (existing) {
         const amount = Math.round((existing.amount + difference) * 100) / 100;
         if (!amount) return this.removeTransaction(existing.id, userId);
         return this.saveTransaction(existing.id, { ...existing, amount }, userId);
      }
      const [year, monthNumber] = month.split('-').map(Number);
      const last = `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}`;
      const open = state.accounts.filter(
         (one) =>
            (one.currency || 'USD') === currency &&
            (!one.openingDate || one.openingDate <= last),
      );
      const account = open.find(({ active }) => active) ?? open[0];
      if (!account)
         throw new Error(`Нет счёта в ${currency}, открытого в этом месяце`);
      return this.saveTransaction(
         null,
         {
            date: last,
            accountId: account.id,
            party: ADJUSTMENT,
            purpose: `Корректировка отчёта за ${month}`,
            amount: difference,
            category,
            note: '',
            dealId: '',
            partyAccount: '',
         },
         userId,
      );
   }

   async removeTransaction(id: string, userId: string) {
      const state = await store.get();
      const one = state.transactions.find((item) => item.id === id);
      await deleteRow('fin_transactions', id);
      if (one)
         await log(
            userId,
            one.importId ? 'Операция из выписки' : 'Операция вручную',
            operationText(one, state),
            'удалена',
         );
      await store.reload();
   }

   // ---- statements

   /* Saves a statement's operations to an account: the ones already saved
      are left out by the dialog. Returns how many were saved. */
   async importStatement(
      accountId: string,
      fileName: string,
      rows: (StatementRow & { category: string; dealId: string })[],
      userId: string,
   ) {
      const state = await store.get();
      const account = state.accounts.find(({ id }) => id === accountId);
      const importId = newId();
      await createRow('fin_imports', {
         guid: importId,
         file_name: fileName,
         account_id: accountId,
         imported_on: todayISO(),
         rows_count: rows.length,
         by_id: userId,
      });
      await inBatches(rows, (row) =>
         createRow('fin_transactions', {
            guid: newId(),
            ...transactionRow({
               ...row,
               accountId,
               note: '',
               importId,
               createdBy: userId,
            }),
         }),
      );
      const sum = rows.reduce((total, { amount }) => total + amount, 0);
      await log(
         userId,
         `Выписка · ${fileName}`,
         '',
         `${rows.length} операций на «${account?.name ?? ''}», сальдо ${money(
            Math.round(sum * 100) / 100,
            account?.currency,
         )}`,
      );
      await store.reload();
      return rows.length;
   }

   // Undoes a statement: its operations go with it.
   async removeImport(id: string, userId: string) {
      const { transactions, imports } = await store.get();
      const statement = imports.find((one) => one.id === id);
      const own = transactions.filter(({ importId }) => importId === id);
      await inBatches(own, (one) => deleteRow('fin_transactions', one.id));
      await deleteRow('fin_imports', id);
      if (statement)
         await log(
            userId,
            `Выписка · ${statement.fileName}`,
            `${own.length} операций`,
            'удалена с операциями',
         );
      await store.reload();
   }

   // ---- rules

   async saveRule(
      id: string | null,
      patch: Partial<Omit<FinRule, 'id'>>,
      userId: string,
   ) {
      const { rules } = await store.get();
      const text = (rule: Pick<FinRule, 'match' | 'category'>) =>
         `«${rule.match}» → ${rule.category}`;
      if (id) {
         const before = rules.find((rule) => rule.id === id);
         if (!before) return;
         const next = { ...before, ...patch };
         await updateRow('fin_rules', {
            guid: id,
            match_text: next.match,
            category: next.category,
         });
         await log(userId, 'Правило разнесения', text(before), text(next));
      } else {
         const next = {
            match: patch.match ?? '',
            category: patch.category ?? '',
         };
         await createRow('fin_rules', {
            guid: newId(),
            match_text: next.match,
            category: next.category,
            sort_order:
               Math.max(0, ...rules.map(({ sortOrder }) => sortOrder)) + 1,
         });
         await log(userId, 'Правило разнесения', '', text(next));
      }
      await store.reload();
   }

   async removeRule(id: string, userId: string) {
      const rule = (await store.get()).rules.find((one) => one.id === id);
      await deleteRow('fin_rules', id);
      if (rule)
         await log(
            userId,
            'Правило разнесения',
            `«${rule.match}» → ${rule.category}`,
            'удалено',
         );
      await store.reload();
   }

   /* Gives the line item to every unsorted operation of the counterparty, as
      «Запомнить» does, and keeps the rule for the next statements. Returns
      how many operations it sorted. */
   async remember(party: string, category: string, userId: string) {
      await this.saveRule(null, { match: party, category }, userId);
      const { transactions } = await store.get();
      const matching = transactions.filter(
         (one) =>
            !one.category &&
            one.party.trim().toLowerCase() === party.trim().toLowerCase(),
      );
      await inBatches(matching, (one) => this.setCategory(one.id, category));
      return matching.length;
   }

   // Sorts every unsorted operation the rules know. Returns how many.
   async applyRules() {
      const { transactions, rules, categories, accounts } = await store.get();
      const numbers = accounts.map(({ number }) => number);
      const sorted = transactions.flatMap((one) => {
         if (one.category) return [];
         const category = autoCategory(one, rules, categories, numbers);
         return category ? [{ id: one.id, category }] : [];
      });
      await inBatches(sorted, ({ id, category }) =>
         this.setCategory(id, category),
      );
      return sorted.length;
   }
}

const finance = new FinanceService();

export default finance;

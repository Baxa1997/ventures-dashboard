import { createStore, newId, todayISO } from '@shared/helpers';
import type {
   FinanceState,
   NewPaymentInput,
   ReportStatus,
} from '@shared/types/finance.types';
import { SAMPLE_FINANCE } from './sample';

const store = createStore<FinanceState>(
   'sqbv_dashboard_finance_v1',
   () => SAMPLE_FINANCE,
);

class Finance {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   async getState(): Promise<FinanceState> {
      return store.read();
   }

   // A basis of a payment closes (or opens again).
   async toggleBasis(paymentId: string, basisId: string) {
      store.update((state) => ({
         ...state,
         payments: state.payments.map((payment) =>
            payment.id === paymentId
               ? {
                    ...payment,
                    bases: payment.bases.map((basis) =>
                       basis.id === basisId
                          ? { ...basis, done: !basis.done }
                          : basis,
                    ),
                 }
               : payment,
         ),
      }));
   }

   // The accountant gets the payment order once every basis is closed.
   async sendPayment(id: string) {
      store.update((state) => ({
         ...state,
         payments: state.payments.map((payment) =>
            payment.id === id && payment.bases.every(({ done }) => done)
               ? { ...payment, status: 'sent', sentAt: todayISO() }
               : payment,
         ),
      }));
   }

   async markPaid(id: string) {
      store.update((state) => ({
         ...state,
         payments: state.payments.map((payment) =>
            payment.id === id ? { ...payment, status: 'paid' } : payment,
         ),
      }));
   }

   async createPayment(input: NewPaymentInput) {
      store.update((state) => ({
         ...state,
         payments: [
            ...state.payments,
            {
               id: newId(),
               title: input.title,
               dealId: input.dealId,
               amount: input.amount,
               condition: input.condition,
               due: input.due,
               bases: input.bases.map((text) => ({
                  id: newId(),
                  text,
                  done: false,
               })),
               status: 'waiting',
               sentAt: null,
            },
         ],
      }));
   }

   // An operation from the statement gets its category and counts in the fact.
   async assignOperation(id: string, categoryId: string) {
      store.update((state) => ({
         ...state,
         operations: state.operations.map((operation) =>
            operation.id === id ? { ...operation, categoryId } : operation,
         ),
      }));
   }

   async uploadStatements(names: string[]) {
      store.update((state) => ({
         ...state,
         uploads: [
            ...names.map((name) => ({ name, date: todayISO() })),
            ...state.uploads,
         ],
      }));
   }

   async uploadBudget(name: string) {
      store.update((state) => ({ ...state, budgetFile: name }));
   }

   async attachReport(id: string, file: string) {
      store.update((state) => ({
         ...state,
         reports: state.reports.map((report) =>
            report.id === id
               ? {
                    ...report,
                    file,
                    status:
                       report.status === 'not_started'
                          ? 'draft'
                          : report.status,
                 }
               : report,
         ),
      }));
   }

   async setReportStatus(id: string, status: ReportStatus) {
      store.update((state) => ({
         ...state,
         reports: state.reports.map((report) =>
            report.id === id ? { ...report, status } : report,
         ),
      }));
   }
}

export default new Finance();

import { createStore, newId, todayISO } from '@shared/helpers';
import type {
   FundDocument,
   GovernanceIssue,
   NewDocumentInput,
} from '@shared/types/documents.types';
import { SAMPLE_DOCUMENTS, SAMPLE_ISSUES, SAMPLE_TOTALS } from './sample';

export interface DocumentsState {
   documents: FundDocument[];
   issues: GovernanceIssue[];
   totals: typeof SAMPLE_TOTALS;
}

const store = createStore<DocumentsState>(
   'sqbv_dashboard_documents_v1',
   () => ({
      documents: SAMPLE_DOCUMENTS,
      issues: SAMPLE_ISSUES,
      totals: SAMPLE_TOTALS,
   }),
);

class Documents {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   async getState(): Promise<DocumentsState> {
      return store.read();
   }

   async addDocument(input: NewDocumentInput): Promise<FundDocument> {
      const document: FundDocument = {
         ...input,
         id: newId(),
         status: input.category === 'orders' ? 'active' : 'draft',
         date: todayISO(),
      };
      store.update((state) => ({
         ...state,
         documents: [document, ...state.documents],
         totals: {
            ...state.totals,
            ...(state.totals[input.category] !== undefined && {
               [input.category]: (state.totals[input.category] ?? 0) + 1,
            }),
         },
      }));
      return document;
   }

   // The next order number of the year: № 3Р → № 4Р.
   async nextOrderNumber() {
      const numbers = store
         .read()
         .documents.filter(({ category }) => category === 'orders')
         .map(({ title }) => Number(/№\s*(\d+)/.exec(title)?.[1] ?? 0));
      return `№ ${Math.max(0, ...numbers) + 1}Р`;
   }
}

export default new Documents();

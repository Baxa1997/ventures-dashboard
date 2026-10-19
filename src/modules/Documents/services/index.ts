import {
   createRow,
   day,
   listRows,
   type Row,
   str,
   updateRow,
} from '@shared/api/ucode';
import { createStore, newId, todayISO } from '@shared/helpers';
import type {
   DocumentInput,
   FundDocument,
   GovernanceIssue,
   IssueInput,
   IssueStatus,
} from '@shared/types/documents.types';

/* Документы фонда in ucode (docs/ucode-migration.md, batch 6): fund_documents
   and governance_issues. A change is written to ucode, then both are read
   again, so the page shows what ucode keeps. */

export interface DocumentsState {
   documents: FundDocument[];
   issues: GovernanceIssue[];
}

const toDocument = (row: Row): FundDocument => ({
   id: row.guid,
   category: (str(row.category) || 'corporate') as FundDocument['category'],
   title: str(row.title),
   note: str(row.note),
   approvedBy: (str(row.approved_by) ||
      'director') as FundDocument['approvedBy'],
   status: (str(row.status) || 'draft') as FundDocument['status'],
   date: day(row.doc_date),
   link: str(row.link),
   createdById: str(row.created_by_id),
});

const toIssue = (row: Row): GovernanceIssue => ({
   id: row.guid,
   title: str(row.title),
   note: str(row.note),
   status: (str(row.status) || 'in_work') as IssueStatus,
   openedAt: day(row.opened_at),
   resolvedAt: day(row.resolved_at),
   ownerId: str(row.owner_id),
});

const documentRow = (input: DocumentInput) => ({
   category: input.category,
   title: input.title,
   note: input.note,
   approved_by: input.approvedBy,
   status: input.status,
   doc_date: input.date || null,
   link: input.link,
});

// Those no longer in force last; otherwise the newest first.
const byStatusAndDate = (a: FundDocument, b: FundDocument) =>
   Number(a.status === 'archived') - Number(b.status === 'archived') ||
   b.date.localeCompare(a.date) ||
   a.title.localeCompare(b.title);

const store = createStore<DocumentsState>(async () => {
   const [documents, issues] = await Promise.all([
      listRows('fund_documents'),
      listRows('governance_issues'),
   ]);
   return {
      documents: documents.map(toDocument).sort(byStatusAndDate),
      issues: issues
         .map(toIssue)
         .sort((a, b) => b.openedAt.localeCompare(a.openedAt)),
   };
});

// "№ 3Р от 30.07.2026" → 3
const orderNumber = (title: string) =>
   Number(/№\s*(\d+)/.exec(title)?.[1] ?? 0);

class Documents {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   async getState(): Promise<DocumentsState> {
      return store.get();
   }

   async addDocument(input: DocumentInput, userId: string) {
      const id = newId();
      await createRow('fund_documents', {
         guid: id,
         ...documentRow(input),
         created_by_id: userId,
      });
      await store.reload();
      return id;
   }

   async updateDocument(id: string, input: DocumentInput) {
      await updateRow('fund_documents', { guid: id, ...documentRow(input) });
      await store.reload();
   }

   // The next order number of this year: № 3Р → № 4Р.
   async nextOrderNumber() {
      const year = todayISO().slice(0, 4);
      const numbers = (await store.get()).documents
         .filter(
            ({ category, date }) =>
               category === 'orders' && date.startsWith(year),
         )
         .map(({ title }) => orderNumber(title));
      return `№ ${Math.max(0, ...numbers) + 1}Р`;
   }

   async addIssue(input: IssueInput) {
      const id = newId();
      await createRow('governance_issues', {
         guid: id,
         title: input.title,
         note: input.note,
         owner_id: input.ownerId,
         status: 'in_work',
         opened_at: todayISO(),
      });
      await store.reload();
      return id;
   }

   async setIssueStatus(id: string, status: IssueStatus) {
      await updateRow('governance_issues', {
         guid: id,
         status,
         resolved_at: status === 'resolved' ? todayISO() : null,
      });
      await store.reload();
   }
}

export default new Documents();

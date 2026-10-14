// Документы фонда: the charter documents, regulations, orders, HR documents
// and templates; one current version of each.

export type DocCategory = 'corporate' | 'orders' | 'hr' | 'templates';

export type DocStatus = 'active' | 'reregistration' | 'updating' | 'draft';

export type Approver = 'participant' | 'board' | 'director';

export interface FundDocument {
   id: string;
   category: DocCategory;
   title: string;
   note: string;
   approvedBy: Approver;
   status: DocStatus;
   date: string | null; // YYYY-MM-DD of the current version, when known
   file: string | null;
}

export interface GovernanceIssue {
   id: string;
   title: string;
   note: string;
   status: 'awaiting_reply' | 'in_work';
}

export interface NewDocumentInput {
   category: DocCategory;
   title: string;
   note: string;
   approvedBy: Approver;
   file: string | null;
}

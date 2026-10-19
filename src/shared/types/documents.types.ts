// Документы фонда: the charter documents, regulations, orders, HR documents
// and templates; one current version of each. A document links to its file
// where the fund keeps it.

export type DocCategory = 'corporate' | 'orders' | 'hr' | 'templates';

// archived: no longer in force
export type DocStatus =
   'active' | 'reregistration' | 'updating' | 'draft' | 'archived';

export type Approver = 'participant' | 'board' | 'director';

export interface FundDocument {
   id: string;
   category: DocCategory;
   title: string;
   note: string;
   approvedBy: Approver;
   status: DocStatus;
   date: string; // YYYY-MM-DD of the current version; '' when not known
   link: string; // where the file is kept; '' when not given
   createdById: string;
}

export type IssueStatus = 'awaiting_reply' | 'in_work' | 'resolved';

export interface GovernanceIssue {
   id: string;
   title: string;
   note: string;
   status: IssueStatus;
   openedAt: string; // YYYY-MM-DD
   resolvedAt: string; // YYYY-MM-DD; '' while open
   ownerId: string;
}

export type DocumentInput = Pick<
   FundDocument,
   'category' | 'title' | 'note' | 'approvedBy' | 'status' | 'date' | 'link'
>;

export type IssueInput = Pick<GovernanceIssue, 'title' | 'note' | 'ownerId'>;

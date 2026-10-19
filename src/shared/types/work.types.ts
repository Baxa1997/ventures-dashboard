// employees.role in ucode.
export type Role =
   | 'director'
   | 'deputy'
   | 'analyst'
   | 'manager'
   | 'accountant'
   | 'assistant'
   | 'ic_secretary'
   | 'lawyer'
   | 'other';

export interface Employee {
   id: string;
   name: string;
   role: Role;
}

// Sections of the platform that work items point to. Финансы, Договоры,
// Закупки, Корреспонденция and Документы join in phase 3.
export type Section =
   'tasks' | 'deals' | 'committee' | 'portfolio' | 'documents';

export type TaskStatus =
   'assigned' | 'in_progress' | 'waiting' | 'postponed' | 'review' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskType =
   | 'acceleration'
   | 'finance'
   | 'reporting'
   | 'correspondence'
   | 'legal'
   | 'portfolio'
   | 'regions'
   | 'other';

// What a task is attached to; "none" for a task that stands on its own.
// Contracts, letters and procurements join in phase 3.
export type TaskRelation = 'none' | 'deal' | 'portfolio';

export type TaskRecurrence = 'none' | 'monthly' | 'quarterly';

export interface ChecklistItem {
   id: string;
   text: string;
   done: boolean;
}

interface TaskEventBase {
   id: string;
   date: string; // YYYY-MM-DD
}

// A line of a task's history. Status changes are worded when shown, so they
// follow the interface language; notes and comments keep their own text.
export type TaskEvent =
   | (TaskEventBase & { kind: 'status'; status: TaskStatus; userId: string })
   | (TaskEventBase & { kind: 'recurred' })
   | (TaskEventBase & { kind: 'comment'; text: string; userId: string })
   | (TaskEventBase & { kind: 'note'; text: string });

// The fields a person fills in when creating or editing a task.
export interface TaskInput {
   title: string;
   type: TaskType;
   context: string; // counterparty or document, shown next to the type
   relation: TaskRelation;
   relationId: string; // the deal or the company, '' without a relation
   assigneeId: string; // '' — not assigned, goes to the director by default
   reviewerId: string; // '' — nobody checks the result
   dueDate: string; // YYYY-MM-DD, or '' when no deadline is set
   priority: TaskPriority;
   status: TaskStatus;
   recurrence: TaskRecurrence;
   checklist: ChecklistItem[];
}

export interface Task extends TaskInput {
   id: string;
   basis: string; // the document the task comes from
   dueLabel: string; // «до ИК-2» when the deadline is an event, not a date
   origin: string; // manual, ic_condition, …: what made the task
   createdById: string;
   decisionId: string; // the committee decision it carries out, or ''
   createdAt: string; // YYYY-MM-DD
   completedAt: string | null; // YYYY-MM-DD, set while the status is "done"
   history: TaskEvent[]; // newest first
}

// A deal or a portfolio company a task can be attached to.
export interface TaskTarget {
   id: string;
   name: string;
}

export type TaskTargets = Record<Exclude<TaskRelation, 'none'>, TaskTarget[]>;

// Contracts, acts and letters to approve join in phase 3.
export type DecisionAction = 'memo' | 'decide';

/* Something a person has to do that comes from a deal rather than from the
   task list, counted from the deals (docs/ERP.md §5.7):
   - inbox: an application offered to them to take or decline;
   - next: the next step of a deal they own, due within 5 working days;
   - memo: a memorandum waiting for them, its sponsor, to approve;
   - screening: a screening decision waiting for them, the second reviewer. */
export type QueueKind = 'inbox' | 'next' | 'memo' | 'screening';

export interface QueueItem {
   id: string;
   kind: QueueKind;
   ownerId: string;
   subject: string; // the company
   section: Section;
   title: string; // the deal's next step, for "next"; '' — the stage's own
   note: string; // the deal's number, or the memorandum's version
   stage?: DealStage; // the deal's stage, for "next"
   dueDate: string; // YYYY-MM-DD
   completedAt: string | null; // ticked today in this browser
   // set when the item is a decision the owner has to take
   decision?: { preparedById: string; action: DecisionAction };
   dealId?: string; // the deal the item is about
}

export type WaitingSource = 'applicant' | 'company' | 'colleague';

// An answer the owner is waiting for from somebody else.
export interface WaitingItem {
   id: string;
   ownerId: string;
   from: string;
   source: WaitingSource;
   title: string;
   when: 'until' | 'since' | 'after';
   date: string; // YYYY-MM-DD
}

export type DealStage =
   | 'inbox'
   | 'screening'
   | 'meeting'
   | 'analysis'
   | 'ic1'
   | 'dd'
   | 'ic2'
   | 'board'
   | 'closing';

export interface MyDeal {
   id: string; // the address of the deal's card
   company: string;
   stage: DealStage;
   stageDate: string; // YYYY-MM-DD of the stage's event, or ''
}

export interface WeekDeadline {
   id: string;
   // "reports" is worded when shown: its title is the quarter
   kind: 'meeting' | 'deal' | 'task' | 'reports';
   date: string; // YYYY-MM-DD
   title: string;
   section: Section;
   note: string; // for a deal, its next step; '' — the stage's own
   stage?: DealStage; // for a deal
   keyEvent: boolean; // the event of the week, e.g. a committee meeting
}

export type MoneyPart = 'free' | 'approved' | 'reserve' | 'operating';

export interface FunnelStage {
   stage: DealStage;
   count: number;
   overdue: number; // of them, late because of the fund
}

export interface PortfolioCompany {
   id: string;
   name: string;
   invested: number; // USD
   reportReceived: boolean;
   nextStep: string;
}

// What the fund overview shows; amounts are in USD. The money is null until
// the chief accountant fills in fund_money (docs/ERP.md §4.8).
export interface FundOverview {
   updatedAt: string; // HH:mm of the last data refresh
   money: {
      onAccounts: number;
      capital: number;
      plan: {
         year: number;
         amount: number;
         invested: number;
         approved: number;
      };
      parts: { part: MoneyPart; amount: number; note: string }[];
   } | null;
   funnel: FunnelStage[];
   portfolio: {
      quarter: number | null; // null before the first reporting cycle
      reportsDue: string; // YYYY-MM-DD, '' without a cycle
      requestedAt: string; // YYYY-MM-DD, '' until the reports are requested
      companies: PortfolioCompany[];
   };
}

// Counters shown next to the sidebar items.
export type SectionCounters = Partial<Record<Section | 'myDay', number>>;

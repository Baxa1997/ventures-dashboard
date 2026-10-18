// employees.role in ucode; the last three come with real staff, not the sample.
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

// Sections of the platform that work items point to.
export type Section =
   | 'tasks'
   | 'deals'
   | 'committee'
   | 'portfolio'
   | 'finance'
   | 'contracts'
   | 'procurement'
   | 'correspondence'
   | 'documents';

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
export type TaskRelation =
   'none' | 'deal' | 'portfolio' | 'contract' | 'letter' | 'procurement';

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
   createdAt: string; // YYYY-MM-DD
   completedAt: string | null; // YYYY-MM-DD, set while the status is "done"
   history: TaskEvent[]; // newest first
}

export type DecisionAction = 'memo' | 'decide' | 'contract' | 'act' | 'letter';

// Something a person has to do that comes from a deal, the portfolio or a
// letter rather than from the task list.
export interface QueueItem {
   id: string;
   ownerId: string;
   subject: string; // company, counterparty or document
   section: Section;
   title: string;
   note: string;
   dueDate: string; // YYYY-MM-DD
   completedAt: string | null;
   // set when the item is a decision the owner has to take
   decision?: { preparedById: string; action: DecisionAction };
   dealId?: string; // the deal the item is about, if it has a card
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
   date: string; // YYYY-MM-DD
   title: string;
   section: Section;
   note: string;
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

// What the fund overview shows; amounts are in USD.
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
   };
   funnel: FunnelStage[];
   portfolio: {
      quarter: number;
      reportsDue: string; // YYYY-MM-DD
      requestedAt: string; // YYYY-MM-DD
      companies: PortfolioCompany[];
   };
}

// Counters shown next to the sidebar items.
export type SectionCounters = Partial<Record<Section | 'myDay', number>>;

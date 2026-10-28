import type { CommitteeBody } from './committee.types';
import type { JournalEntry } from './deals.types';

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
   name: string; // the short name the lists show
   fullName?: string; // as written in employees, '' when not filled in
   role: Role;
}

// Sections of the platform that work items point to. Финансы, Договоры,
// Закупки, Корреспонденция and Документы join in phase 3.
export type Section =
   'tasks' | 'deals' | 'committee' | 'portfolio' | 'documents';

// The statuses the platform's logic names; the fund adds its own in Настройки
// (task_statuses), each acting as its group does.
export type SystemTaskStatus =
   'assigned' | 'in_progress' | 'waiting' | 'postponed' | 'review' | 'done';

// A task_statuses slug: one of the system ones, or the fund's own.
export type TaskStatus = string;

export type TaskPriority = 'low' | 'medium' | 'high';

// A task_types key (Настройки → Типы задач): acceleration, finance, …
export type TaskType = string;

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
   context: string; // the note's text on one line, shown next to the type
   details: string; // «Уточнение» as written in the rich editor (HTML)
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
   number: number; // its place in the order the tasks were made: SQV-12
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
// answer, document: what the founder sent from the startup cabinet, for the
// deal's owner to check; company_answer: a portfolio company's answer to the
// fund's request for data, for the company's owner
export type QueueKind =
   | 'inbox'
   | 'next'
   | 'memo'
   | 'screening'
   | 'answer'
   | 'document'
   | 'company_answer';

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

// The stages a fund starts with (Настройки → Этапы и нормативы): the system
// ones carry the platform's rules, meeting and analysis are the fund's own.
export type DefaultStage =
   | 'inbox'
   | 'screening'
   | 'meeting'
   | 'analysis'
   | 'ic1'
   | 'dd'
   | 'ic2'
   | 'board'
   | 'closing';

// A stage's key: a default one, or one the fund added (stage_norms).
export type DealStage = string;

// A line of Мой день's «Расписание»: a meeting of the committee or the
// board that day, or the next step of the person's deal set for an hour that
// day (a call, a meeting with the team).
export type ScheduleItem = {
   id: string;
   time: string; // HH:mm, '' — no hour set
} & (
   | {
        kind: 'meeting';
        meetingId: string;
        body: CommitteeBody;
        number: string;
        format: string; // how it is held: in person, online
        live: boolean; // started and not over yet
     }
   | {
        kind: 'deal';
        dealId: string;
        company: string;
        title: string; // the next step, '' — the stage's own
        stage: DealStage;
     }
);

// A line of Мой день's «Ближайшие сроки», worded when shown: a meeting of
// the coming two weeks, the stage deadline of a deal (the person's, or any
// for the director) of the coming week or already past, the quarterly
// reports of the companies.
export type UpcomingItem = {
   id: string;
   date: string; // YYYY-MM-DD
} & (
   | { kind: 'meeting'; meetingId: string; body: CommitteeBody; number: string }
   | {
        kind: 'stage';
        dealId: string;
        company: string;
        stage: DealStage;
        overdue: boolean;
     }
   | { kind: 'reports'; quarter: string } // 2026-Q3
);

// The dashboard's funnel, grouped as the design groups the deals: new
// applications, the work before and between the committees, the committee
// stages and closing, the portfolio, rejections and exits.
export type FunnelGroup =
   | 'new'
   | 'work'
   | 'committee'
   | 'invested'
   | 'rejected'
   | 'exit';

export interface FunnelBar {
   group: FunnelGroup;
   count: number;
}

// The investment committee's next meeting.
export interface NextMeeting {
   id: string;
   number: string;
   date: string; // YYYY-MM-DD
   deals: number; // on its agenda
}

// Why a deal or a company is on the dashboard's «Требует внимания»; worded
// when shown. stage: past the stage's norm; requests: requests to the
// applicant past their date; inbox: an application nobody took in time;
// report: the quarter's documents missing after the due date; agenda: a
// committee stage with no meeting.
export type AttentionItem = { id: string; subject: string } & (
   | { kind: 'stage'; dealId: string; stage: DealStage; days: number }
   | { kind: 'requests'; dealId: string; count: number }
   | { kind: 'inbox'; dealId: string; days: number }
   | { kind: 'report'; companyId: string; quarter: string }
   | { kind: 'agenda'; dealId: string; stage: DealStage }
);

// A line of a deal's journal, among the dashboard's latest actions.
export interface RecentAction {
   dealId: string;
   company: string;
   entry: JournalEntry;
}

// What the dashboard shows (docs/ERP.md §5.7), counted from the deals, the
// portfolio and the meetings; amounts are in USD.
export interface Dashboard {
   deals: { inWork: number; applications: number }; // applications: untaken
   portfolio: { companies: number; exits: number; invested: number };
   nextMeeting: NextMeeting | null;
   funnel: FunnelBar[];
   industries: { key: string; invested: number }[]; // by sector, largest first
   attention: AttentionItem[]; // the most pressing first
   recent: RecentAction[]; // newest first
}

// A notification of the top bar's bell, worded when shown: what waits for the
// person's decision, their overdue and newly assigned tasks, new applications
// and the committee's next meeting.
export type Notice = { id: string } & (
   | { kind: 'decision'; item: QueueItem }
   | { kind: 'overdue'; taskId: string; title: string; dueDate: string }
   | { kind: 'assigned'; taskId: string; title: string; fromId: string }
   | { kind: 'application'; dealId: string; company: string; date: string }
   | { kind: 'meeting'; meetingId: string; number: string; date: string }
);

// Counters shown next to the sidebar items.
export type SectionCounters = Partial<Record<Section | 'myDay', number>>;

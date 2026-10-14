import type { DealStage } from './work.types';

// Where an application or a deal stands. "review" is an incoming application
// nobody has decided on yet; "active" is a deal moving through the stages.
export type DealStatus =
   | 'review'
   | 'active'
   | 'paused'
   | 'portfolio'
   | 'withdrawn'
   | 'rejected';

export type DealSource =
   | 'site'
   | 'network'
   | 'conference'
   | 'partner_fund'
   | 'accelerator';

export type RoundStage = 'pre_seed' | 'seed' | 'pre_series_a' | 'series_a';

export type RejectReason =
   | 'mandate_scope'
   | 'mandate_check'
   | 'no_demand'
   | 'team'
   | 'valuation'
   | 'other';

// When a rejected applicant may apply again.
export type Resubmit = 'now' | 'in_6_months' | 'in_12_months';

export type Tone = 'accent' | 'warning' | 'danger' | 'success' | 'neutral';

// A label–value row of sample content, with an optional smaller note.
export type Fact = [label: string, value: string, note?: string];

// One stage on the "Путь сделки" strip, written as the fund's log has it.
export interface PathStep {
   stage: DealStage;
   line1: string;
   line2: string;
   late?: boolean; // the stage took longer than its norm
}

export interface Risk {
   id: string;
   level: 'high' | 'medium';
   title: string;
   note: string;
   ownerId: string;
   short?: string; // the wording used in the memorandum's table
   severity?: number; // 1–5
   measure?: string;
}

// A line of a checklist that the system keeps: done, still open, open and
// needing attention, or open and blocking the next step.
export interface CheckItem {
   id: string;
   text: string;
   note: string;
   state: 'done' | 'open' | 'attention' | 'blocking';
   // set when the item closes by itself once this happens
   fulfilledBy?: 'dd_questionnaire';
}

export interface TeamMember {
   employeeId?: string;
   name?: string; // an outside party
   role: string;
}

export interface Metric {
   label: string;
   value: string;
   note: string;
   warn?: boolean;
}

export interface Criterion {
   key: string;
   score: number | null; // 1–5
   rationale: string;
   source: string;
}

export type ScreeningDecision = 'meeting' | 'request' | 'reject';

export type ScreeningNoteKey = 'essence' | 'whyNow' | 'redFlags' | 'questions';

export interface Screening {
   criteria: Criterion[];
   decision: ScreeningDecision;
   secondId: string; // the colleague who confirms the decision
   savedAt: string; // HH:mm of the last change, '' before the first one
   note: Record<ScreeningNoteKey, string>;
   completedAt: string | null; // YYYY-MM-DD
}

export interface DealRequest {
   id: string;
   title: string;
   text: string; // what the applicant is asked for
   byId: string;
   sentAt: string; // YYYY-MM-DD
   dueDate: string; // YYYY-MM-DD
   status: 'waiting' | 'accepted';
   closedAt: string; // YYYY-MM-DD, '' while waiting
   detail: string; // sample wording of the line under the title, if any
   warning: string; // what holds the request up, if anything
}

export type DocumentStatus = 'review' | 'accepted' | 'rejected' | 'required';

export interface DealDocument {
   id: string;
   title: string;
   status: DocumentStatus;
   version: number; // 0 while nothing is uploaded
   detail: string; // sample wording: who handled the version and when
   // set when somebody handles the document in this app; replaces "detail"
   handled?: {
      kind: 'accepted' | 'rejected' | 'uploaded';
      byId: string;
      at: string; // YYYY-MM-DD HH:mm
      reason: string;
   };
}

export type WorkstreamStatus = 'rework' | 'in_progress' | 'not_started' | 'done';

export interface Workstream {
   id: string;
   name: string;
   executor: string; // who does it and on what grounds
   handedAt: string; // YYYY-MM-DD, '' until handed over
   dueDate: string; // YYYY-MM-DD
   status: WorkstreamStatus;
   conclusion: string;
}

export type Recommendation = 'strong_yes' | 'yes' | 'conditional' | 'no';

export interface Memo {
   version: number;
   versionDate: string; // YYYY-MM-DD
   authorId: string;
   sponsorId: string;
   sections: { n: number; title: string; done: boolean }[];
   snapshot: string;
   recommendation: Recommendation;
   summary: Fact[];
   comment: { byId: string; at: string; text: string } | null;
   checklistHint: string;
   checklist: CheckItem[];
   versions: { v: number; at: string; note: string }[];
   approvedAt: string | null; // YYYY-MM-DD the sponsor approved it
}

export interface Decision {
   id: string;
   body: string; // ИК-1, ИК-2, Набсовет
   detail: string;
   outcome: string;
}

interface JournalBase {
   id: string;
   date: string; // YYYY-MM-DD
}

// A line of a deal's journal. What this app records is worded when shown, so
// it follows the interface language; sample lines keep their own text.
export type JournalEntry =
   | (JournalBase & { kind: 'text'; text: string })
   | (JournalBase & { kind: 'created'; userId: string })
   | (JournalBase & { kind: 'taken'; userId: string })
   | (JournalBase & { kind: 'stage'; stage: DealStage | 'portfolio' })
   | (JournalBase & { kind: 'rejected'; reason: RejectReason; userId: string })
   | (JournalBase & { kind: 'request'; title: string; userId: string })
   | (JournalBase & {
        kind: 'document';
        title: string;
        result: 'accepted' | 'rejected' | 'uploaded';
        userId: string;
     })
   | (JournalBase & { kind: 'screening'; userId: string })
   | (JournalBase & { kind: 'memo'; userId: string })
   | (JournalBase & { kind: 'workstream'; name: string; handed: boolean });

export interface Deal {
   id: string; // also the address of the deal's card
   number: string; // SQBV-2026-0172
   company: string;
   about: string; // what the company does, in a line
   industry: string;
   tags: string; // further descriptors shown after the industry
   source: DealSource;
   amount: number; // USD asked for
   country: string;
   roundStage: RoundStage;
   receivedAt: string; // YYYY-MM-DD, with " HH:mm" when the time is known
   status: DealStatus;
   stage: DealStage;
   ownerId: string; // '' until somebody is assigned
   proposedOwnerId: string; // who an unassigned application is offered to
   days: { used: number; norm: number } | null; // working days on the stage
   waiting: boolean; // the stage clock stands: the fund waits for the applicant
   next: { title: string; dueDate: string; time?: string } | null;
   committee?: { number: number; date: string; time: string };
   closed?: {
      reason?: RejectReason;
      note: string; // why it is paused or withdrawn; the fund's comment on a rejection
      date: string;
      letter?: string; // what the applicant was told
      resubmit?: Resubmit;
   };

   // The rest is what a deal's card shows; a part is absent when the sample
   // has no content for it.
   meta?: string; // the line under the name in the card's header
   facts?: Fact[]; // "Из заявки"
   factsHint?: string;
   path?: PathStep[];
   pathHint?: string;
   terms?: { rows: Fact[]; warning: string };
   metrics?: { hint: string; items: Metric[]; note: string };
   risks?: Risk[];
   readiness?: { note: string; items: CheckItem[] };
   team?: TeamMember[];
   synergy?: Fact[];
   related?: Fact[];
   screening?: Screening;
   requests?: DealRequest[];
   documents?: DealDocument[];
   applicantEmail?: string;
   clock?: { pausedDays: number; pausedSince: string };
   workstreams?: Workstream[];
   dd?: {
      due: string; // YYYY-MM-DD the stage must end by
      closedNote: string;
      external: { value: string; note: string };
      strengths: string[];
      alert: { title: string; text: string } | null;
   };
   memo?: Memo;
   decisions?: Decision[];
   exit?: CheckItem[]; // conditions for leaving the current stage
   // How many records the fund's system holds where the sample has only some.
   totals?: { requests?: number; dd?: number };
   journal: JournalEntry[];
}

// Figures of the whole register, most of which is not in the sample.
export interface DealsSummary {
   total: number;
   since: number; // the year the register starts
   byStatus: Record<DealStatus, number>;
   // how many deals reached each step, from "received" to "portfolio"
   reached: { step: DealStage | 'received' | 'portfolio'; count: number }[];
   reasons: Record<RejectReason, number>;
   lastMonth: { month: string; received: number }; // month as YYYY-MM
}

export interface NewDealInput {
   company: string;
   about: string;
   industry: string;
   source: DealSource;
   amount: number;
   country: string;
   roundStage: RoundStage;
}

export interface RejectInput {
   reason: RejectReason;
   letter: string;
   comment: string;
   resubmit: Resubmit;
}

export interface RequestInput {
   title: string;
   text: string;
   dueDate: string;
   ddQuestionnaire: boolean;
}

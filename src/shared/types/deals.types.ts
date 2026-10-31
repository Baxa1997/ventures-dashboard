import type { CabinetMember, Instrument } from './portfolio.types';
import type { DealStage } from './work.types';

// Where an application or a deal stands. "review" is an incoming application
// nobody has decided on yet; "active" is a deal moving through the stages.
export type DealStatus =
   'review' | 'active' | 'paused' | 'portfolio' | 'withdrawn' | 'rejected';

// Keys of the lists the fund keeps in Настройки (ListKind): a lead source
// (telegram, network, …), a round (pre_seed, seed, …) and a rejection reason
// (mandate_check, no_demand, …).
export type DealSource = string;
export type RoundStage = string;
export type RejectReason = string;

// When a rejected applicant may apply again.
export type Resubmit = 'now' | 'in_6_months' | 'in_12_months';

export type Tone = 'accent' | 'warning' | 'danger' | 'success' | 'neutral';

// A label–value row of sample content, with an optional smaller note.
export type Fact = [label: string, value: string, note?: string];

// A stage the deal has been on, from its stage history.
export interface StageRecord {
   stage: DealStage | 'portfolio';
   enteredAt: string; // YYYY-MM-DD
   leftAt: string; // YYYY-MM-DD, '' while the deal is on it
   daysUsed: number | null; // working days, once it has left
   norm: number | null;
   late: boolean; // it took longer than its norm
}

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
// waiting for somebody, open and needing attention, or open and blocking
// the next step.
export interface CheckItem {
   id: string;
   text: string;
   note: string;
   state: 'done' | 'open' | 'waiting' | 'attention' | 'blocking';
   // set when the item closes by itself once this happens
   fulfilledBy?: 'dd_questionnaire';
}

export interface TeamMember {
   id?: string; // a member the owner added; the others come from the deal
   employeeId?: string;
   name?: string; // an outside party
   role: string;
}

/* What the fund offers, as the deal's owner writes it once the terms take
   shape. The fund's cheque is the deal's amount. */
export interface DealTerms {
   instrument: Instrument | ''; // '' until chosen
   roundSize: number | null; // USD, the whole round
   preMoney: number | null; // USD, the company's valuation before the round
   conditions: string; // the cap, discount and term of a SAFE or a loan
   valuation: string; // what DD makes of the valuation
   structure: string; // the group: holding, operating companies
   founder: string; // the founders and their shares
   warning: string; // why the deal is an exception to the mandate
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
   // what the deal has on the criteria of Настройки, by key (scoreRows)
   criteria: Criterion[];
   decision: ScreeningDecision | ''; // '' until it is chosen
   secondId: string; // the colleague who confirms the decision
   savedAt: string; // HH:mm of the last change, '' before the first one
   note: Record<ScreeningNoteKey, string>;
   completedAt: string | null; // YYYY-MM-DD
}

// The founder's questionnaire, one row the fund and the startup cabinet both
// write (deal_questionnaires, batches 10 and 17): the answers by question.
export interface DealQuestionnaire {
   id: string;
   values: Record<string, string>; // a question's id → its answer
   requestId: string; // the fund's request it answers, '' when the fund began it
   updatedAt: string; // YYYY-MM-DD HH:mm, '' before the first answer
   updatedById: string; // the employee who wrote last; '' for the founder
   submittedAt: string; // YYYY-MM-DD HH:mm, '' while the founder fills it in
}

// A participant of the startup's capital before the deal.
export interface DealOwner {
   name: string;
   role: string;
   share: number; // %
}

export interface DealRequest {
   id: string;
   title: string;
   text: string; // what the applicant is asked for
   byId: string;
   sentAt: string; // YYYY-MM-DD
   dueDate: string; // YYYY-MM-DD
   folder: string; // the data room folder of Настройки its file goes to, '' for none
   // answered: the founder answered in the cabinet and the fund checks it;
   // accepted: closed, by the fund's check or an answer the fund recorded itself
   status: 'waiting' | 'answered' | 'accepted';
   closedAt: string; // YYYY-MM-DD, '' while waiting
   detail: string; // the applicant's answer, once it came
   warning: string; // what holds the request up, if anything
   ddQuestionnaire: boolean; // the fund's DD questionnaire, answered in the cabinet
}

export type DocumentStatus = 'review' | 'accepted' | 'rejected' | 'required';

export interface DealDocument {
   id: string;
   title: string;
   status: DocumentStatus;
   version: number; // 0 while nothing is uploaded
   url: string; // where its file opens, '' without one
   fileId: string; // the file's ucode Files id, to delete it with the document
   // the data room folder it is in: a folder of Настройки by its key, or a
   // deal's own older folder by its id; '' for none
   folderId: string;
   size: number; // the file's bytes, 0 when not known
   requestId: string; // the request it answers, '' for none
   // whose file it is: the applicant's (from the website, or uploaded by the
   // fund for them) or the fund's own; '' for an older row
   uploadedBy: 'applicant' | 'fund' | '';
   uploadedById: string; // the employee who uploaded it, '' for the website
   uploadedAt: string; // YYYY-MM-DD HH:mm, '' when unknown
   detail: string; // why it was rejected, or an older row's wording
   // set when somebody handles the document in this app; replaces "detail"
   handled?: {
      kind: 'accepted' | 'rejected' | 'uploaded';
      byId: string;
      at: string; // YYYY-MM-DD HH:mm
      reason: string;
   };
}

// A folder of a deal's data room; folders sit inside one another.
export interface DealFolder {
   id: string;
   name: string;
   parentId: string; // '' at the top of the data room
   sortOrder: number;
   createdById: string;
}

export type WorkstreamStatus =
   'rework' | 'in_progress' | 'not_started' | 'done';

// An auditor's conclusion, as the design's DD card picks it.
export type WorkstreamVerdict = 'positive' | 'remarks' | 'negative';

export interface Workstream {
   id: string;
   name: string;
   auditKey: string; // the audit of Настройки it stands for, '' for none
   executor: string; // who does it and on what grounds: the auditor
   handedAt: string; // YYYY-MM-DD, '' until handed over
   dueDate: string; // YYYY-MM-DD
   status: WorkstreamStatus;
   conclusion: string; // the auditor's remarks
   verdict: WorkstreamVerdict | ''; // '' — no conclusion yet (batch 15)
   concludedAt: string; // YYYY-MM-DD it was done, '' until then (batch 15)
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
   stage: string; // the stage it decides on: ic1, ic2, board
   verdict: 'approved' | 'rejected' | 'other'; // postponed, or only noted
   meetingId?: string; // the meeting that took it
   meetingLabel?: string; // ИК № 3
}

interface JournalBase {
   id: string;
   date: string; // YYYY-MM-DD
   at?: string; // the moment, as ucode keeps it; none until read back
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
   // the applicant's answer to a request, recorded by the fund
   | (JournalBase & { kind: 'answered'; title: string; userId: string })
   | (JournalBase & {
        kind: 'document';
        title: string;
        result: 'accepted' | 'rejected' | 'uploaded';
        userId: string;
     })
   | (JournalBase & { kind: 'screening'; userId: string })
   | (JournalBase & { kind: 'memo'; userId: string })
   // the director approved moving on from the stage the deal was on
   | (JournalBase & { kind: 'approved'; userId: string })
   // the deal's details (company, request, lists) were changed
   | (JournalBase & { kind: 'edited'; userId: string })
   // put on a stage with a status by hand, past the conditions, with a reason
   | (JournalBase & {
        kind: 'moved';
        stage: DealStage;
        status: DealStatus;
        reason: string;
        userId: string;
     })
   | (JournalBase & { kind: 'workstream'; name: string; handed: boolean });

export interface Deal {
   id: string; // also the address of the deal's card
   number: string; // SQBV-2026-0172
   company: string;
   about: string; // what the company does, in a line
   legalName: string;
   tin: string; // ИНН
   foundedYear: number | null;
   employees: number | null;
   website: string;
   owners: DealOwner[]; // its capital before the deal
   industryKey: string; // the sector, an industries key; '' when not chosen
   industry: string; // the niche as the analyst writes it; may be empty
   tags: string; // further descriptors shown after the industry
   source: DealSource; // '' when not known
   fromSite: boolean; // came through the website's form
   amount: number; // USD asked for
   country: string; // a countries code, or an older deal's own text
   roundStage: RoundStage;
   receivedAt: string; // YYYY-MM-DD, with " HH:mm" when the time is known
   status: DealStatus;
   stage: DealStage;
   ownerId: string; // '' until somebody is assigned
   proposedOwnerId: string; // who an unassigned application is offered to
   days: { used: number; norm: number } | null; // working days on the stage
   waiting: boolean; // the stage clock stands: the fund waits for the applicant
   next: { title: string; dueDate: string; time?: string } | null;
   // the meeting of the committee or the board the deal is on the agenda of
   committee?: { id: string; number: number; date: string; time: string };
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
   stages?: StageRecord[]; // oldest first
   terms?: DealTerms;
   metrics?: { hint: string; items: Metric[]; note: string };
   risks?: Risk[];
   // what the owner adds to the materials for the committee, next to what the
   // panel counts itself (readinessOf)
   readiness?: { note: string; items: CheckItem[] };
   team?: TeamMember[];
   synergy?: Fact[];
   related?: Fact[];
   screening?: Screening;
   requests?: DealRequest[];
   documents?: DealDocument[];
   folders?: DealFolder[];
   applicantEmail?: string;
   applicantName?: string;
   applicantPhone?: string;
   cabinet?: CabinetMember[]; // the people the applicant added to the cabinet
   questionnaire?: DealQuestionnaire;
   // the website's application: the startup cabinet's people belong to it
   applicationId?: string;
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
   legalName: string;
   tin: string;
   foundedYear: number | null;
   employees: number | null;
   website: string;
   applicantEmail: string;
   applicantPhone: string;
   industryKey: string;
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
   folder: string;
   ddQuestionnaire: boolean;
}

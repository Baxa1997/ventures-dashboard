// Инвесткомитет и наблюдательный совет: meetings, votes, decisions.

export type MemberRole = 'chair' | 'bank' | 'international' | 'independent';

export interface CommitteeMember {
   id: string;
   name: string;
   role: MemberRole;
   remote: boolean; // takes part by video
   contract: string; // what the member works under
   employeeId?: string; // a member of the fund's team, when they are one
   retired?: boolean; // left the committee: kept for the meetings they sat at
}

export type Attendance = 'confirmed' | 'no_answer' | 'declined';

// "Особое мнение" is a veto: one is enough to turn a question down.
export type VoteChoice = 'for' | 'against' | 'dissent' | 'absent';

export interface MemberVote {
   choice: VoteChoice | null; // null — has not voted yet
   note: string;
}

export type CommitteeBody = 'ic' | 'board';
export type CommitteeStage = 'ic1' | 'ic2';

export type ItemOutcome =
   | 'approved'
   | 'approved_conditions'
   | 'sponsor_approved' // one vote against: the sponsor decided to go on
   | 'rejected'
   | 'postponed'
   | 'noted'; // an item for information

export interface Protocol {
   pros: string;
   cons: string;
   conditions: string;
   next: string;
}

export interface AgendaItem {
   id: string;
   kind: 'decision' | 'info';
   title: string; // EasyTap, or the question itself for an information item
   dealId?: string;
   stage?: CommitteeStage;
   amount?: number; // USD
   instrument?: string; // SAFE, доля
   speakerId: string;
   // how many materials are ready; for a deal with a readiness list it is
   // counted from the deal instead
   materials?: { ready: number; total: number };
   facts?: { label: string; value: string }[]; // what the members are asked
   memoVersion?: number;
   votes: Record<string, MemberVote>;
   protocol: Protocol;
   outcome: ItemOutcome | null;
   outcomeNote: string; // the sponsor's decision, the reason for postponing
}

export type MeetingStatus = 'planned' | 'live' | 'break' | 'held';
export type MeetingResult =
   | 'planned'
   | 'live'
   | 'approved'
   | 'approved_conditions'
   | 'postponed'
   | 'rejected'
   | 'mixed';
export type ProtocolState = 'none' | 'signing' | 'signed';

export interface Meeting {
   id: string; // also the meeting's address
   body: CommitteeBody;
   number: string; // 7, 6.3
   stage: CommitteeStage | null;
   date: string; // YYYY-MM-DD
   time: string; // HH:mm
   format: string;
   secretaryId: string;
   materialsDue: string; // YYYY-MM-DD
   materialsSentAt: string | null;
   status: MeetingStatus;
   startedAt: string | null; // HH:mm
   breakAt: string | null; // HH:mm
   chairId: string | null; // the member who chairs it
   attendance: Record<string, Attendance>;
   agenda: AgendaItem[];
   summary: string; // the questions as the register lists them
   result: MeetingResult;
   protocol: ProtocolState;
   protocolFile: string; // where the signed protocol is kept; '' until signed
}

// A decision in the register: what was decided, by which body and when.
export interface CommitteeDecision {
   id: string;
   meetingId: string | null; // null for decisions from before the register
   body: CommitteeBody;
   meetingLabel: string; // ИК № 6.3, НС № 2, ИК 2024
   date: string | null; // YYYY-MM-DD
   subject: string;
   outcome: ItemOutcome;
   note: string;
   dealId?: string;
}

// A condition or follow-up of a decision that somebody has to carry out.
export interface DecisionTask {
   id: string;
   title: string;
   basis: string;
   ownerId: string;
   due: { date: string } | { label: string };
   done: boolean;
}

export interface NewMeetingInput {
   body: CommitteeBody;
   stage: CommitteeStage | null;
   date: string;
   time: string;
   format: string;
   dealIds: string[];
   participantIds: string[]; // the members invited; the quorum counts them
}

export type MemberInput = Omit<CommitteeMember, 'id'>;

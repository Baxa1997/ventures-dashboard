// Корреспонденция: incoming and outgoing letters, the monthly reports under
// ПП-59 and the control plan they answer.

export type LetterDirection = 'in' | 'out';

export type LetterStatus =
   | 'signing' // an outgoing draft waiting for the director's signature
   | 'awaiting_fund' // an incoming letter the fund has not answered
   | 'in_work'
   | 'awaiting_reply' // sent; the other side owes an answer
   | 'closed';

export type LinkKind =
   'regulation' | 'control' | 'contract' | 'deal' | 'letter';

export interface Letter {
   id: string;
   direction: LetterDirection;
   number: string | null; // null — not numbered yet (a draft, or not given)
   date: string | null; // YYYY-MM-DD, or YYYY-MM when only the month is known
   due: string | null; // YYYY-MM-DD a draft must go out by
   party: string;
   subject: string;
   link: { kind: LinkKind; label: string; id?: string };
   status: LetterStatus;
   ownerId: string;
   replyDue: string | null; // YYYY-MM-DD the fund must answer by
}

export interface RegularSend {
   month: string; // YYYY-MM
   due: string; // YYYY-MM-DD
   ownerId: string;
   status: 'in_work' | 'sent';
   letter: string | null; // "№ 51 от 23.07.2026"
}

export interface ControlItem {
   point: string; // 9(в)
   text: string;
   status: 'in_work' | 'done';
}

export interface NewLetterInput {
   direction: LetterDirection;
   number: string;
   party: string;
   subject: string;
   ownerId: string;
   replyDue: string;
}

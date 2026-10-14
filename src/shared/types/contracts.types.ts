// Договоры: one register for investment agreements, services and civil
// contracts, capital management, partnerships and MoU.

export type ContractType =
   'investment' | 'services' | 'gph' | 'capital' | 'partnership';

export type ContractStatus =
   'active' | 'signing' | 'approval' | 'closing' | 'report';

export interface Tariff {
   id: string;
   title: string;
   amount: number; // млн сум
   monthly: boolean; // a monthly fee rather than a price per project
}

export type OrderStatus =
   'in_progress' | 'rework' | 'accepted_limited' | 'accepted';

// An order under a framework contract, e.g. a Legal DD of one company.
export interface ContractOrder {
   id: string;
   title: string;
   tariffId: string;
   amount: number; // млн сум
   date: string; // YYYY-MM-DD
   note: string;
   status: OrderStatus;
   dealId?: string;
}

export type ActStatus = 'pending' | 'approved' | 'returned' | 'paid';

export interface ContractAct {
   id: string;
   month: string; // YYYY-MM the act is for
   title: string;
   amount: number; // млн сум
   date: string; // YYYY-MM-DD it came
   checks: { id: string; text: string; done: boolean }[];
   status: ActStatus;
   note: string; // why it was returned
}

export type RestrictionKey = 'law' | 'liability' | 'warranty' | 'annexes';

export interface ContractDetails {
   meta: string; // the line under the number in the card's header
   signedAt: string; // YYYY-MM-DD
   validUntil: string; // YYYY-MM-DD
   limit: number; // млн сум a year, with VAT
   tariffs: Tariff[];
   orders: ContractOrder[];
   acts: ContractAct[];
   documents: { id: string; title: string; date: string }[];
   restrictions: { key: RestrictionKey; value: string; warning: boolean }[];
   procurement: string; // the tender it was won in
   history: { date: string; text: string }[];
}

export interface Contract {
   id: string; // also the address of the contract's card
   title: string;
   party: string; // the counterparty and the subject, under the title
   type: ContractType;
   amount: string; // "692,4 млн сум в год", "$150 000", "по заявкам"
   term: string; // "до 21.04.2027", "с апреля 2026", "проект от 06.08.2026"
   endDate: string | null; // YYYY-MM-DD, for "expires in 90 days"
   attention: string; // what needs doing; for a contract with acts it is counted
   status: ContractStatus;
   ownerId: string;
   dealIds: string[];
   details?: ContractDetails; // the sample has the full card for ABACUS only
}

export interface NewContractInput {
   title: string;
   party: string;
   type: ContractType;
   amount: string;
   term: string;
   ownerId: string;
}

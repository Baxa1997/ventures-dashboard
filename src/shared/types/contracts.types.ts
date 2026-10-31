// Договоры: the register of the fund's contracts (docs/ucode-migration.md,
// batch 18).

export type ContractStatus = 'draft' | 'approval' | 'signed' | 'expired';

export interface Contract {
   id: string;
   number: string; // УС-2026/09
   party: string; // the other side
   subject: string;
   type: string; // a contract_types slug
   status: ContractStatus;
   amount: number; // USD, a month's for rent; 0 where it has none
   signedDate: string; // YYYY-MM-DD; '' while not signed
   validUntil: string; // YYYY-MM-DD; '' for no end
   ownerId: string;
   approverId: string; // who approves it; '' for nobody
   dealId: string; // the deal it belongs to; '' for none
   decisionNote: string; // why the approver sent it back
}

export type ContractInput = Omit<Contract, 'id' | 'decisionNote'>;

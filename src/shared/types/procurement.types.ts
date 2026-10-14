// Закупки: tenders by the procurement rules, the commission and suppliers.

export type ProcurementStage =
   | 'planned'
   | 'documents'
   | 'published'
   | 'bidding'
   | 'evaluation'
   | 'contract';

export interface ProcurementStep {
   id: string;
   title: string;
   note: string;
   done: boolean;
}

export interface Procurement {
   id: string;
   title: string;
   scope: string; // the line under the title
   method: 'e_tender' | 'tbd';
   price: string; // "950 млн сум с НДС", "—"
   stage: ProcurementStage;
   result: string;
   steps: ProcurementStep[];
   contractId?: string;
   dealId?: string;
}

export type CommissionRole = 'chair' | 'deputy' | 'member' | 'secretary';

export interface CommissionMember {
   employeeId: string;
   role: CommissionRole;
}

export interface CommissionProtocol {
   id: string;
   number: string;
   date: string; // YYYY-MM-DD
   procurementId: string;
   decision: string;
}

export interface Supplier {
   id: string;
   name: string;
   what: string; // what the fund buys from them
   contractId?: string;
}

export interface NewProcurementInput {
   title: string;
   scope: string;
   method: Procurement['method'];
   price: string;
}

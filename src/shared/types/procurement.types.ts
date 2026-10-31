// Закупки: the fund's requests to buy (docs/ucode-migration.md, batch 18). The
// stages, the categories and their limits are lists in Настройки → Фонд.

export interface Procurement {
   id: string;
   title: string;
   category: string; // a procurement_categories slug
   amount: number; // USD
   stage: string; // a procurement_stages slug
   vendorId: string; // '' until one is chosen
   date: string; // YYYY-MM-DD, when it was asked for
   needDate: string; // YYYY-MM-DD, when it is needed; '' for no date
   ownerId: string; // who asks for it
   approverId: string; // who decides, once it is over the category's limit
   approvedBy: string; // who decided; 'auto' under the limit; '' — not yet
   note: string; // why it is needed
   decisionNote: string; // what the approver said
}

export type ProcurementInput = Pick<
   Procurement,
   | 'title'
   | 'category'
   | 'amount'
   | 'stage'
   | 'vendorId'
   | 'needDate'
   | 'ownerId'
   | 'note'
>;

export interface Vendor {
   id: string;
   name: string;
   tin: string; // ИНН
   category: string; // a procurement_categories slug
   contact: string;
   phone: string;
   active: boolean; // off: new requests no longer offer it
   sortOrder: number;
}

export type VendorInput = Omit<Vendor, 'id' | 'sortOrder'>;

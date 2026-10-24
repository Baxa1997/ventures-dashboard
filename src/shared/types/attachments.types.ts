// A link or a file kept on a deal or a portfolio company: on Скрининг, on a
// request, on a DD workstream, on a company (docs/ucode-migration.md, batch 8).
export interface Attachment {
   id: string;
   kind: 'link' | 'file';
   title: string;
   url: string;
   fileId: string; // ucode Files' id of an uploaded file, '' for a link
   section: string; // where on the card it belongs: screening, request, workstream…
   itemId: string; // the request or workstream it belongs to, '' for the card itself
   dealId: string;
   companyId: string;
   addedById: string;
   addedAt: string; // YYYY-MM-DD HH:mm
}

// What an attachment belongs to.
export interface AttachmentPlace {
   dealId?: string;
   companyId?: string;
   section: string;
   itemId?: string;
}

// Настройки: the rules the system works by, and who may do what.

import type { MetricFormat } from './portfolio.types';
import type { Vendor } from './procurement.types';
import type { SupportedLanguageType } from './system/language.types';
import type { Role } from './work.types';

// The mandate's text fields. Its stages, geography and sectors are marks on
// the lists (rounds, countries and industries in mandate).
export type MandateField = 'check' | 'focus' | 'excluded';

// Who a late stage is escalated to.
export type EscalateTo = 'deputy' | 'director' | 'ic_chair' | '';

/* A stage of a deal (stage_norms, docs/ucode-migration.md batch 8). The
   system stages carry the platform's rules (Входящие, Скрининг, ИК-1,
   Детальный DD, ИК-2, Набсовет, Закрытие): renamed and given norms, never
   deleted or moved. The fund adds, orders and deletes its own between them. */
export interface StageItem {
   id: string; // the stage_norms row; '' for a system stage without one yet
   key: string; // inbox, ic1… or the fund's own slug; deals keep it
   names: Record<SupportedLanguageType, string>; // '' where the default name stands
   sortOrder: number;
   isSystem: boolean;
   norm: string; // working days, maybe with a mark ("5 · публично"), or "до заседания"
   paused: string; // when the clock stands
   escalation: EscalateTo;
   isPublic: boolean; // the norm is told to founders
}

export type StageInput = Omit<StageItem, 'id' | 'sortOrder' | 'isSystem'>;

export type FlagField = 'runway' | 'churn' | 'revenue' | 'reportLate';

export interface PortfolioFlags {
   runway: number; // months
   churn: number; // % a quarter
   revenue: number; // % quarter to quarter
   reportLate: number; // working days after the deadline
}

export interface SettingsChange {
   id: string;
   date: string; // YYYY-MM-DD
   userId: string;
   field: string; // what changed, as the journal names it
   from: string;
   to: string;
}

export type StaffRole =
   | 'director'
   | 'sponsor'
   | 'procurement_chair'
   | 'deputy'
   | 'deal_owner'
   | 'second_reviewer'
   | 'manager'
   | 'portfolio'
   | 'legal'
   | 'ic_secretary'
   | 'correspondence'
   | 'analyst'
   | 'finance'
   | 'procurement_secretary';

export type Access = 'full' | 'work' | 'limited';

export interface StaffMember {
   id: string;
   name: string;
   position: string;
   email: string;
   phone: string;
   role: Role; // what the system lets them do (employees.role, their ucode role)
   roles: StaffRole[]; // the duties they hold
   access: Access;
   addedAt: string; // YYYY-MM-DD: invited, or the row made
   active: boolean; // off: access closed, they sign in with the least rights
   userId: string; // the ucode user they sign in with; '' — no sign-in yet
}

export type StaffInput = Omit<StaffMember, 'id' | 'addedAt' | 'userId'>;

// A row of ucode's login table: who signs in under STAFF, and with what login.
// Somebody with a user but no row signs in under another client type (ADMIN):
// the panel does not change their sign-in.
export interface StaffLogin {
   rowId: string;
   userId: string;
   login: string;
}

// What a new person signs in with: the password is shown once and not kept.
export interface StaffCredentials {
   login: string;
   password: string;
}

export type IndustryMandate = 'focus' | 'allowed' | 'licensed' | 'excluded';

// The reference lists the fund keeps in Настройки, one ucode table each
// (docs/ucode-migration.md, batches 1, 7, 8, 9, 16, 17 and 18).
export type ListKind =
   | 'industries'
   | 'rounds'
   | 'sources'
   | 'countries'
   | 'reasons'
   | 'taskTypes'
   | 'taskStatuses'
   | 'metrics'
   | 'reportDocs'
   | 'docTemplates'
   | 'docFolders'
   | 'ddAudits'
   | 'criteria'
   | 'contractTypes'
   | 'procCategories'
   | 'procStages';

// ucode's groups of a status: a task status behaves as its group does.
export type StatusGroup = 'todo' | 'progress' | 'complete';

export type ItemTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

// A file kept in ucode Files: a report document's template.
export interface ItemFile {
   id: string;
   url: string;
   name: string;
}

export interface ListItem {
   id: string; // the row's guid
   key: string; // the slug or code that deals, tasks and the website keep
   names: Record<SupportedLanguageType, string>;
   sortOrder: number;
   active: boolean; // turned off: the forms stop offering it, records keep it
   // the platform's own rows (a task status, a metric, a report document its
   // logic names): renamed, never deleted
   isSystem?: boolean;
   mandate?: IndustryMandate; // industries: its place in the mandate
   inMandate?: boolean; // rounds and countries the mandate accepts
   onSite?: boolean; // sources the website's form offers
   isMandate?: boolean; // reasons: outside the mandate, the applicant may apply again at once
   group?: StatusGroup; // task statuses
   tone?: ItemTone; // task statuses: the badge's colour among the tones
   // task statuses, contract types, procurement stages: a colour of its own,
   // #rrggbb; '' — the tone's
   color?: string;
   format?: MetricFormat; // portfolio metrics
   file?: ItemFile | null; // report documents, document templates: the file to fill in
   hints?: Record<SupportedLanguageType, string>; // criteria: what it covers
   weight?: number; // criteria: its share of the score, %
   limit?: number; // procurement categories: USD a request may cost unapproved
   needsApproval?: boolean; // procurement stages: over the limit, it waits here
   needsVendor?: boolean; // procurement stages: past it, a vendor is required
}

export type ListItemInput = Omit<ListItem, 'id' | 'sortOrder'>;

/* The founder's questionnaire (fund_settings.questionnaire, batch 17): one for
   all deals, read by the panel and the startup cabinet, which keeps a choice
   by its Russian wording. A field's id keys its answers, so it never changes. */
export type QuestionKind = 'text' | 'area' | 'number' | 'select' | 'yesno';

export interface QuestionField {
   id: string;
   label: Record<SupportedLanguageType, string>;
   kind: QuestionKind;
   options?: Record<SupportedLanguageType, string>[]; // kind 'select'
}

export interface QuestionSection {
   id: string;
   title: Record<SupportedLanguageType, string>;
   fields: QuestionField[];
}

export interface SettingsState {
   mandate: Record<MandateField, string>;
   stages: StageItem[]; // in their order
   removedStages: string[]; // the platform's stages the fund deleted, to bring back
   flags: PortfolioFlags;
   journal: SettingsChange[];
   staff: StaffMember[]; // the ones with access first, then the closed
   lists: Record<ListKind, ListItem[]>; // in their order, the turned-off ones too
   vendors: Vendor[]; // in their order, the turned-off ones too
   vendorsStored: boolean; // ucode has batch 18's table to keep them in
   questionnaire: QuestionSection[];
   questionnaireStored: boolean; // ucode has batch 17's field to keep it in
}

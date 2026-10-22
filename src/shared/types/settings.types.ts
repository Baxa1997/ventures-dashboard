// Настройки: the rules the system works by, and who may do what.

import type { SupportedLanguageType } from './system/language.types';
import type { Role } from './work.types';

// The mandate's text fields. Its stages, geography and sectors are marks on
// the lists (rounds, countries and industries in mandate).
export type MandateField = 'check' | 'focus' | 'excluded';

export type NormStage =
   | 'inbox'
   | 'screening'
   | 'meeting'
   | 'analysis'
   | 'committee'
   | 'dd'
   | 'board'
   | 'closing';

export interface StageNorm {
   stage: NormStage;
   norm: string; // working days, or when the stage ends ("до заседания")
   paused: string; // when the clock stands
   escalation: string;
}

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
   role: Role; // what the system lets them do (employees.role, their ucode role)
   roles: StaffRole[]; // the duties they hold
   access: Access;
   invitedAt: string | null; // YYYY-MM-DD for someone without a ucode user yet
}

export type IndustryMandate = 'focus' | 'allowed' | 'licensed' | 'excluded';

// The reference lists the fund keeps in Настройки, one ucode table each
// (docs/ucode-migration.md, batches 1 and 7).
export type ListKind =
   | 'industries'
   | 'rounds'
   | 'sources'
   | 'countries'
   | 'reasons'
   | 'taskTypes';

export interface ListItem {
   id: string; // the row's guid
   key: string; // the slug or code that deals, tasks and the website keep
   names: Record<SupportedLanguageType, string>;
   sortOrder: number;
   active: boolean; // a row is turned off, never deleted: records point to it
   mandate?: IndustryMandate; // industries: its place in the mandate
   inMandate?: boolean; // rounds and countries the mandate accepts
   onSite?: boolean; // sources the website's form offers
   isMandate?: boolean; // reasons: outside the mandate, the applicant may apply again at once
}

export type ListItemInput = Omit<ListItem, 'id' | 'sortOrder'>;

export interface SettingsState {
   mandate: Record<MandateField, string>;
   norms: StageNorm[];
   flags: PortfolioFlags;
   journal: SettingsChange[];
   staff: StaffMember[];
   lists: Record<ListKind, ListItem[]>; // in their order, the turned-off ones too
}

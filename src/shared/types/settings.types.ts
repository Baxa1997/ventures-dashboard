// Настройки: the rules the system works by, and who may do what.

export type MandateField =
   'check' | 'stages' | 'focus' | 'geography' | 'excluded';

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
   roles: StaffRole[];
   access: Access;
   invitedAt: string | null; // YYYY-MM-DD for someone invited but not signed in yet
}

export interface SettingsState {
   mandate: Record<MandateField, string>;
   // what the fund's site says, while it differs from the mandate
   site: { check: string; stages: string } | null;
   norms: StageNorm[];
   flags: PortfolioFlags;
   journal: SettingsChange[];
   staff: StaffMember[];
}

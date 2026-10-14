import type { BadgeTone } from '@shared/components';
import type {
   CommissionRole,
   Procurement,
   ProcurementStage,
} from '@shared/types/procurement.types';

// Texts are keys of the "procurement" translations.

export const TABS = ['procurements', 'commission', 'suppliers'] as const;
export type ProcurementTab = (typeof TABS)[number];

export const TAB_LABELS = {
   procurements: 'Закупки',
   commission: 'Комиссия и протоколы',
   suppliers: 'Поставщики',
} as const satisfies Record<ProcurementTab, string>;

export const STAGES = {
   planned: { label: 'Планируется', tone: 'neutral' },
   documents: { label: 'Документация на согласовании', tone: 'accent' },
   published: { label: 'Опубликована', tone: 'accent' },
   bidding: { label: 'Приём предложений', tone: 'accent' },
   evaluation: { label: 'Оценка комиссией', tone: 'warning' },
   contract: { label: 'Договор подписан', tone: 'success' },
} as const satisfies Record<
   ProcurementStage,
   { label: string; tone: BadgeTone }
>;

export const METHOD_LABELS = {
   e_tender: 'Электронный конкурс',
   tbd: 'Определяется',
} as const satisfies Record<Procurement['method'], string>;

export const ROLE_LABELS = {
   chair: 'председатель',
   deputy: 'заместитель председателя',
   member: 'член комиссии',
   secretary: 'секретарь',
} as const satisfies Record<CommissionRole, string>;

// The procurement rules (protocol НС № 1) need at least this many members.
export const COMMISSION_MIN = 5;

// The step of a tender that is the commission's meeting.
export const EVALUATION_STEP = 's5';

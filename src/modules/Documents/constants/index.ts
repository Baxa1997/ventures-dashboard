import type { BadgeTone } from '@shared/components';
import type {
   Approver,
   DocCategory,
   DocStatus,
   IssueStatus,
} from '@shared/types/documents.types';

// Texts are keys of the "documents" translations.

export const DOCUMENTS_PATH = '/documents';

export const TITLE_MAX = 200;
export const NOTE_MAX = 600;

export const TABS = [
   'corporate',
   'orders',
   'hr',
   'templates',
] as const satisfies readonly DocCategory[];

export const TAB_LABELS = {
   corporate: 'Корпоративные',
   orders: 'Приказы',
   hr: 'HR',
   templates: 'Шаблоны',
} as const satisfies Record<DocCategory, string>;

// In the order a document goes through them; a list shows those in force first.
export const STATUS_ORDER: DocStatus[] = [
   'draft',
   'updating',
   'reregistration',
   'active',
   'archived',
];

export const STATUSES = {
   active: { label: 'Действует', tone: 'success' },
   reregistration: { label: 'На перерегистрации', tone: 'warning' },
   updating: { label: 'Обновляется', tone: 'accent' },
   draft: { label: 'Черновик', tone: 'neutral' },
   archived: { label: 'Утратил силу', tone: 'neutral' },
} as const satisfies Record<DocStatus, { label: string; tone: BadgeTone }>;

export const APPROVERS = {
   participant: 'Участник',
   board: 'Наблюдательный совет',
   director: 'Директор',
} as const satisfies Record<Approver, string>;

export const ISSUE_STATUSES = {
   awaiting_reply: { label: 'Ждём ответа', tone: 'warning' },
   in_work: { label: 'В работе', tone: 'accent' },
   resolved: { label: 'Решён', tone: 'success' },
} as const satisfies Record<IssueStatus, { label: string; tone: BadgeTone }>;

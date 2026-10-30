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

// The manager's modules, in its first level: the fund's own documents, the
// deals' data rooms and the committee's materials.
export const AREAS = ['fund', 'deals', 'ic'] as const;
export type Area = (typeof AREAS)[number];

export const AREA_LABELS = {
   fund: 'Фонд',
   deals: 'Сделки',
   ic: 'Инвесткомитет',
} as const satisfies Record<Area, string>;

export const AREA_HINTS = {
   fund: 'Учредительные документы, положения, приказы, HR и шаблоны',
   deals: 'Дата румы стартапов: общие с кабинетом основателя',
   ic: 'Материалы и записи заседаний',
} as const satisfies Record<Area, string>;

// The fund's sections, the folders of «Фонд».
export const CATEGORIES = [
   'corporate',
   'orders',
   'hr',
   'templates',
] as const satisfies readonly DocCategory[];

export const CATEGORY_LABELS = {
   corporate: 'Корпоративные',
   orders: 'Приказы',
   hr: 'HR',
   templates: 'Шаблоны',
} as const satisfies Record<DocCategory, string>;

// The columns a list is sorted by; folders always come first.
export const SORTS = ['name', 'owner', 'date', 'status'] as const;
export type SortKey = (typeof SORTS)[number];

export const SORT_LABELS = {
   name: 'Название',
   owner: 'Владелец',
   date: 'Изменён',
   status: 'Статус',
} as const satisfies Record<SortKey, string>;

// A file the committee's secretary uploads that is heard or watched: a
// recording of the question, not its material.
export const RECORDING = /\.(mp3|m4a|wav|ogg|aac|mp4|mov|webm)$/i;

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

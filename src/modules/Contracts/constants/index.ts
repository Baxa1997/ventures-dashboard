import type { BadgeTone } from '@shared/components';
import type {
   ActStatus,
   ContractStatus,
   ContractType,
   OrderStatus,
   RestrictionKey,
} from '@shared/types/contracts.types';

// Texts are keys of the "contracts" translations.

export const CONTRACTS_PATH = '/contracts';

export const LIST_TABS = [
   'all',
   'investment',
   'services',
   'capital',
   'partnership',
] as const;
export type ListTab = (typeof LIST_TABS)[number];

export const LIST_TAB_LABELS = {
   all: 'Все',
   investment: 'Инвестиционные',
   services: 'Услуги и ГПХ',
   capital: 'Управление капиталом',
   partnership: 'Партнёрства и MoU',
} as const satisfies Record<ListTab, string>;

// Which types each tab of the register shows.
export const TAB_TYPES: Record<ListTab, ContractType[] | null> = {
   all: null,
   investment: ['investment'],
   services: ['services', 'gph'],
   capital: ['capital'],
   partnership: ['partnership'],
};

export const TYPE_LABELS = {
   investment: 'Инвестиционный',
   services: 'Услуги',
   gph: 'ГПХ',
   capital: 'Управление капиталом',
   partnership: 'Партнёрство',
} as const satisfies Record<ContractType, string>;

// The section a type belongs to, as the card's breadcrumbs name it.
export const TYPE_SECTIONS: Record<ContractType, ListTab> = {
   investment: 'investment',
   services: 'services',
   gph: 'services',
   capital: 'capital',
   partnership: 'partnership',
};

export const STATUSES = {
   active: { label: 'Действует', tone: 'success' },
   signing: { label: 'На подписании', tone: 'warning' },
   approval: { label: 'На согласовании', tone: 'accent' },
   closing: { label: 'Ждёт закрытия', tone: 'warning' },
   report: { label: 'Ждёт отчёта', tone: 'warning' },
} as const satisfies Record<ContractStatus, { label: string; tone: BadgeTone }>;

export const ORDER_STATUSES = {
   in_progress: { label: 'В работе', tone: 'accent' },
   rework: { label: 'Возвращена на доработку', tone: 'warning' },
   accepted_limited: { label: 'Принята с ограничением', tone: 'accent' },
   accepted: { label: 'Принята', tone: 'success' },
} as const satisfies Record<OrderStatus, { label: string; tone: BadgeTone }>;

export const ACT_STATUSES = {
   pending: { label: 'Ждёт согласования', tone: 'warning' },
   approved: { label: 'Согласован', tone: 'accent' },
   returned: { label: 'Возвращён', tone: 'danger' },
   paid: { label: 'Оплачен', tone: 'success' },
} as const satisfies Record<ActStatus, { label: string; tone: BadgeTone }>;

export const RESTRICTION_LABELS = {
   law: 'Право',
   liability: 'Ответственность',
   warranty: 'Гарантия',
   annexes: 'Приложения',
} as const satisfies Record<RestrictionKey, string>;

export const CARD_TABS = [
   'overview',
   'orders',
   'acts',
   'documents',
   'history',
] as const;
export type CardTab = (typeof CARD_TABS)[number];

export const CARD_TAB_LABELS = {
   overview: 'Обзор',
   orders: 'Заявки',
   acts: 'Акты и оплаты',
   documents: 'Документы',
   history: 'История',
} as const satisfies Record<CardTab, string>;

// An act is paid within this many days of coming in.
export const ACT_PAYMENT_DAYS = 9;
export const EXPIRING_DAYS = 90;

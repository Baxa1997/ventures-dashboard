import type { BadgeTone } from '@shared/components';
import type { ContractStatus } from '@shared/types/contracts.types';

// Texts are keys of the "contracts" translations.

export const CONTRACT_STATUSES = [
   'draft',
   'approval',
   'signed',
   'expired',
] as const satisfies readonly ContractStatus[];

export const STATUS_INFO = {
   draft: { label: 'Черновик', tone: 'neutral' },
   approval: { label: 'На согласовании', tone: 'warning' },
   signed: { label: 'Подписан', tone: 'success' },
   expired: { label: 'Истёк', tone: 'danger' },
} as const satisfies Record<ContractStatus, { label: string; tone: BadgeTone }>;

// The two types the logic names; both are system rows of Настройки.
export const INVEST_TYPE = 'invest'; // counts as the fund's investment
export const RENT_TYPE = 'rent'; // its sum is a month's

// A contract ending within this many days is marked and goes to Мой день.
export const EXPIRING_DAYS = 60;

export const LIST_VIEWS = ['table', 'board'] as const;
export type ListView = (typeof LIST_VIEWS)[number];

export const LIST_VIEW_LABELS = {
   table: 'Таблица',
   board: 'Канбан',
} as const satisfies Record<ListView, string>;

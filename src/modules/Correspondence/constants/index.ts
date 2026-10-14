import type { BadgeTone } from '@shared/components';
import type { LetterStatus } from '@shared/types/correspondence.types';

// Texts are keys of the "correspondence" translations.

export const TABS = ['all', 'fund', 'regular'] as const;
export type LettersTab = (typeof TABS)[number];

export const TAB_LABELS = {
   all: 'Все письма',
   fund: 'Ждут ответа фонда',
   regular: 'Регламентные отправки',
} as const satisfies Record<LettersTab, string>;

export const STATUSES = {
   signing: { label: 'На подписи', tone: 'warning' },
   awaiting_fund: { label: 'Ждёт ответа фонда', tone: 'warning' },
   in_work: { label: 'В работе', tone: 'accent' },
   awaiting_reply: { label: 'Ждём ответа', tone: 'accent' },
   closed: { label: 'Закрыто', tone: 'success' },
} as const satisfies Record<LetterStatus, { label: string; tone: BadgeTone }>;

export const SEND_STATUSES = {
   in_work: { label: 'В работе', tone: 'warning' },
   sent: { label: 'Отправлено', tone: 'success' },
} as const satisfies Record<
   'in_work' | 'sent',
   { label: string; tone: BadgeTone }
>;

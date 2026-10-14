import type { BadgeTone } from '@shared/components';
import type {
   CashFlowKey,
   PaymentStatus,
   ReportStatus,
} from '@shared/types/finance.types';

// Texts are keys of the "finance" translations.

export const FINANCE_PATH = '/finance';

export const TABS = ['capital', 'budget', 'actuals', 'payments'] as const;
export type FinanceTab = (typeof TABS)[number];

export const TAB_LABELS = {
   capital: 'Капитал и размещение',
   budget: 'Бюджет и отчётность',
   actuals: 'Фактические данные',
   payments: 'Платежи',
} as const satisfies Record<FinanceTab, string>;

// The parts of the money on the accounts, in the order of the bar.
export const MONEY_PARTS = {
   free: { label: 'Свободно', fill: 'bg-navy' },
   approved: { label: 'Одобрено, ждёт оплаты', fill: 'bg-accent' },
   reserve: { label: 'Резерв follow-on', fill: 'bg-accent-soft' },
   operating: {
      label: 'Операционные расходы до конца года',
      fill: 'bg-accent-faint',
   },
} as const;

export const REPORT_STATUSES = {
   not_started: { label: 'Не начат', tone: 'neutral' },
   draft: { label: 'Черновик', tone: 'neutral' },
   review: { label: 'На проверке', tone: 'accent' },
   director: { label: 'Ждёт согласования директора', tone: 'warning' },
   approved: { label: 'Согласован директором', tone: 'success' },
   filed: { label: 'Подан в госорган', tone: 'success' },
   archive: { label: 'Архив', tone: 'neutral' },
} as const satisfies Record<ReportStatus, { label: string; tone: BadgeTone }>;

// The way of a financial document, as the footer of the list shows it.
export const REPORT_PATH = [
   'Черновик',
   'На проверке',
   'Согласован директором',
   'Утверждён',
   'Подан в госорган',
   'Архив',
] as const;

export const PAYMENT_STATUSES = {
   waiting: { label: 'Ждёт оснований', tone: 'warning' },
   sent: { label: 'Передан в оплату', tone: 'accent' },
   paid: { label: 'Оплачен', tone: 'success' },
} as const satisfies Record<PaymentStatus, { label: string; tone: BadgeTone }>;

export const CASH_FLOW_LABELS = {
   opening: 'Остаток на 1 января',
   operating: 'Операционная деятельность',
   investing: 'Инвестиционная деятельность',
   financing: 'Финансовая деятельность',
   fx: 'Курсовая разница',
} as const satisfies Record<CashFlowKey, string>;

// What a new payment for a deal waits for.
export const DEFAULT_BASES = [
   'Решение ИК',
   'Решение наблюдательного совета',
   'Договор подписан обеими сторонами',
   'Реквизиты проверены комплаенсом SQB',
] as const;

export type Period = 'year' | 'quarter';
export type Currency = 'uzs' | 'usd';

// The months of the year the fact covers, for the budget's norm of execution.
export const MONTHS_PASSED = 9;

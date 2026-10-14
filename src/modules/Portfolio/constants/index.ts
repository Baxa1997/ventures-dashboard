import type { BadgeTone } from '@shared/components';
import type {
   Instrument,
   MetricKey,
   PilotStatus,
   ReportDoc,
   RequestStatus,
} from '@shared/types/portfolio.types';

// Texts are keys of the "portfolio" translations.

export const PORTFOLIO_PATH = '/portfolio';

export const LIST_TABS = [
   'companies',
   'reports',
   'requests',
   'pilots',
] as const;
export type ListTab = (typeof LIST_TABS)[number];

export const LIST_TAB_LABELS = {
   companies: 'Компании',
   reports: 'Квартальная отчётность',
   requests: 'Запросы компаний',
   pilots: 'Пилоты с SQB',
} as const satisfies Record<ListTab, string>;

export const CARD_TABS = [
   'overview',
   'metrics',
   'reports',
   'pilots',
   'requests',
   'documents',
   'position',
] as const;
export type CardTab = (typeof CARD_TABS)[number];

export const CARD_TAB_LABELS = {
   overview: 'Обзор',
   metrics: 'Показатели',
   reports: 'Отчётность',
   pilots: 'Пилоты с SQB',
   requests: 'Запросы к фонду',
   documents: 'Документы',
   position: 'Позиция и сделки',
} as const satisfies Record<CardTab, string>;

export const INSTRUMENT_LABELS = {
   safe: 'SAFE',
   equity: 'Доля',
} as const satisfies Record<Instrument, string>;

export const REPORT_DOCS: ReportDoc[] = [
   'fund_template',
   'company_template',
   'form1',
   'form2',
];

// The column heads of the reporting table, and the lines of a company's
// checklist for the quarter.
export const REPORT_DOC_LABELS = {
   fund_template: 'Отчёт по шаблону фонда',
   company_template: 'Отчёт по шаблону компании',
   form1: 'Форма 1',
   form2: 'Форма 2',
} as const satisfies Record<ReportDoc, string>;

export const REPORT_DOC_ITEMS = {
   fund_template: 'Инвесторский отчёт по шаблону фонда',
   company_template: 'Инвесторский отчёт по шаблону компании',
   form1: 'Форма 1',
   form2: 'Форма 2',
} as const satisfies Record<ReportDoc, string>;

export const QUARTERS = ['2026-Q1', '2026-Q2', '2026-Q3'];

// The fund's report template, block by block.
export const TEMPLATE_BLOCKS = [
   'Общая информация',
   'Выручка и рост',
   'Финансовые показатели',
   'Команда',
   'Ключевые достижения',
   'Риски',
   'План на квартал',
   'Запрос помощи от фонда',
] as const;

export const PILOT_STATUSES = {
   success: { label: 'Успешно', tone: 'success' },
   in_progress: { label: 'Идёт', tone: 'accent' },
   failed: { label: 'Не принят', tone: 'danger' },
} as const satisfies Record<PilotStatus, { label: string; tone: BadgeTone }>;

export const REQUEST_STATUSES = {
   waiting_fund: { label: 'Ждёт ответа фонда', tone: 'warning' },
   in_work: { label: 'В работе', tone: 'accent' },
   closed: { label: 'Закрыт', tone: 'success' },
} as const satisfies Record<RequestStatus, { label: string; tone: BadgeTone }>;

// A request the fund leaves unanswered longer than this is shown in red.
export const REQUEST_ANSWER_DAYS = 5;

export const METRIC_LABELS = {
   mrr: 'MRR',
   revenue: 'Выручка за квартал',
   margin: 'Gross margin',
   burn: 'Burn в месяц',
   runway: 'Runway',
   clients: 'Активных клиентов',
   churn: 'Churn за квартал',
   team: 'Команда, FTE',
} as const satisfies Record<MetricKey, string>;

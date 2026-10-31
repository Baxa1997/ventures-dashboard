import type { BadgeTone } from '@shared/components';
import type {
   CabinetMember,
   CompanyStatus,
   ExitType,
   Instrument,
   MetricFormat,
   PilotStatus,
   RequestStatus,
   SystemMetric,
   SystemReportDoc,
} from '@shared/types/portfolio.types';

// Texts are keys of the "portfolio" translations.

export const PORTFOLIO_PATH = '/portfolio';

// The list's views; the address keeps the one shown (?view=board).
export const LIST_VIEWS = ['table', 'board'] as const;
export type ListView = (typeof LIST_VIEWS)[number];

export const LIST_VIEW_LABELS = {
   table: 'Таблица',
   board: 'Канбан',
} as const satisfies Record<ListView, string>;

// The card's tabs, as the prototype draws them.
export const CARD_TABS = [
   'overview',
   'metrics',
   'pilots',
   'tasks',
   'dataroom',
] as const;
export type CardTab = (typeof CARD_TABS)[number];

export const CARD_TAB_LABELS = {
   overview: 'Обзор',
   metrics: 'Показатели',
   pilots: 'Пилоты SQB',
   tasks: 'Задачи',
   dataroom: 'Документы Data Room',
} as const satisfies Record<CardTab, string>;

// Tabs that are gone, as old links name them, and where their content went:
// the report's documents and the requests for data are in the data room.
export const OLD_CARD_TABS: Record<string, CardTab> = {
   requests: 'overview',
   position: 'overview',
   documents: 'dataroom',
   reports: 'dataroom',
   data: 'dataroom',
};

// A company's status: the board's columns are «Активные» and «Выходы».
export const COMPANY_STATUSES = {
   active: { label: 'Активная', tone: 'success' },
   exit: { label: 'Выход', tone: 'info' },
   written_off: { label: 'Списана', tone: 'neutral' },
} as const satisfies Record<CompanyStatus, { label: string; tone: BadgeTone }>;

export const EXIT_TYPES = {
   strategic: 'Продажа стратегу',
   secondary: 'Продажа доли инвестору',
   buyback: 'Выкуп основателями',
   ipo: 'IPO',
} as const satisfies Record<ExitType, string>;

export const CABINET_ROLES = {
   ceo: 'CEO',
   cfo: 'CFO',
   cto: 'CTO',
   other: 'Участник',
} as const satisfies Record<CabinetMember['role'], string>;

export const INSTRUMENT_LABELS = {
   safe: 'SAFE',
   convertible: 'Конвертируемый заём',
   equity: 'Доля',
} as const satisfies Record<Instrument, string>;

// The default documents, until Настройки → Отчётность are read.
export const REPORT_DOCS: SystemReportDoc[] = [
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
} as const satisfies Record<SystemReportDoc, string>;

export const REPORT_DOC_ITEMS = {
   fund_template: 'Инвесторский отчёт по шаблону фонда',
   company_template: 'Инвесторский отчёт по шаблону компании',
   form1: 'Форма 1',
   form2: 'Форма 2',
} as const satisfies Record<SystemReportDoc, string>;

// How many quarters the reporting table and a company's card show.
export const QUARTERS_SHOWN = 3;

// Reports for a quarter are due on this day of the month after it, with an
// automatic reminder this many days before (the design's 25 October for Q3).
export const REPORTS_DUE_DAY = 25;
export const AUTO_REMINDER_DAYS = 5;

export const PILOT_STATUSES = {
   planned: { label: 'Запланирован', tone: 'neutral' },
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

export const METRIC_FORMATS = {
   mrr: 'usd',
   revenue: 'usd',
   margin: 'percent',
   burn: 'usd',
   runway: 'months',
   clients: 'number',
   churn: 'percent',
   team: 'number',
} as const satisfies Record<SystemMetric, MetricFormat>;

export const METRIC_LABELS = {
   mrr: 'MRR',
   revenue: 'Выручка за квартал',
   margin: 'Gross margin',
   burn: 'Burn в месяц',
   runway: 'Runway',
   clients: 'Активных клиентов',
   churn: 'Churn за квартал',
   team: 'Команда, FTE',
} as const satisfies Record<SystemMetric, string>;

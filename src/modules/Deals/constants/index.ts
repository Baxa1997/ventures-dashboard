import type {
   DealSource,
   DealStatus,
   DocumentStatus,
   Recommendation,
   RejectReason,
   Resubmit,
   RoundStage,
   ScreeningNoteKey,
   Tone,
   WorkstreamStatus,
} from '@shared/types/deals.types';
import type { DealStage } from '@shared/types/work.types';

export const DEALS_PATH = '/deals';

export const COMPANY_MAX = 80;
export const TEXT_MAX = 600;

// The stages a deal passes, in order. Labels are keys of the "deals" translations.
export const STAGES: DealStage[] = [
   'inbox',
   'screening',
   'meeting',
   'analysis',
   'ic1',
   'dd',
   'ic2',
   'board',
   'closing',
];

export const FUNNEL_STAGES = STAGES.filter((stage) => stage !== 'inbox');

export const STAGE_LABELS = {
   inbox: 'Входящие',
   screening: 'Скрининг',
   meeting: 'Встреча',
   analysis: 'Анализ',
   ic1: 'ИК-1',
   dd: 'Детальный DD',
   ic2: 'ИК-2',
   board: 'Набсовет',
   closing: 'Закрытие',
} as const satisfies Record<DealStage, string>;

// Working days the fund has for a stage; none for the stages that follow a
// meeting schedule. Set in "Настройки" once that section exists.
export const STAGE_NORMS: Record<DealStage, number | null> = {
   inbox: 2,
   screening: 5,
   meeting: 10,
   analysis: 10,
   ic1: null,
   dd: 30,
   ic2: 10,
   board: null,
   closing: 20,
};

// What a deal that has just entered a stage has to do next.
export const STAGE_NEXT_LABELS = {
   inbox: 'Решение по заявке',
   screening: 'Оценка по 7 критериям',
   meeting: 'Встреча с командой',
   analysis: 'Анализ и запрос документов',
   ic1: 'Вынос на ИК-1',
   dd: 'Детальный DD по направлениям',
   ic2: 'Рассылка материалов членам ИК',
   board: 'Решение наблюдательного совета',
   closing: 'Подписание и платёж',
} as const satisfies Record<DealStage, string>;

// The steps of the conversion strip on "Все сделки".
export const REACHED_LABELS = {
   received: 'Поступило',
   screening: 'Скрининг',
   meeting: 'Встреча',
   analysis: 'Анализ',
   ic1: 'ИК-1',
   dd: 'Дет. DD',
   ic2: 'ИК-2',
   portfolio: 'Портфель',
} as const;

// Order of the legend under the register's bar.
export const STATUS_ORDER: DealStatus[] = [
   'active',
   'review',
   'paused',
   'portfolio',
   'withdrawn',
   'rejected',
];

export const STATUS_LABELS = {
   active: 'В работе',
   review: 'Разбор',
   paused: 'Пауза',
   portfolio: 'Портфель',
   withdrawn: 'Отозвана',
   rejected: 'Отказ',
} as const satisfies Record<DealStatus, string>;

export const STATUS_TONES: Record<DealStatus, Tone> = {
   active: 'accent',
   review: 'neutral',
   paused: 'warning',
   portfolio: 'success',
   withdrawn: 'neutral',
   rejected: 'danger',
};

// Fills of the register's bar; each part is also named and counted in the legend.
export const STATUS_FILLS: Record<DealStatus, string> = {
   active: 'bg-accent',
   review: 'bg-accent-faint',
   paused: 'bg-warning-ink',
   portfolio: 'bg-success-ink',
   withdrawn: 'bg-neutral-ink',
   rejected: 'bg-line-strong',
};

// Statuses of the "Отказы и пауза" tab.
export const CLOSED_STATUSES: DealStatus[] = [
   'rejected',
   'paused',
   'withdrawn',
];

export const SOURCE_ORDER: DealSource[] = [
   'site',
   'network',
   'conference',
   'partner_fund',
   'accelerator',
];

export const SOURCE_LABELS = {
   site: 'Сайт',
   network: 'Нетворк',
   conference: 'Конференция',
   partner_fund: 'Партнёрский фонд',
   accelerator: 'Акселератор',
} as const satisfies Record<DealSource, string>;

// "с сайта", as in "SQBV-2026-0172 · с сайта · 2 октября".
export const SOURCE_FROM_LABELS = {
   site: 'с сайта',
   network: 'из нетворка',
   conference: 'с конференции',
   partner_fund: 'от партнёрского фонда',
   accelerator: 'из акселератора',
} as const satisfies Record<DealSource, string>;

export const ROUND_STAGE_ORDER: RoundStage[] = [
   'pre_seed',
   'seed',
   'pre_series_a',
   'series_a',
];

// Written the same in every language.
export const ROUND_STAGE_NAMES: Record<RoundStage, string> = {
   pre_seed: 'Pre-seed',
   seed: 'Seed',
   pre_series_a: 'Pre-Series A',
   series_a: 'Series A',
};

// The published mandate that incoming applications are checked against.
export const MANDATE = {
   minCheck: 50_000,
   maxCheck: 300_000,
   stages: ['pre_seed', 'seed'] as RoundStage[],
   // lower-case industry names
   excluded: ['онлайн-ставки', 'азартные игры', 'беттинг'],
   licensed: ['p2p-кредитование', 'микрофинансирование'],
};

// Order of the reasons in the rejection dialog.
export const REJECT_REASON_ORDER: RejectReason[] = [
   'mandate_check',
   'mandate_scope',
   'no_demand',
   'team',
   'valuation',
   'other',
];

export const REJECT_REASON_LABELS = {
   mandate_check: 'Вне мандата: чек выше $300 000',
   mandate_scope: 'Вне мандата: стадия, отрасль или география',
   no_demand: 'Нет подтверждённого спроса',
   team: 'Команда не закрывает ключевые компетенции',
   valuation: 'Оценка выше, чем готов платить фонд',
   other: 'Другое',
} as const satisfies Record<RejectReason, string>;

// A rejection by mandate lets the applicant come back at once.
export const MANDATE_REASONS: RejectReason[] = [
   'mandate_check',
   'mandate_scope',
];

export const RESUBMIT_ORDER: Resubmit[] = [
   'now',
   'in_6_months',
   'in_12_months',
];

export const RESUBMIT_LABELS = {
   now: 'Сразу',
   in_6_months: 'Через 6 месяцев',
   in_12_months: 'Через 12 месяцев',
} as const satisfies Record<Resubmit, string>;

// The seven criteria of the screening score.
export const CRITERIA = [
   {
      key: 'market',
      title: 'Размер и динамика рынка',
      hint: 'Кто покупает, сколько платят сегодня, как быстро растёт',
   },
   {
      key: 'demand',
      title: 'Проблема и доказательства спроса',
      hint: 'Есть ли платящие клиенты или подписанные пилоты',
   },
   {
      key: 'product',
      title: 'Продукт и защищённость решения',
      hint: 'Что мешает конкуренту повторить за 6 месяцев',
   },
   {
      key: 'economics',
      title: 'Юнит-экономика и путь к прибыльности',
      hint: 'Маржа, CAC, окупаемость клиента',
   },
   {
      key: 'team',
      title: 'Команда и founder-market fit',
      hint: 'Почему именно эта команда выиграет этот рынок',
   },
   {
      key: 'regulation',
      title: 'Регуляторный и комплаенс-риск',
      hint: 'Лицензии, персональные данные, требования ЦБ',
   },
   {
      key: 'mandate',
      title: 'Соответствие мандату и синергия с SQB',
      hint: 'Стадия, чек, отрасль; польза для бизнес-линий банка',
   },
] as const;

export const SCORES = [1, 2, 3, 4, 5];

export const SCREENING_NOTE_FIELDS = [
   { key: 'essence', label: 'Суть' },
   { key: 'whyNow', label: 'Почему сейчас' },
   { key: 'redFlags', label: 'Красные флаги' },
   { key: 'questions', label: 'Вопросы на встречу' },
] as const satisfies { key: ScreeningNoteKey; label: string }[];

export const DOCUMENT_STATUS_LABELS = {
   review: 'На проверке',
   accepted: 'Принят',
   rejected: 'Отклонён',
   required: 'Требуется',
} as const satisfies Record<DocumentStatus, string>;

export const DOCUMENT_STATUS_TONES: Record<DocumentStatus, Tone> = {
   review: 'accent',
   accepted: 'success',
   rejected: 'danger',
   required: 'neutral',
};

export const WORKSTREAM_STATUS_LABELS = {
   rework: 'На доработке',
   in_progress: 'В работе',
   not_started: 'Не начат',
   done: 'Завершён',
} as const satisfies Record<WorkstreamStatus, string>;

export const WORKSTREAM_STATUS_TONES: Record<WorkstreamStatus, Tone> = {
   rework: 'warning',
   in_progress: 'accent',
   not_started: 'neutral',
   done: 'success',
};

export const RECOMMENDATIONS: Recommendation[] = [
   'strong_yes',
   'yes',
   'conditional',
   'no',
];

// Written the same in every language, as in the fund's memorandum template.
export const RECOMMENDATION_NAMES: Record<Recommendation, string> = {
   strong_yes: 'Strong Yes',
   yes: 'Yes',
   conditional: 'Conditional',
   no: 'No',
};

// A risk this severe or worse is shown in red.
export const SEVERE_FROM = 4;

export const RISK_LEVEL_LABELS = {
   high: 'Высокий',
   medium: 'Средний',
} as const;

export const LIST_TABS = ['inbox', 'funnel', 'closed', 'all'] as const;

export type ListTab = (typeof LIST_TABS)[number];

export const DEFAULT_LIST_TAB: ListTab = 'funnel';

export const LIST_TAB_LABELS = {
   inbox: 'Входящие',
   funnel: 'Воронка',
   closed: 'Отказы и пауза',
   all: 'Все сделки',
} as const satisfies Record<ListTab, string>;

export const CARD_TABS = [
   'overview',
   'screening',
   'requests',
   'dd',
   'memo',
   'decisions',
   'history',
] as const;

export type CardTab = (typeof CARD_TABS)[number];

export const CARD_TAB_LABELS = {
   overview: 'Обзор',
   screening: 'Скрининг и оценка',
   requests: 'Запросы и документы',
   dd: 'Due diligence',
   memo: 'Меморандум',
   decisions: 'Решения ИК и НС',
   history: 'История',
} as const satisfies Record<CardTab, string>;

// Filter value that matches everything.
export const ALL = 'all' as const;

// How many rows of the register are shown at first, and added by "Показать ещё".
export const REGISTER_FIRST = 12;
export const REGISTER_STEP = 50;

import type {
   DealStatus,
   DocumentStatus,
   Recommendation,
   Resubmit,
   Tone,
   WorkstreamStatus,
   WorkstreamVerdict,
} from '@shared/types/deals.types';
import type { DealStage, DefaultStage } from '@shared/types/work.types';

export const DEALS_PATH = '/deals';

export const COMPANY_MAX = 80;
export const TEXT_MAX = 600;

// The stages a deal passes, their order and names, are Настройки → Этапы и
// нормативы (stageKeys and stageName in ../helpers).

// Working days a default stage has when Настройки give no number; none for
// the stages that follow a meeting schedule.
export const STAGE_NORMS: Partial<Record<DealStage, number | null>> = {
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
   screening: 'Оценка по критериям',
   meeting: 'Встреча с командой',
   analysis: 'Анализ и запрос документов',
   ic1: 'Вынос на ИК-1',
   dd: 'Детальный DD по направлениям',
   ic2: 'Вынос на ИК-2',
   board: 'Вынос на Набсовет',
   closing: 'Подписание и платёж',
} as const satisfies Record<DefaultStage, string>;

// What the owner does on each default stage, and how the deal moves on from
// it ({{next}}: the stage after it, as Настройки order them).
export const STAGE_HOW = {
   inbox: 'Изучите заявку. Подходит — «Взять в скрининг», и вы станете владельцем сделки. Не подходит — «Отказать с причиной».',
   screening:
      'Оцените стартап по критериям, у каждого балла — обоснование. Выберите второго оценщика и нажмите «Завершить скрининг».',
   meeting:
      'Встретьтесь с командой стартапа. После встречи — «Перевести в «{{next}}»».',
   analysis:
      'Запросите недостающие данные («Запросить данные») и проверьте документы. Когда всё собрано — «Перевести в «{{next}}»».',
   ic1: 'Инвесткомитет решает, стоит ли делать детальный DD. Вынесите сделку на заседание ИК-1; после одобрения откроется «Перевести в «{{next}}»».',
   dd: 'Передайте направления DD исполнителям, соберите их заключения и выполните условия ИК-1. Затем — «Перевести в «{{next}}»».',
   ic2: 'Инвесткомитет принимает решение об инвестиции. Вынесите сделку на заседание ИК-2; после одобрения ИК и директора откроется «Перевести в «{{next}}»».',
   board: 'Наблюдательный совет утверждает сделку. Вынесите её на заседание НС; после одобрения откроется «Перевести в «{{next}}»».',
   closing:
      'Выполните условия ИК-2 и Набсовета, подпишите документы и проведите платёж. Затем «Перевести в портфель»: укажите сумму и инструмент — компания появится в «Портфеле».',
} as const satisfies Record<DefaultStage, string>;

// How a person is attached to a deal, for Настройки → Пользователи.
export const DEAL_LINK_LABELS = {
   owner: 'Владелец',
   proposed: 'Предложен владельцем',
   second: 'Второй оценщик',
   memo: 'Меморандум',
   team: 'Команда сделки',
   task: 'Задача по сделке',
} as const;
export type DealLink = keyof typeof DEAL_LINK_LABELS;

/* The conditions of a committee's approval are tasks for the deal's owner,
   due by an event rather than a date: ИК-1's before ИК-2, ИК-2's and the
   board's before signing. The deal leaves DD, and then Закрытие, only when
   the conditions due by then are met. */
export const CONDITION_ORIGIN = 'ic_condition';

export const CONDITION_DUE = {
   ic2: 'до ИК-2',
   signing: 'до подписания',
} as const;

export const CONDITION_STAGES: Partial<Record<DealStage, string>> = {
   dd: CONDITION_DUE.ic2,
   closing: CONDITION_DUE.signing,
};

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

// The statuses of a closed deal.
export const CLOSED_STATUSES: DealStatus[] = [
   'rejected',
   'paused',
   'withdrawn',
];

// What the website writes into a deal's «Из заявки»: the row labels, the
// deck's name and the note "с сайта". They are in Russian, as the panel's
// translation keys are, so the card shows them in the interface language.
export const APPLICATION_PHRASES = [
   'Контакт',
   'Сайт',
   'Запрос',
   'Стадия',
   'Отрасль',
   'Страна',
   'Откуда узнали',
   'Документы',
   'Презентация',
   'Номер заявки',
   'с сайта',
] as const;

// Rows of «Из заявки» the deal's card already shows from the deal's own
// fields (amount, industry, round stage), so it leaves them out.
export const FIELD_FACTS: string[] = [
   'Запрос',
   'Отрасль',
   'Стадия',
   'Контакт',
   'Сайт',
];

// The check range while Настройки have none. The stages, the geography and
// the sectors are marks on Настройки's lists (rounds, countries, industries).
export const MANDATE = {
   minCheck: 50_000,
   maxCheck: 300_000,
};

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

export const SCORES = [1, 2, 3, 4, 5];

// From this score a deal is recommended to go on, as the design has it.
export const SCORE_THRESHOLD = 4;

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

// An auditor's conclusion on a DD workstream, as the design picks it.
export const WORKSTREAM_VERDICTS = {
   positive: { label: 'Положительное', tone: 'success' },
   remarks: { label: 'С замечаниями', tone: 'warning' },
   negative: { label: 'Отрицательное', tone: 'danger' },
} as const satisfies Record<WorkstreamVerdict, { label: string; tone: Tone }>;

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
   dd: 'Due Diligence',
   memo: 'Меморандум',
   decisions: 'Решение ИК и НС',
   history: 'История',
} as const satisfies Record<CardTab, string>;

import type { BadgeTone } from '@shared/components';
import type {
   Attendance,
   CommitteeStage,
   ItemOutcome,
   MeetingResult,
   MemberRole,
   VoteChoice,
} from '@shared/types/committee.types';

// Texts are keys of the "committee" translations.

export const COMMITTEE_PATH = '/committee';

export const LIST_TABS = ['meetings', 'board', 'decisions', 'members'] as const;
export type ListTab = (typeof LIST_TABS)[number];

export const LIST_TAB_LABELS = {
   meetings: 'Заседания ИК',
   board: 'Наблюдательный совет',
   decisions: 'Реестр решений',
   members: 'Состав и договоры',
} as const satisfies Record<ListTab, string>;

// The voting rules of the fund ("Чек-лист ИК"); Настройки show them.
export const IC_RULES = {
   quorum: 3,
   materialsDays: 3, // working days before the meeting
   discussionAt: 1, // votes against that send a question to the sponsor
   rejectAt: 2, // votes against that turn it down
};

export const MEMBER_ROLE_LABELS = {
   chair: 'председатель ИК',
   bank: 'представитель SQB',
   international: 'международный член',
   independent: 'независимый член',
} as const satisfies Record<MemberRole, string>;

export const STAGE_LABELS = {
   ic1: 'ИК-1',
   ic2: 'ИК-2',
} as const satisfies Record<CommitteeStage, string>;

export const ATTENDANCE = {
   confirmed: { label: 'Будет', tone: 'success' },
   no_answer: { label: 'Не ответил', tone: 'warning' },
   declined: { label: 'Не будет', tone: 'neutral' },
} as const satisfies Record<Attendance, { label: string; tone: BadgeTone }>;

export const ATTENDANCE_ORDER: Attendance[] = [
   'confirmed',
   'no_answer',
   'declined',
];

export const VOTES = {
   for: { label: 'За', tone: 'success' },
   against: { label: 'Против', tone: 'danger' },
   dissent: { label: 'Особое мнение', tone: 'danger' },
   absent: { label: 'Отсутствует', tone: 'neutral' },
} as const satisfies Record<VoteChoice, { label: string; tone: BadgeTone }>;

export const VOTE_ORDER: VoteChoice[] = ['for', 'against', 'dissent', 'absent'];

export const OUTCOMES = {
   approved: { label: 'Одобрено', tone: 'success' },
   approved_conditions: { label: 'Одобрено с условиями', tone: 'success' },
   sponsor_approved: { label: 'Одобрено спонсором', tone: 'success' },
   rejected: { label: 'Отказ', tone: 'danger' },
   postponed: { label: 'Отложено', tone: 'warning' },
   noted: { label: 'Принято к сведению', tone: 'neutral' },
} as const satisfies Record<ItemOutcome, { label: string; tone: BadgeTone }>;

export const RESULTS = {
   planned: { label: 'Запланировано', tone: 'accent' },
   live: { label: 'Идёт заседание', tone: 'accent' },
   approved: { label: 'Одобрено', tone: 'success' },
   approved_conditions: { label: 'Одобрено с условиями', tone: 'success' },
   postponed: { label: 'Отложено', tone: 'warning' },
   rejected: { label: 'Отказ', tone: 'danger' },
   mixed: { label: 'Решения приняты', tone: 'success' },
} as const satisfies Record<MeetingResult, { label: string; tone: BadgeTone }>;

export const PROTOCOL_FIELDS = [
   { key: 'pros', label: 'Аргументы «за»' },
   { key: 'cons', label: 'Аргументы «против»' },
   { key: 'conditions', label: 'Условия одобрения' },
   { key: 'next', label: 'Следующий шаг' },
] as const;

export const BODY_LABELS = {
   ic: 'ИК',
   board: 'НС',
} as const;

export const FORMAT_OPTIONS = ['Очно и по видео', 'Очно', 'По видео'];

import type { BadgeTone } from '@shared/components';
import type {
   Attendance,
   CommitteeStage,
   ItemOutcome,
   MeetingResult,
   MeetingStatus,
   MemberRole,
   ProtocolState,
   VoteChoice,
} from '@shared/types/committee.types';

// Texts are keys of the "committee" translations.

export const COMMITTEE_PATH = '/committee';

// The list's views; the address keeps the one shown (?view=calendar).
export const LIST_VIEWS = ['table', 'calendar', 'decisions'] as const;
export type ListView = (typeof LIST_VIEWS)[number];

export const LIST_VIEW_LABELS = {
   table: 'Таблица',
   calendar: 'Календарь',
   decisions: 'Решения',
} as const satisfies Record<ListView, string>;

// A meeting's tabs; the address keeps the open one (?tab=voting).
export const MEETING_TABS = [
   'overview',
   'agenda',
   'members',
   'voting',
   'protocol',
] as const;
export type MeetingTab = (typeof MEETING_TABS)[number];

export const MEETING_TAB_LABELS = {
   overview: 'Обзор',
   agenda: 'Участники (стартапы)',
   members: 'Участники ИК',
   voting: 'Голосование',
   protocol: 'Протокол',
} as const satisfies Record<MeetingTab, string>;

// The tabs of the page before it had five, as old links name them.
export const OLD_MEETING_TABS: Record<string, MeetingTab> = {
   participants: 'members',
   decisions: 'protocol',
};

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

export const MEETING_STATUS = {
   planned: { label: 'Запланировано', tone: 'accent' },
   live: { label: 'Идёт заседание', tone: 'accent' },
   break: { label: 'Перерыв', tone: 'warning' },
   held: { label: 'Проведено', tone: 'success' },
} as const satisfies Record<MeetingStatus, { label: string; tone: BadgeTone }>;

// A held meeting's protocol: with the members for signing, or signed.
export const PROTOCOL_STATES = {
   signing: { label: 'На подписи', tone: 'warning' },
   signed: { label: 'Подписан', tone: 'success' },
} as const satisfies Record<
   Exclude<ProtocolState, 'none'>,
   { label: string; tone: BadgeTone }
>;

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

// Stored on the meeting as written here; keys of the "committee" translations.
export const FORMAT_OPTIONS = ['Очно и по видео', 'Очно', 'По видео'] as const;

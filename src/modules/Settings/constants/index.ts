import type { BadgeTone } from '@shared/components';
import type {
   Access,
   FlagField,
   IndustryMandate,
   MandateField,
   NormStage,
   StaffRole,
} from '@shared/types/settings.types';

// Texts are keys of the "settings" translations.

export const TABS = ['rules', 'users', 'lists', 'integrations'] as const;
export type SettingsTab = (typeof TABS)[number];

export const TAB_LABELS = {
   rules: 'Мандат и нормативы',
   users: 'Пользователи и роли',
   lists: 'Справочники',
   integrations: 'Интеграции',
} as const satisfies Record<SettingsTab, string>;

export const MANDATE_FIELDS = [
   {
      key: 'check',
      label: 'Чек',
      hint: 'Проверка входящих, письмо отказа',
      placeholder: '$50 000 – $300 000',
   },
   {
      key: 'stages',
      label: 'Стадии',
      hint: 'Проверка входящих; исключение — только с обоснованием в меморандуме',
      placeholder: 'Pre-seed, Seed',
   },
   { key: 'focus', label: 'Фокус', hint: 'Пометка «в фокусе» во входящих' },
   { key: 'geography', label: 'География', hint: 'Проверка входящих' },
   {
      key: 'excluded',
      label: 'Не инвестируем',
      hint: 'Автоматический отказ после подтверждения аналитиком',
   },
] as const satisfies readonly {
   key: MandateField;
   label: string;
   hint: string;
   placeholder?: string; // the format the field is read in
}[];

export const NORM_STAGE_LABELS = {
   inbox: 'Входящие',
   screening: 'Скрининг',
   meeting: 'Встреча',
   analysis: 'Анализ',
   committee: 'ИК-1, ИК-2',
   dd: 'Детальный DD',
   board: 'Набсовет',
   closing: 'Закрытие',
} as const satisfies Record<NormStage, string>;

export const FLAG_FIELDS = [
   { key: 'runway', label: 'Runway меньше', unit: 'месяцев' },
   { key: 'churn', label: 'Churn за квартал выше', unit: '%' },
   { key: 'revenue', label: 'Выручка кв/кв ниже', unit: '%' },
   { key: 'reportLate', label: 'Отчёт просрочен на', unit: 'рабочих дней' },
] as const satisfies readonly { key: FlagField; label: string; unit: string }[];

export const ROLE_LABELS = {
   director: 'Директор',
   sponsor: 'Спонсор сделок',
   procurement_chair: 'Председатель закупочной комиссии',
   deputy: 'Зам. директора',
   deal_owner: 'Владелец сделок',
   second_reviewer: 'Второй оценщик',
   manager: 'Проектный менеджер',
   portfolio: 'Портфель',
   legal: 'Юр. оформление',
   ic_secretary: 'Секретарь ИК',
   correspondence: 'Корреспонденция',
   analyst: 'Аналитик',
   finance: 'Финансы',
   procurement_secretary: 'Секретарь закупочной комиссии',
} as const satisfies Record<StaffRole, string>;

// industries.mandate: where an industry stands in the fund's mandate.
export const INDUSTRY_MANDATES = {
   focus: { label: 'В фокусе', tone: 'success' },
   allowed: { label: 'Допустима', tone: 'neutral' },
   licensed: { label: 'Нужна лицензия', tone: 'warning' },
   excluded: { label: 'Исключена', tone: 'danger' },
} as const satisfies Record<
   IndustryMandate,
   { label: string; tone: BadgeTone }
>;

export const ACCESS = {
   full: { label: 'Полный', tone: 'success' },
   work: { label: 'Рабочий', tone: 'accent' },
   limited: { label: 'Ограниченный', tone: 'warning' },
} as const satisfies Record<Access, { label: string; tone: BadgeTone }>;

// The sections the rights are given for, in the order of the table.
export const RIGHT_SECTIONS = [
   'Сделки',
   'ИК и НС',
   'Портфель',
   'Финансы',
   'Договоры',
   'Закупки',
   'Корресп.',
   'Документы',
   'Настройки',
] as const;

export type Right = 'full' | 'own' | 'read' | 'none';

export const RIGHTS = {
   full: { label: 'П', color: 'text-success-ink' },
   own: { label: 'Р', color: 'text-accent' },
   read: { label: 'Ч', color: 'text-ink-soft' },
   none: { label: '—', color: 'text-ink-faint' },
} as const satisfies Record<Right, { label: string; color: string }>;

const r = (code: string): Right[] =>
   [...code].map((letter) =>
      letter === 'f'
         ? 'full'
         : letter === 'o'
           ? 'own'
           : letter === 'r'
             ? 'read'
             : 'none',
   );

// The proposal for discussion (screen 25): f — full, o — own and assigned,
// r — read, - — none, section by section.
export const ROLE_RIGHTS = [
   { role: 'Директор', rights: r('fffffffff') },
   { role: 'Зам. директора', rights: r('fffrffff-') },
   { role: 'Аналитик', rights: r('oro-r-or-') },
   { role: 'Проектный менеджер', rights: r('orf-oror-') },
   { role: 'Секретарь ИК', rights: r('rfr---fr-') },
   { role: 'Финансы — гл. бухгалтер', rights: r('r-rfrrrr-') },
] as const;

export const EXTERNAL_RIGHTS = [
   {
      role: 'Член ИК — внешний',
      text: 'только материалы заседаний и голосование',
   },
   {
      role: 'Портфельная компания',
      text: 'только свой кабинет: отчёты, запросы, документы',
   },
   { role: 'Заявитель', text: 'только кабинет заявки на сайте' },
] as const;

export type IntegrationState = 'manual' | 'moving' | 'built_in';

export const INTEGRATION_STATES = {
   manual: { label: 'Вручную', tone: 'neutral' },
   moving: { label: 'Идёт перенос', tone: 'warning' },
   built_in: { label: 'Встроено', tone: 'success' },
} as const satisfies Record<
   IntegrationState,
   { label: string; tone: BadgeTone }
>;

export const INTEGRATIONS = [
   {
      id: 'bank',
      title: 'Банк-клиент SQB',
      text: 'Выписки XLSX «Kochirma» загружаются в «Финансах»; повторные операции отсекаются по номеру документа.',
      state: 'manual',
   },
   {
      id: 'etender',
      title: 'etender.uz (UZEX)',
      text: 'Закупки публикуются на площадке; номер лота и протокол вносятся в «Закупки».',
      state: 'manual',
   },
   {
      id: 'soliq',
      title: 'my.soliq.uz',
      text: 'Налоговая отчётность подаётся на портале; файлы прикрепляются в «Финансах».',
      state: 'manual',
   },
   {
      id: 'site',
      title: 'Сайт фонда',
      text: 'Мандат и форма заявки; заявки с сайта попадают во «Входящие».',
      state: 'built_in',
   },
   {
      id: 'notion',
      title: 'Notion',
      text: 'Базы фонда переносятся в разделы платформы; поля «—» сверяются при переносе.',
      state: 'moving',
   },
   {
      id: 'cabinets',
      title: 'Кабинеты компаний и заявителей',
      text: 'Отчёты портфеля, запросы к фонду и статус заявки.',
      state: 'built_in',
   },
] as const;

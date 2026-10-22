import type { BadgeTone } from '@shared/components';
import type {
   Access,
   FlagField,
   IndustryMandate,
   ListKind,
   MandateField,
   NormStage,
   StaffRole,
} from '@shared/types/settings.types';
import type { TaskStatus } from '@shared/types/work.types';

// Texts are keys of the "settings" translations.

export const SETTINGS_SECTION_IDS = [
   'mandate',
   'flags',
   'committee',
   'stages',
   'industries',
   'rounds',
   'sources',
   'countries',
   'reasons',
   'task-types',
   'task-statuses',
   'users',
   'integrations',
   'journal',
] as const;
export type SettingsSection = (typeof SETTINGS_SECTION_IDS)[number];

export const DEFAULT_SECTION: SettingsSection = 'mandate';

// The menu of Настройки: groups as the fund thinks of them, each section with
// what it is for (the page header's line).
export const SETTINGS_GROUPS = [
   {
      label: 'Фонд',
      sections: [
         {
            id: 'mandate',
            label: 'Мандат',
            meta: 'Во что инвестирует фонд: чек, фокус и исключения. Стадии, география и отрасли мандата отмечаются в справочниках.',
         },
         {
            id: 'flags',
            label: 'Флаги портфеля',
            meta: 'Пороги, после которых компания портфеля получает красный флаг.',
         },
         {
            id: 'committee',
            label: 'Правила ИК',
            meta: 'Кворум, материалы и как голоса превращаются в решение.',
         },
      ],
   },
   {
      label: 'Сделки',
      sections: [
         {
            id: 'stages',
            label: 'Этапы и нормативы',
            meta: 'Сколько рабочих дней сделка может быть на этапе, когда часы стоят и кому эскалируется просрочка.',
         },
         {
            id: 'industries',
            label: 'Отрасли',
            meta: 'Отрасли формы заявки на сайте и их место в мандате.',
         },
         {
            id: 'rounds',
            label: 'Раунды',
            meta: 'Стадии раунда в форме заявки и в сделках.',
         },
         {
            id: 'sources',
            label: 'Источники',
            meta: 'Откуда приходят сделки: ответ основателя на сайте и каналы фонда.',
         },
         {
            id: 'countries',
            label: 'Регионы',
            meta: 'Страны компаний и география мандата.',
         },
         {
            id: 'reasons',
            label: 'Причины отказа',
            meta: 'Отказ возможен только с причиной из списка.',
         },
      ],
   },
   {
      label: 'Задачи',
      sections: [
         {
            id: 'task-types',
            label: 'Типы задач',
            meta: 'Типы в форме задачи и в фильтрах.',
         },
         {
            id: 'task-statuses',
            label: 'Статусы задач',
            meta: 'Путь задачи от постановки до завершения.',
         },
      ],
   },
   {
      label: 'Команда',
      sections: [
         {
            id: 'users',
            label: 'Пользователи и роли',
            meta: 'Роль задаёт права, человек может совмещать несколько ролей. Внешние участники входят только в свой раздел.',
         },
      ],
   },
   {
      label: 'Система',
      sections: [
         {
            id: 'integrations',
            label: 'Интеграции',
            meta: 'Откуда платформа берёт данные и куда их отдаёт.',
         },
         {
            id: 'journal',
            label: 'Журнал изменений',
            meta: 'Каждое изменение правил и справочников: кто, когда, что было и что стало.',
         },
      ],
   },
] as const satisfies readonly {
   label: string;
   sections: readonly { id: SettingsSection; label: string; meta: string }[];
}[];

type SectionInfo = (typeof SETTINGS_GROUPS)[number]['sections'][number];

export const sectionInfo = (id: SettingsSection) =>
   ([] as readonly SectionInfo[])
      .concat(...SETTINGS_GROUPS.map((group) => group.sections))
      .find((section) => section.id === id)!;

// The old ?tab= addresses, for links made before the sections.
export const OLD_TABS: Record<string, SettingsSection> = {
   rules: 'mandate',
   users: 'users',
   lists: 'industries',
   integrations: 'integrations',
};

// The sections that are a reference list, and how each list is explained.
export const LIST_SECTIONS = {
   industries: 'industries',
   rounds: 'rounds',
   sources: 'sources',
   countries: 'countries',
   reasons: 'reasons',
   'task-types': 'taskTypes',
} as const satisfies Partial<Record<SettingsSection, ListKind>>;

export const LISTS = {
   industries: {
      title: 'Отрасли',
      one: 'отрасль',
      note: 'Сайт предлагает их в форме заявки, проверка мандата читает место в мандате: отрасль в фокусе отмечается во входящих, с лицензией ЦБ — требует внимания, исключённая — даёт отказ по мандату.',
      keyLabel: 'Код',
      keyHint: 'латиницей через дефис: e-commerce',
      flag: 'mandate',
      flagLabel: 'Мандат',
   },
   rounds: {
      title: 'Раунды',
      one: 'раунд',
      note: 'Стадии раунда в форме заявки и в сделках. «В мандате» — стадии, на которых фонд инвестирует; заявку на другой стадии проверка мандата помечает.',
      keyLabel: 'Код',
      keyHint: 'латиницей через подчёркивание: series_b',
      flag: 'inMandate',
      flagLabel: 'В мандате',
   },
   sources: {
      title: 'Источники',
      one: 'источник',
      note: 'Один список для ответа основателя «Откуда вы о нас узнали?» и для каналов фонда, поэтому отчёт «откуда приходят сделки» — один. «На сайте» — варианты формы заявки.',
      keyLabel: 'Код',
      keyHint: 'латиницей через подчёркивание: linkedin',
      flag: 'onSite',
      flagLabel: 'На сайте',
   },
   countries: {
      title: 'Регионы',
      one: 'страна',
      note: 'Страны компаний. «В мандате» — география фонда: заявку из другой страны проверка мандата помечает.',
      keyLabel: 'Код ISO',
      keyHint: 'две латинские буквы: KZ',
      flag: 'inMandate',
      flagLabel: 'В мандате',
   },
   reasons: {
      title: 'Причины отказа',
      one: 'причина',
      note: 'Отказ возможен только с причиной из списка — она нужна для отчёта по воронке. «По мандату» — заявитель может подать снова сразу, иначе через 6 или 12 месяцев.',
      keyLabel: 'Код',
      keyHint: 'латиницей через подчёркивание: no_traction',
      flag: 'isMandate',
      flagLabel: 'По мандату',
   },
   taskTypes: {
      title: 'Типы задач',
      one: 'тип',
      note: 'Типы в форме задачи, в списке задач и в фильтрах.',
      keyLabel: 'Код',
      keyHint: 'латиницей через подчёркивание: events',
      flag: null,
      flagLabel: '',
   },
} as const satisfies Record<
   ListKind,
   {
      title: string;
      one: string; // "Новая отрасль"
      note: string;
      keyLabel: string;
      keyHint: string;
      flag: 'mandate' | 'inMandate' | 'onSite' | 'isMandate' | null;
      flagLabel: string;
   }
>;

// What each task status means; the statuses are fixed (ucode STATUS options).
export const TASK_STATUS_INFO = [
   {
      status: 'assigned',
      group: 'todo',
      text: 'Задача поставлена, исполнитель ещё не начал.',
   },
   {
      status: 'in_progress',
      group: 'progress',
      text: 'Исполнитель работает над задачей.',
   },
   {
      status: 'waiting',
      group: 'progress',
      text: 'Ждём ответа от другого человека или организации; поставившему задачу она видна в «Ждёте от других».',
   },
   {
      status: 'review',
      group: 'progress',
      text: 'Исполнитель закончил, задачу проверяет проверяющий; закрыть её может только он.',
   },
   {
      status: 'postponed',
      group: 'progress',
      text: 'Отложена: срок не горит, задача не попадает в «Мой день».',
   },
   {
      status: 'done',
      group: 'complete',
      text: 'Завершена. Повторяющаяся задача создаёт следующую — через месяц или квартал.',
   },
] as const satisfies readonly {
   status: TaskStatus;
   group: StatusGroup;
   text: string;
}[];

export type StatusGroup = 'todo' | 'progress' | 'complete';

export const STATUS_GROUPS = {
   todo: 'К выполнению',
   progress: 'В работе',
   complete: 'Завершено',
} as const satisfies Record<StatusGroup, string>;

export const MANDATE_FIELDS = [
   {
      key: 'check',
      label: 'Чек',
      hint: 'Проверка входящих, письмо отказа',
      placeholder: '$50 000 – $300 000',
   },
   {
      key: 'focus',
      label: 'Фокус',
      hint: 'Как фонд описывает свой фокус; отрасли в фокусе отмечаются в справочнике отраслей',
   },
   {
      key: 'excluded',
      label: 'Не инвестируем',
      hint: 'Как фонд описывает исключения; исключённые отрасли отмечаются в справочнике отраслей',
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

export type IntegrationState = 'planned' | 'manual' | 'moving' | 'built_in';

export const INTEGRATION_STATES = {
   planned: { label: 'Не подключено', tone: 'neutral' },
   manual: { label: 'Вручную', tone: 'neutral' },
   moving: { label: 'Идёт перенос', tone: 'warning' },
   built_in: { label: 'Встроено', tone: 'success' },
} as const satisfies Record<
   IntegrationState,
   { label: string; tone: BadgeTone }
>;

// What the platform sends and reads on its own once connected. Their keys
// (mail password, bot token, AI key) live on the platform's server, never in
// the browser, so they are connected by the developer.
export const CHANNELS = [
   {
      id: 'mail',
      title: 'Почта',
      text: 'Письма заявителям — отказ, запросы документов; напоминания сотрудникам о сроках; рассылка материалов ИК.',
      needs: 'Почтовый ящик фонда или почтовый сервис',
      state: 'planned',
   },
   {
      id: 'telegram',
      title: 'Telegram-бот',
      text: 'Уведомления сотрудникам: новая заявка, срок этапа, заседание, ответ заявителя.',
      needs: 'Бот фонда в Telegram',
      state: 'planned',
   },
   {
      id: 'ai',
      title: 'ИИ',
      text: 'Краткое содержание заявки и питч-дека, черновики писем и вопросов к встрече. Решения остаются за людьми.',
      needs: 'Ключ API модели',
      state: 'planned',
   },
   {
      id: 'content',
      title: 'Контент',
      text: 'Откуда платформа берёт новости и отчёты для сайта и портфеля: сайты, Telegram-каналы, RSS.',
      needs: 'Список источников',
      state: 'planned',
   },
] as const;

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
      text: 'Форма заявки предлагает отрасли, раунды, источники и страны из справочников; заявки попадают во «Входящие».',
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
      text: 'Отчёты портфеля, запросы к фонду и статус заявки — следующая фаза; пока их ведёт фонд.',
      state: 'planned',
   },
] as const;

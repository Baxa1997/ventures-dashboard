import type { BadgeTone } from '@shared/components';
import type { MetricFormat } from '@shared/types/portfolio.types';
import type {
   Access,
   FlagField,
   IndustryMandate,
   EscalateTo,
   ItemTone,
   ListKind,
   MandateField,
   QuestionKind,
   StaffRole,
   StatusGroup,
} from '@shared/types/settings.types';
import type { SupportedLanguageType } from '@shared/types/system/language.types';
import type { Role } from '@shared/types/work.types';

// Texts are keys of the "settings" translations.

export const SETTINGS_SECTION_IDS = [
   'task-types',
   'task-statuses',
   'stages',
   'industries',
   'rounds',
   'sources',
   'countries',
   'reasons',
   'criteria',
   'questionnaire',
   'dd-audits',
   'doc-folders',
   'doc-templates',
   'metrics',
   'report-docs',
   'flags',
   'mandate',
   'committee',
   'users',
   'roles',
   'integrations',
   'journal',
] as const;
export type SettingsSection = (typeof SETTINGS_SECTION_IDS)[number];

export const DEFAULT_SECTION: SettingsSection = 'task-types';

// The menu of Настройки in the prototype's order: groups as the fund thinks
// of them, each section with what it is for (the line under its title).
export const SETTINGS_GROUPS = [
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
      label: 'Сделки',
      sections: [
         {
            id: 'stages',
            label: 'Этапы сделки',
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
         {
            id: 'criteria',
            label: 'Критерии скрининга',
            meta: 'По чему фонд оценивает каждую сделку и какой вес у каждого критерия.',
         },
         {
            id: 'questionnaire',
            label: 'Анкета основателя',
            meta: 'Вопросы анкеты: основатель заполняет её в кабинете, фонд видит и дополняет ответы на вкладке «Скрининг и оценка».',
         },
         {
            id: 'dd-audits',
            label: 'Направления DD',
            meta: 'Какие проверки проходит каждая сделка: по карточке на вкладке «Due Diligence».',
         },
         {
            id: 'doc-folders',
            label: 'Папки документов',
            meta: 'Папки дата рума сделок и портфеля и запросов основателю.',
         },
         {
            id: 'doc-templates',
            label: 'Шаблоны документов',
            meta: 'Файлы, которые фонд отправляет заявителю с запросом: он заполняет их и возвращает.',
         },
      ],
   },
   {
      label: 'Портфель',
      sections: [
         {
            id: 'metrics',
            label: 'Показатели',
            meta: 'Что компании портфеля сообщают каждый квартал.',
         },
         {
            id: 'report-docs',
            label: 'Отчётность',
            meta: 'Документы квартального отчёта и шаблоны, которые компании заполняют.',
         },
         {
            id: 'flags',
            label: 'Флаги портфеля',
            meta: 'Пороги, после которых компания портфеля получает красный флаг.',
         },
      ],
   },
   {
      label: 'Фонд',
      sections: [
         {
            id: 'mandate',
            label: 'Мандат',
            meta: 'Во что инвестирует фонд: чек, фокус и исключения. Стадии, география и отрасли мандата отмечаются в справочниках.',
         },
         {
            id: 'committee',
            label: 'Правила ИК',
            meta: 'Кворум, материалы и как голоса превращаются в решение.',
         },
      ],
   },
   {
      label: 'Команда',
      sections: [
         {
            id: 'users',
            label: 'Пользователи',
            meta: 'Сотрудники фонда с доступом к панели: роль в системе, обязанности и уровень доступа.',
         },
         {
            id: 'roles',
            label: 'Роли',
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
            meta: 'Каждое изменение правил, справочников и пользователей: кто, когда, что было и что стало.',
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
   'task-statuses': 'taskStatuses',
   metrics: 'metrics',
   'report-docs': 'reportDocs',
   'doc-templates': 'docTemplates',
   'doc-folders': 'docFolders',
   'dd-audits': 'ddAudits',
   criteria: 'criteria',
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
   taskStatuses: {
      title: 'Статусы задач',
      one: 'статус',
      note: 'Путь задачи. Группа задаёт, как статус работает: «К выполнению» — задача ещё не начата, «В работе» — идёт, «Завершено» — закрыта (повторяющаяся задача создаёт следующую). Задачи в списке собраны по статусам.',
      keyLabel: 'Код',
      keyHint: 'латиницей через подчёркивание: on_hold',
      flag: 'group',
      flagLabel: 'Группа',
   },
   metrics: {
      title: 'Показатели',
      one: 'показатель',
      note: 'Цифры квартального отчёта компании. Runway, Churn и выручка — системные: по ним портфель получает красный флаг.',
      keyLabel: 'Код',
      keyHint: 'латиницей через подчёркивание: arpu',
      flag: 'format',
      flagLabel: 'Формат',
   },
   reportDocs: {
      title: 'Отчётность',
      one: 'документ',
      note: 'Документы, которые компания сдаёт за квартал, и шаблон каждого (Excel, Word или PowerPoint), который ей отправляют.',
      keyLabel: 'Код',
      keyHint: 'латиницей через подчёркивание: cash_flow',
      flag: 'file',
      flagLabel: 'Шаблон',
   },
   docTemplates: {
      title: 'Шаблоны документов',
      one: 'шаблон',
      note: 'Анкеты, формы и таблицы (Excel, Word, PowerPoint, PDF), которые заявитель заполняет. В «Новом запросе» шаблоны выбирают галочками — они уходят с запросом, а заполненные файлы возвращаются в data room на проверку.',
      keyLabel: 'Код',
      keyHint: 'латиницей через подчёркивание: dd_questionnaire',
      flag: 'file',
      flagLabel: 'Файл',
   },
   docFolders: {
      title: 'Папки документов',
      one: 'папка',
      note: 'Папки дата рума: в них лежат файлы сделки, а запрос документа указывает, в какую папку придёт файл. Новая папка сразу появляется у всех сделок.',
      keyLabel: 'Код',
      keyHint: 'латиницей через подчёркивание: market_research',
      flag: null,
      flagLabel: '',
   },
   criteria: {
      title: 'Критерии скрининга',
      one: 'критерий',
      note: 'Одни для всех сделок. Итоговый балл — взвешенная сумма, поэтому веса в сумме должны давать 100%. Новый критерий сразу появляется у всех сделок; оценки по удалённому не показываются.',
      keyLabel: 'Код',
      keyHint: 'латиницей через подчёркивание: esg',
      flag: 'weight',
      flagLabel: 'Вес, %',
   },
   ddAudits: {
      title: 'Направления DD',
      one: 'направление',
      note: 'Карточки вкладки «Due Diligence»: у каждой сделки по одной на строку, а их заключения идут в готовность к ИК. Новая строка сразу появляется у всех сделок.',
      keyLabel: 'Код',
      keyHint: 'латиницей через подчёркивание: esg_audit',
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
      // the list's own column: a mark, a select, or a file
      flag:
         | 'mandate'
         | 'inMandate'
         | 'onSite'
         | 'isMandate'
         | 'group'
         | 'format'
         | 'file'
         | 'weight'
         | null;
      flagLabel: string;
   }
>;

// The lists the design starts with, used until their tables have rows
// (batch 16): the data room's folders and the DD's audits.
export const BUILT_IN_LISTS: Partial<
   Record<
      ListKind,
      {
         key: string;
         names: Record<SupportedLanguageType, string>;
         hints?: Record<SupportedLanguageType, string>;
         weight?: number;
      }[]
   >
> = {
   criteria: [
      {
         key: 'team',
         names: { ru: 'Команда', uz: 'Jamoa', en: 'Team' },
         hints: {
            ru: 'Опыт основателей в отрасли, полнота команды',
            uz: 'Asoschilarning sohadagi tajribasi, jamoaning to‘liqligi',
            en: 'The founders’ experience in the industry, how complete the team is',
         },
         weight: 25,
      },
      {
         key: 'market',
         names: { ru: 'Рынок', uz: 'Bozor', en: 'Market' },
         hints: {
            ru: 'Размер и рост рынка в Центральной Азии',
            uz: 'Markaziy Osiyoda bozor hajmi va o‘sishi',
            en: 'The size and growth of the market in Central Asia',
         },
         weight: 15,
      },
      {
         key: 'product',
         names: { ru: 'Продукт', uz: 'Mahsulot', en: 'Product' },
         hints: {
            ru: 'Готовность, технологичность, защищённость',
            uz: 'Tayyorlik, texnologik daraja, himoyalanganlik',
            en: 'Readiness, technology, defensibility',
         },
         weight: 15,
      },
      {
         key: 'traction',
         names: { ru: 'Трекшн', uz: 'Trekshn', en: 'Traction' },
         hints: {
            ru: 'Выручка, клиенты, динамика',
            uz: 'Tushum, mijozlar, dinamika',
            en: 'Revenue, customers, momentum',
         },
         weight: 15,
      },
      {
         key: 'model',
         names: { ru: 'Бизнес-модель', uz: 'Biznes-model', en: 'Business model' },
         hints: {
            ru: 'Юнит-экономика и путь к прибыльности',
            uz: 'Birlik iqtisodiyoti va foydaga chiqish yo‘li',
            en: 'Unit economics and the path to profit',
         },
         weight: 10,
      },
      {
         key: 'synergy',
         names: { ru: 'Синергия с SQB', uz: 'SQB bilan sinergiya', en: 'Synergy with SQB' },
         hints: {
            ru: 'Пилот или интеграция с банком и его клиентами',
            uz: 'Bank va uning mijozlari bilan pilot yoki integratsiya',
            en: 'A pilot or integration with the bank and its customers',
         },
         weight: 20,
      },
   ],
   docFolders: [
      {
         key: 'corporate',
         names: { ru: 'Корпоративные', uz: 'Korporativ', en: 'Corporate' },
      },
      {
         key: 'financial',
         names: { ru: 'Финансовые', uz: 'Moliyaviy', en: 'Financial' },
      },
      {
         key: 'legal',
         names: { ru: 'Юридические', uz: 'Yuridik', en: 'Legal' },
      },
      {
         key: 'product',
         names: {
            ru: 'Продукт и технологии',
            uz: 'Mahsulot va texnologiyalar',
            en: 'Product and technology',
         },
      },
      { key: 'team', names: { ru: 'Команда', uz: 'Jamoa', en: 'Team' } },
      {
         key: 'market',
         names: {
            ru: 'Рынок и трекшн',
            uz: 'Bozor va trekshn',
            en: 'Market and traction',
         },
      },
      {
         key: 'investment',
         names: {
            ru: 'Инвестиционные документы',
            uz: 'Investitsiya hujjatlari',
            en: 'Investment documents',
         },
      },
   ],
   ddAudits: [
      {
         key: 'legal',
         names: {
            ru: 'Юридический аудит',
            uz: 'Yuridik audit',
            en: 'Legal audit',
         },
      },
      {
         key: 'finance',
         names: {
            ru: 'Финансовый аудит',
            uz: 'Moliyaviy audit',
            en: 'Financial audit',
         },
      },
      {
         key: 'it',
         names: { ru: 'IT-аудит', uz: 'IT-audit', en: 'IT audit' },
      },
   ],
};

// A tone's colour, for the colour picker of a status that has no colour of
// its own (the brand's: sky for the accent).
export const TONE_HEX = {
   neutral: '#8a93a6',
   accent: '#407cea',
   success: '#1f9d6b',
   warning: '#c98a12',
   danger: '#d64545',
} as const satisfies Record<ItemTone, string>;

export const QUESTION_KIND_LABELS = {
   text: 'Строка',
   area: 'Текст',
   number: 'Число',
   select: 'Выбор из списка',
   yesno: 'Да или нет',
} as const satisfies Record<QuestionKind, string>;

export const METRIC_FORMAT_LABELS = {
   usd: 'Доллары',
   percent: 'Проценты',
   months: 'Месяцы',
   number: 'Число',
} as const satisfies Record<MetricFormat, string>;

// The files a report document's template may be.
export const TEMPLATE_ACCEPT = '.xlsx,.xls,.csv,.docx,.doc,.pptx,.ppt,.pdf';

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

// The stages a fund starts with, in their order, with their default names;
// the system ones carry the platform's rules.
export const DEFAULT_STAGES = [
   { key: 'inbox', label: 'Входящие', system: true },
   { key: 'screening', label: 'Скрининг', system: true },
   { key: 'meeting', label: 'Встреча', system: false },
   { key: 'analysis', label: 'Анализ', system: false },
   { key: 'ic1', label: 'ИК-1', system: true },
   { key: 'dd', label: 'Детальный DD', system: true },
   { key: 'ic2', label: 'ИК-2', system: true },
   { key: 'board', label: 'Набсовет', system: true },
   { key: 'closing', label: 'Закрытие', system: true },
] as const;

export const ESCALATION_LABELS = {
   deputy: 'Зам. директора',
   director: 'Директор',
   ic_chair: 'Председатель ИК',
   '': '—',
} as const satisfies Record<EscalateTo, string>;

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

// The sections the rights are given for, the rows of the table.
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
   full: { label: 'Полный', tone: 'success' },
   own: { label: 'Своё', tone: 'indigo' },
   read: { label: 'Чтение', tone: 'accent' },
   none: { label: 'Нет', tone: 'neutral' },
} as const satisfies Record<Right, { label: string; tone: BadgeTone }>;

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

// The proposal for discussion (screen 25), the columns of the table: f —
// full, o — own and assigned, r — read, - — none, section by section.
export const ROLE_RIGHTS = [
   { role: 'director', rights: r('fffffffff') },
   { role: 'deputy', rights: r('fffrffff-') },
   { role: 'analyst', rights: r('oro-r-or-') },
   { role: 'manager', rights: r('orf-oror-') },
   { role: 'ic_secretary', rights: r('rfr---fr-') },
   { role: 'accountant', rights: r('r-rfrrrr-') },
] as const satisfies readonly { role: Role; rights: Right[] }[];

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
      text: 'Кабинет основателя построен (приложение startup-cabinet, те же таблицы ucode): статус заявки, запросы, документы, анкета, после инвестиции — отчёты и запросы к фонду. Заработает после развёртывания и подключения почты для кодов входа.',
      state: 'planned',
   },
] as const;

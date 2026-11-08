import type { BadgeTone } from '@shared/components';
import type {
   PartnerStatus,
   SiteCategory,
   SiteLanguage,
} from '@shared/types/site.types';
import type phrases from '../locales/ru/site.json';

type Phrase = keyof typeof phrases;

// The menu of «Сайт», in its groups.
export const SITE_GROUPS = [
   {
      label: 'Главная',
      sections: [
         {
            id: 'home_terms',
            label: 'Условия на первом экране',
            meta: 'Три строки под заголовком главной страницы.',
         },
         {
            id: 'home_stats',
            label: 'Цифры фонда',
            meta: 'Блок «Наша история». Число компаний и выходов сайт считает сам по портфелю.',
         },
         {
            id: 'benefits',
            label: 'Что получают основатели',
            meta: 'Карточки на главной и на странице «Основателям».',
         },
         {
            id: 'process',
            label: 'Этапы заявки',
            meta: 'Как движется заявка: карточки на главной странице.',
         },
         {
            id: 'for_startups',
            label: 'Блок «Стартапам»',
            meta: 'Список в карточке на главной странице.',
         },
         {
            id: 'for_investors',
            label: 'Блок «Инвесторам»',
            meta: 'Список в карточке на главной странице.',
         },
      ],
   },
   {
      label: 'Основателям',
      sections: [
         {
            id: 'beliefs',
            label: 'В кого мы верим',
            meta: 'Первый блок страницы «Основателям».',
         },
         {
            id: 'programs',
            label: 'Программы',
            meta: 'Программы для основателей, у каждой своя метка.',
         },
         {
            id: 'timeline',
            label: 'От заявки до инвестиции',
            meta: 'Этапы и сколько занимает каждый.',
         },
         {
            id: 'documents',
            label: 'Что подготовить',
            meta: 'Документы для due diligence.',
         },
         {
            id: 'founder_statuses',
            label: 'Статусы заявки',
            meta: 'Список в блоке «Аккаунт основателя».',
         },
         {
            id: 'pitch_faq',
            label: 'Вопросы в форме заявки',
            meta: 'Вопросы рядом с формой Pitch Us.',
         },
      ],
   },
   {
      label: 'О фонде',
      sections: [
         {
            id: 'history',
            label: 'История',
            meta: 'События по годам на странице «О фонде».',
         },
      ],
   },
   {
      label: 'Инвестиционный фокус',
      sections: [
         {
            id: 'facts',
            label: 'Условия инвестиций',
            meta: 'Стадия, сумма, инструмент и доля.',
         },
         {
            id: 'sectors',
            label: 'Секторы',
            meta: 'Карточки секторов и их пункты.',
         },
         {
            id: 'anti_thesis',
            label: 'Анти-тезис',
            meta: 'Во что фонд не инвестирует.',
         },
         {
            id: 'geography',
            label: 'География',
            meta: 'Регионы, в которые инвестирует фонд.',
         },
         {
            id: 'three_yes',
            label: 'Три «да»',
            meta: 'Блок Smart Capital.',
         },
      ],
   },
   {
      label: 'Портфель',
      sections: [
         {
            id: 'portfolio',
            label: 'Портфель на сайте',
            meta: 'Компании, которые видят посетители. Это отдельный список: внутренний портфель фонда на сайт сам не попадает.',
         },
      ],
   },
   {
      label: 'Аналитика',
      sections: [
         {
            id: 'news',
            label: 'Новости',
            meta: 'Новости фонда и упоминания в прессе. На сайт попадают только опубликованные.',
         },
         {
            id: 'sources',
            label: 'Источники',
            meta: 'Медиа и отраслевые отчёты, на которые ссылается раздел «Аналитика».',
         },
      ],
   },
   {
      label: 'Инвесторам',
      sections: [
         {
            id: 'investor_benefits',
            label: 'Что получают партнёры',
            meta: 'Карточки на странице «Инвесторам».',
         },
      ],
   },
   {
      label: 'Контакты и FAQ',
      sections: [
         {
            id: 'faq',
            label: 'FAQ',
            meta: 'Частые вопросы на странице «Контакты». Порядок на сайте такой же, как здесь.',
         },
         {
            id: 'contacts',
            label: 'Адреса и контакты',
            meta: 'Адрес, почта, телефон, часы работы и соцсети для страницы «Контакты» и подвала сайта.',
         },
         {
            id: 'partners',
            label: 'Заявки партнёров',
            meta: 'Обращения из формы «Стать партнёром». Заявки стартапов приходят в «Сделки».',
         },
      ],
   },
   {
      label: 'Оформление и документы',
      sections: [
         {
            id: 'media',
            label: 'Логотипы и видео',
            meta: 'Логотипы в шапке и подвале, видео на страницах «Основателям» и «Инвесторам».',
         },
         {
            id: 'legal',
            label: 'Служебные страницы',
            meta: 'Политика конфиденциальности и другие страницы со свободным текстом.',
         },
      ],
   },
] as const;

export type SiteSection =
   (typeof SITE_GROUPS)[number]['sections'][number]['id'];

export const DEFAULT_SITE_SECTION: SiteSection = 'home_terms';

export const sectionInfo = (id: SiteSection) =>
   SITE_GROUPS.flatMap(({ sections }) => [...sections]).find(
      (section) => section.id === id,
   ) as (typeof SITE_GROUPS)[number]['sections'][number];

export const isSiteSection = (id: string | undefined): id is SiteSection =>
   SITE_GROUPS.some(({ sections }) =>
      sections.some((section) => section.id === id),
   );

// A column of a table: a text in each language, unless it is plain.
export interface SiteField {
   slug: string;
   label: Phrase;
   long?: boolean;
   plain?: boolean;
   optional?: boolean; // a row may go without it
   options?: readonly (readonly [string, Phrase])[]; // a choice, not a text
   inForm?: boolean; // only in the form, too much for the table
}

const TITLE_TEXT: SiteField[] = [
   { slug: 'title', label: 'Заголовок' },
   { slug: 'text', label: 'Описание', long: true },
];
const LINE: SiteField[] = [{ slug: 'text', label: 'Строка', long: true }];

export interface SiteTableInfo {
   table: string;
   path: string; // the page it stands on
   icon?: boolean;
   fields: readonly SiteField[];
}

// A table for each array of the website's code (docs/ucode-migration.md, batch 20).
export const SITE_TABLES = {
   home_terms: {
      table: 'site_home_terms',
      path: '/',
      fields: [
         { slug: 'label', label: 'Название' },
         { slug: 'value', label: 'Значение' },
      ],
   },
   home_stats: {
      table: 'site_home_stats',
      path: '/',
      fields: [
         { slug: 'value', label: 'Цифра', plain: true },
         { slug: 'caption', label: 'Подпись' },
      ],
   },
   for_startups: { table: 'site_for_startups', path: '/', fields: LINE },
   for_investors: { table: 'site_for_investors', path: '/', fields: LINE },
   programs: {
      table: 'site_programs',
      path: '/startups',
      fields: [
         { slug: 'title', label: 'Название' },
         { slug: 'text', label: 'Описание', long: true },
         {
            slug: 'tag',
            label: 'Метка',
            plain: true,
            options: [
               ['open', 'Открыта'],
               ['planned', 'В планах'],
               ['', 'Без метки'],
            ],
         },
      ],
   },
   founder_statuses: {
      table: 'site_founder_statuses',
      path: '/startups',
      fields: LINE,
   },
   benefits: {
      table: 'site_benefits',
      path: '/',
      icon: true,
      fields: TITLE_TEXT,
   },
   process: { table: 'site_process', path: '/', fields: TITLE_TEXT },
   beliefs: { table: 'site_beliefs', path: '/startups', fields: LINE },
   timeline: {
      table: 'site_timeline',
      path: '/startups',
      fields: [
         { slug: 'step', label: 'Этап' },
         { slug: 'duration', label: 'Сколько занимает' },
      ],
   },
   documents: { table: 'site_documents', path: '/startups', fields: LINE },
   pitch_faq: {
      table: 'site_pitch_faq',
      path: '/apply',
      fields: [
         { slug: 'question', label: 'Вопрос', long: true },
         { slug: 'answer', label: 'Ответ', long: true },
      ],
   },
   history: {
      table: 'site_history',
      path: '/about',
      fields: [
         { slug: 'year', label: 'Год', plain: true },
         { slug: 'text', label: 'Что произошло', long: true },
      ],
   },
   facts: {
      table: 'site_facts',
      path: '/focus',
      fields: [
         { slug: 'label', label: 'Название' },
         { slug: 'value', label: 'Значение' },
      ],
   },
   sectors: {
      table: 'site_sectors',
      path: '/focus',
      icon: true,
      fields: [
         { slug: 'title', label: 'Сектор' },
         {
            slug: 'point1_label',
            label: 'Подпись первого пункта',
            inForm: true,
         },
         { slug: 'point1_text', label: 'Текст первого пункта', long: true },
         {
            slug: 'point2_label',
            label: 'Подпись второго пункта',
            optional: true,
            inForm: true,
         },
         {
            slug: 'point2_text',
            label: 'Текст второго пункта',
            long: true,
            optional: true,
         },
      ],
   },
   anti_thesis: { table: 'site_anti_thesis', path: '/focus', fields: LINE },
   geography: {
      table: 'site_geography',
      path: '/focus',
      icon: true,
      fields: TITLE_TEXT,
   },
   three_yes: { table: 'site_three_yes', path: '/focus', fields: TITLE_TEXT },
   investor_benefits: {
      table: 'site_investor_benefits',
      path: '/investors',
      icon: true,
      fields: TITLE_TEXT,
   },
   faq: {
      table: 'site_faq',
      path: '/contacts',
      fields: [
         { slug: 'question', label: 'Вопрос', long: true },
         { slug: 'answer', label: 'Ответ', long: true },
      ],
   },
} as const satisfies Record<string, SiteTableInfo>;

export type SiteTableId = keyof typeof SITE_TABLES;

export const isSiteTable = (id: SiteSection): id is SiteTableId =>
   id in SITE_TABLES;

export const SITE_LANGUAGES: SiteLanguage[] = ['ru', 'uz', 'en'];

export const LANGUAGE_NAMES: Record<SiteLanguage, string> = {
   ru: 'Русский',
   uz: 'Oʻzbekcha',
   en: 'English',
};

export const CATEGORY_LABELS = {
   Fund: 'Фонд',
   Portfolio: 'Портфель',
   Events: 'События',
   Market: 'Рынок',
   Press: 'Пресса о нас',
} as const satisfies Record<SiteCategory, string>;

export const PARTNER_STATUS_INFO = {
   new: { label: 'Новая', tone: 'accent' },
   in_work: { label: 'В работе', tone: 'warning' },
   closed: { label: 'Закрыта', tone: 'neutral' },
} as const satisfies Record<PartnerStatus, { label: string; tone: BadgeTone }>;

// Who changes the website: the panel's menu, and the website's own check.

export const SITE_FILES_FOLDER = 'Website';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

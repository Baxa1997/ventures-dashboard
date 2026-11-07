import {
   CHAT_PATH,
   FINANCE_PATH,
   MY_DAY_PATH,
   OVERVIEW_PATH,
   SECTION_LABELS,
   SECTION_PATHS,
   SETTINGS_PATH,
   SITE_PATH,
} from '@shared/constants';
import type { Section, SectionCounters } from '@shared/types/work.types';
import {
   ArrowLeftRight,
   Briefcase,
   ChartColumn,
   FileSignature,
   FolderOpen,
   Gavel,
   Globe,
   Handshake,
   LayoutDashboard,
   ListChecks,
   type LucideIcon,
   MessagesSquare,
   Receipt,
   Settings,
   ShoppingCart,
   Sun,
} from 'lucide-react';

const SECTION_ICONS: Record<Section, LucideIcon> = {
   tasks: ListChecks,
   deals: Handshake,
   committee: Gavel,
   portfolio: Briefcase,
   documents: FolderOpen,
   contracts: FileSignature,
   procurement: ShoppingCart,
};

// What opens: the note on hover.
const SECTION_HINTS = {
   tasks: 'Все задачи: список, доска, календарь, таймлайн',
   deals: 'Воронка сделок от заявки до решения ИК',
   committee: 'Заседания ИК и наблюдательного совета, решения и протоколы',
   portfolio: 'Портфельные компании фонда и их отчётность',
   documents: 'Документы фонда и файлы всех модулей',
   contracts: 'Реестр договоров фонда',
   procurement: 'Заявки на закупку товаров и услуг',
} as const satisfies Record<Section, string>;

const section = (id: Section) => ({
   label: SECTION_LABELS[id],
   hint: SECTION_HINTS[id],
   to: SECTION_PATHS[id],
   icon: SECTION_ICONS[id],
   counter: id as keyof SectionCounters,
});

// Sidebar sections. Labels are keys of the "layout" translations; "counter"
// names the figure shown at the end of the row.
export const NAV_GROUPS = [
   {
      label: 'Главное',
      items: [
         {
            label: 'Дашборд',
            hint: 'Сводка по воронке сделок, портфелю и вашим задачам',
            to: OVERVIEW_PATH,
            icon: LayoutDashboard,
            counter: null,
         },
      ],
   },
   {
      label: 'Работа',
      items: [
         {
            label: 'Мой день',
            hint: 'Что ждёт вас сегодня: задачи, согласования, заседания',
            to: MY_DAY_PATH,
            icon: Sun,
            counter: 'myDay',
         },
         section('tasks'),
         {
            label: 'Чат и письма',
            hint: 'Группы сделок: переписка команды по каждой сделке',
            to: CHAT_PATH,
            icon: MessagesSquare,
            counter: 'chat',
         },
      ],
   },
   {
      label: 'Инвестиции',
      items: [section('deals'), section('committee'), section('portfolio')],
   },
   // as the prototype's menu: the reports first, then their operations
   {
      label: 'Финансы',
      items: [
         {
            label: 'P&L',
            hint: 'Доходы и расходы фонда по месяцам против бюджета',
            to: `${FINANCE_PATH}/pnl`,
            icon: ChartColumn,
            counter: null,
         },
         {
            label: 'Cash Flow',
            hint: 'Движение денег на счетах фонда по видам деятельности',
            to: `${FINANCE_PATH}/cash-flow`,
            icon: ArrowLeftRight,
            counter: null,
         },
         {
            label: 'Транзакции',
            hint: 'Операции из банковских выписок и их статьи',
            to: `${FINANCE_PATH}/transactions`,
            icon: Receipt,
            counter: 'finance',
         },
      ],
   },
   {
      label: 'Фонд',
      items: [
         section('documents'),
         section('contracts'),
         section('procurement'),
         {
            label: 'Сайт',
            hint: 'Данные сайта: таблицы разделов, портфель, новости, FAQ и контакты',
            to: SITE_PATH,
            icon: Globe,
            counter: null,
         },
      ],
   },
] as const;

export const SETTINGS_ITEM = {
   label: 'Настройки',
   hint: 'Правила фонда, справочники и сотрудники',
   to: SETTINGS_PATH,
   icon: Settings,
} as const;

// A menu item's name: a key of the "layout" translations.
export type NavLabel =
   | (typeof NAV_GROUPS)[number]['items'][number]['label']
   | typeof SETTINGS_ITEM.label;

// Every item of the menu, in its order, for the search.
export const MENU_ITEMS = [
   ...NAV_GROUPS.flatMap(
      (group): readonly { label: NavLabel; to: string; icon: LucideIcon }[] =>
         group.items,
   ),
   SETTINGS_ITEM,
];

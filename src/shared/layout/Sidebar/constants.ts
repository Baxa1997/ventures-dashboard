import {
   MY_DAY_PATH,
   OVERVIEW_PATH,
   SECTION_LABELS,
   SECTION_PATHS,
   SETTINGS_PATH,
} from '@shared/constants';
import type { Section, SectionCounters } from '@shared/types/work.types';
import {
   Briefcase,
   FileSignature,
   FolderOpen,
   Gavel,
   Handshake,
   LayoutDashboard,
   ListChecks,
   type LucideIcon,
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

const section = (id: Section) => ({
   label: SECTION_LABELS[id],
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
            to: MY_DAY_PATH,
            icon: Sun,
            counter: 'myDay',
         },
         section('tasks'),
      ],
   },
   {
      label: 'Инвестиции',
      items: [section('deals'), section('committee'), section('portfolio')],
   },
   // Финансы and Корреспонденция join it as their tables are made in ucode
   // (docs/ERP.md §1).
   {
      label: 'Фонд',
      items: [
         section('documents'),
         section('contracts'),
         section('procurement'),
      ],
   },
] as const;

export const SETTINGS_ITEM = {
   label: 'Настройки',
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

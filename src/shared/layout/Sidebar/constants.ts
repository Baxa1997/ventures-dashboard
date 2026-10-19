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
   CalendarCheck,
   Folder,
   Funnel,
   Landmark,
   LayoutGrid,
   ListChecks,
   type LucideIcon,
   SlidersHorizontal,
} from 'lucide-react';

const SECTION_ICONS: Record<Section, LucideIcon> = {
   tasks: ListChecks,
   deals: Funnel,
   committee: Landmark,
   portfolio: Briefcase,
   documents: Folder,
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
      label: 'Работа',
      items: [
         { label: 'Обзор', to: OVERVIEW_PATH, icon: LayoutGrid, counter: null },
         {
            label: 'Мой день',
            to: MY_DAY_PATH,
            icon: CalendarCheck,
            counter: 'myDay',
         },
         section('tasks'),
      ],
   },
   {
      label: 'Инвестиции',
      items: [section('deals'), section('committee'), section('portfolio')],
   },
   // Финансы, Договоры, Закупки and Корреспонденция join it as their tables
   // are made in ucode (docs/ERP.md §1).
   {
      label: 'Фонд',
      items: [section('documents')],
   },
] as const;

export const SETTINGS_ITEM = {
   label: 'Настройки',
   to: SETTINGS_PATH,
   icon: SlidersHorizontal,
} as const;

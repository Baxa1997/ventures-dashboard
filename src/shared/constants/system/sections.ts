import type { Section } from '@shared/types/work.types';

// Labels are keys of the "layout" translations.
export const SECTION_LABELS = {
   tasks: 'Задачи',
   deals: 'Сделки',
   committee: 'Инвесткомитет',
   portfolio: 'Портфель',
   finance: 'Финансы',
   contracts: 'Договоры',
   procurement: 'Закупки',
   correspondence: 'Корреспонденция',
   documents: 'Документы',
} as const satisfies Record<Section, string>;

export const SECTION_PATHS = {
   tasks: '/work/tasks',
   deals: '/deals',
   committee: '/committee',
   portfolio: '/portfolio',
   finance: '/finance',
   contracts: '/contracts',
   procurement: '/procurement',
   correspondence: '/correspondence',
   documents: '/documents',
} as const satisfies Record<Section, string>;

export const OVERVIEW_PATH = '/work/overview';
export const MY_DAY_PATH = '/work/my-day';
export const SETTINGS_PATH = '/settings';
export const LOGIN_PATH = '/login';

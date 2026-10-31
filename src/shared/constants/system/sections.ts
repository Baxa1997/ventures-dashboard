import type { Section } from '@shared/types/work.types';

// Labels are keys of the "layout" translations.
export const SECTION_LABELS = {
   tasks: 'Задачи',
   deals: 'Сделки',
   committee: 'Инвесткомитет',
   portfolio: 'Портфель',
   documents: 'Документы',
   contracts: 'Договоры',
   procurement: 'Закупки',
} as const satisfies Record<Section, string>;

export const SECTION_PATHS = {
   tasks: '/work/tasks',
   deals: '/deals',
   committee: '/committee',
   portfolio: '/portfolio',
   documents: '/documents',
   contracts: '/contracts',
   procurement: '/procurement',
} as const satisfies Record<Section, string>;

export const OVERVIEW_PATH = '/work/overview';
export const MY_DAY_PATH = '/work/my-day';
export const SETTINGS_PATH = '/settings';
export const LOGIN_PATH = '/login';

export const DATE_FORMAT = 'YYYY-MM-DD';

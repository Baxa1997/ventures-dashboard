// Texts are keys of the "procurement" translations.

// Who approved a request that stayed within its category's limit: nobody had to.
export const AUTO_APPROVED = 'auto';

// A new category's limit, and a stage's mark where a category is gone.
export const DEFAULT_LIMIT = 5000;

// A new request is needed this many days from today, unless changed.
export const NEED_DAYS = 21;

export const LIST_VIEWS = ['table', 'board'] as const;
export type ListView = (typeof LIST_VIEWS)[number];

export const LIST_VIEW_LABELS = {
   table: 'Таблица',
   board: 'Канбан',
} as const satisfies Record<ListView, string>;

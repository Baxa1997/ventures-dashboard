export const SUPPORTED_LANGUAGES = ['uz', 'ru', 'en'] as const;

export const DEFAULT_LANGUAGE = 'ru';

/* The languages the interface is shown in. Russian only for now (the
   client's wish, 24 Oct 2026): the panel opens in Russian whatever was
   chosen before, and the switcher is hidden. The Uzbek and English texts stay
   in the locale files; add them back here to offer them again. */
export const INTERFACE_LANGUAGES: readonly (typeof SUPPORTED_LANGUAGES)[number][] =
   ['ru'];

// dayjs locale that formats dates for each interface language
export const DAYJS_LOCALES = { uz: 'uz-latn', ru: 'ru', en: 'en' } as const;

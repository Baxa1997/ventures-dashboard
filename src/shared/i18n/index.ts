import {
   DAYJS_LOCALES,
   DEFAULT_LANGUAGE,
   INTERFACE_LANGUAGES,
   SUPPORTED_LANGUAGES,
} from '@shared/constants/system/languages';
import type { SupportedLanguageType } from '@shared/types/system/language.types';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import 'dayjs/locale/uz-latn';
import updateLocale from 'dayjs/plugin/updateLocale';
import i18n, { type InitOptions } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './en';
import ru from './ru';
import uz from './uz';

export const resources = { uz, ru, en } as const;

// Short Russian months as the design writes them: "5 окт", not "5 окт.".
dayjs.extend(updateLocale);
dayjs.updateLocale('ru', {
   monthsShort: 'янв_фев_мар_апр_май_июн_июл_авг_сен_окт_ноя_дек'.split('_'),
});

const isSupported = (language: string): language is SupportedLanguageType =>
   SUPPORTED_LANGUAGES.some((supported) => supported === language);

// Dates and the document language follow the interface language. Registered
// before init so it also runs for the language detected at startup.
i18n.on('languageChanged', (language) => {
   const current = isSupported(language) ? language : DEFAULT_LANGUAGE;
   dayjs.locale(DAYJS_LOCALES[current]);
   document.documentElement.lang = current;
});

const options: InitOptions = {
   debug: false,
   defaultNS: 'components',
   fallbackLng: DEFAULT_LANGUAGE,
   interpolation: { escapeValue: false },
   // Keys are whole Russian phrases, so a dot or a colon inside one is
   // punctuation, not a path into nested keys or a namespace prefix.
   keySeparator: false,
   nsSeparator: false,
   resources,
   // with one interface language, it is the language, whatever was kept
   ...(INTERFACE_LANGUAGES.length === 1 && { lng: INTERFACE_LANGUAGES[0] }),
   supportedLngs: SUPPORTED_LANGUAGES,
   detection: {
      caches: ['localStorage'],
      order: ['querystring', 'localStorage'],
   },
};

i18n.use(LanguageDetector).use(initReactI18next).init(options);

declare module 'i18next' {
   interface CustomTypeOptions {
      defaultNS: 'components';
      resources: typeof resources.ru;
   }
}

export default i18n;

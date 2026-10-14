import auth from '@modules/Auth/locales/en';
import deals from '@modules/Deals/locales/en';
import work from '@modules/Work/locales/en';
import type { RuTranslation } from '../ru';
import components from './components.json';
import layout from './layout.json';
import validation from './validation.json';

// Typed against the Russian resources, so a missing key fails the type check.
const en: RuTranslation = {
   ...auth,
   ...deals,
   ...work,
   components,
   layout,
   validation,
};

export default en;

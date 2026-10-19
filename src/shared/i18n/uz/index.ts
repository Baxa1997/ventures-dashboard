import auth from '@modules/Auth/locales/uz';
import committee from '@modules/Committee/locales/uz';
import deals from '@modules/Deals/locales/uz';
import documents from '@modules/Documents/locales/uz';
import portfolio from '@modules/Portfolio/locales/uz';
import settings from '@modules/Settings/locales/uz';
import work from '@modules/Work/locales/uz';
import type { RuTranslation } from '../ru';
import components from './components.json';
import layout from './layout.json';
import validation from './validation.json';

// Typed against the Russian resources, so a missing key fails the type check.
const uz: RuTranslation = {
   ...auth,
   ...committee,
   ...deals,
   ...documents,
   ...portfolio,
   ...settings,
   ...work,
   components,
   layout,
   validation,
};

export default uz;

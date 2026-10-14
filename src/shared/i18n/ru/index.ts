import auth from '@modules/Auth/locales/ru';
import committee from '@modules/Committee/locales/ru';
import contracts from '@modules/Contracts/locales/ru';
import correspondence from '@modules/Correspondence/locales/ru';
import deals from '@modules/Deals/locales/ru';
import documents from '@modules/Documents/locales/ru';
import finance from '@modules/Finance/locales/ru';
import portfolio from '@modules/Portfolio/locales/ru';
import procurement from '@modules/Procurement/locales/ru';
import settings from '@modules/Settings/locales/ru';
import work from '@modules/Work/locales/ru';
import components from './components.json';
import layout from './layout.json';
import validation from './validation.json';

const ru = {
   ...auth,
   ...committee,
   ...contracts,
   ...correspondence,
   ...deals,
   ...documents,
   ...finance,
   ...portfolio,
   ...procurement,
   ...settings,
   ...work,
   components,
   layout,
   validation,
} as const;

export type RuTranslation = typeof ru;

export default ru;

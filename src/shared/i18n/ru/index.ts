import auth from '@modules/Auth/locales/ru';
import work from '@modules/Work/locales/ru';
import components from './components.json';
import layout from './layout.json';
import validation from './validation.json';

const ru = {
   ...auth,
   ...work,
   components,
   layout,
   validation,
} as const;

export type RuTranslation = typeof ru;

export default ru;

import { SUPPORTED_LANGUAGES } from '@shared/constants';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

// Shown inside the user menu of the sidebar, on its dark surface.
const Language = () => {
   const { t, i18n } = useTranslation('layout');

   return (
      <div role='group' aria-label={t('Язык')} className='flex gap-1'>
         {SUPPORTED_LANGUAGES.map((language) => {
            const active = i18n.resolvedLanguage === language;
            return (
               <button
                  key={language}
                  type='button'
                  aria-pressed={active}
                  className={clsx(
                     'flex-1 rounded-md py-1.5 text-[11px] font-semibold uppercase transition-colors',
                     active
                        ? 'bg-white/15 text-white'
                        : 'text-on-dark-soft hover:bg-white/10 hover:text-white',
                  )}
                  onClick={() => i18n.changeLanguage(language)}
               >
                  {language}
               </button>
            );
         })}
      </div>
   );
};

export default Language;

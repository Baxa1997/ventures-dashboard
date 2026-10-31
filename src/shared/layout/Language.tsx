import { INTERFACE_LANGUAGES } from '@shared/constants';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

// Shown inside the user menu of the top bar.
const Language = () => {
   const { t, i18n } = useTranslation('layout');

   return (
      <div role='group' aria-label={t('Язык')} className='flex gap-1'>
         {INTERFACE_LANGUAGES.map((language) => {
            const active = i18n.resolvedLanguage === language;
            return (
               <button
                  key={language}
                  type='button'
                  aria-pressed={active}
                  className={clsx(
                     'flex-1 rounded-md py-1.5 text-[11px] font-semibold uppercase transition-colors',
                     active
                        ? 'bg-accent-tint text-ink-strong'
                        : 'text-ink-soft hover:bg-hover hover:text-ink',
                  )}
                  data-hint={t('Сменить язык панели: {{language}}', {
                     language: language.toUpperCase(),
                  })}
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

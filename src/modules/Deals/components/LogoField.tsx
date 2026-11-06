import { getInitials } from '@shared/components/Avatar';
import { Trash2, Upload } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

// What a logo may be: PNG, JPG, SVG or WEBP up to 2 MB.
const TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

// The logo as the form holds it: the one kept, or a file picked to replace it.
export interface LogoValue {
   url: string; // the stored logo; '' for none
   file: File | null; // picked, uploaded when the form is saved
}

interface LogoFieldProps {
   name: string; // the company, for its initials while there is no logo
   value: LogoValue;
   error?: string;
   onChange: (value: LogoValue) => void;
   onError: (message: string) => void;
}

const SMALL_BUTTON =
   'border-line text-ink hover:bg-hover inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs font-semibold';

/* «Логотип», as the prototype has it: the logo or the initials on a 64px
   square, a button to pick a file (or to replace it) and one to take it off.
   The file is checked here and uploaded only when the form is saved. */
const LogoField = ({
   name,
   value,
   error,
   onChange,
   onError,
}: LogoFieldProps) => {
   const { t } = useTranslation('deals');
   const inputId = useId();
   const [preview, setPreview] = useState('');

   useEffect(() => {
      if (!value.file) return setPreview('');
      const url = URL.createObjectURL(value.file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
   }, [value.file]);

   const shown = preview || value.url;

   return (
      <div className='flex items-center gap-3.5'>
         <span
            aria-hidden
            className={
               shown
                  ? 'border-line grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white'
                  : 'bg-accent-tint text-accent-strong grid size-16 shrink-0 place-items-center rounded-xl text-lg font-extrabold'
            }
         >
            {shown ? (
               <img alt='' className='size-full object-contain' src={shown} />
            ) : (
               getInitials(name || '?')
            )}
         </span>
         <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap gap-2'>
               <label
                  className={SMALL_BUTTON}
                  data-hint={t(
                     'Выбрать файл логотипа: он сохранится вместе с данными',
                  )}
                  htmlFor={inputId}
               >
                  <Upload aria-hidden className='size-3.5' />
                  {shown ? t('Заменить') : t('Загрузить логотип')}
               </label>
               <input
                  accept={TYPES.join(',')}
                  className='sr-only'
                  id={inputId}
                  type='file'
                  onChange={(event) => {
                     const file = event.target.files?.[0];
                     event.target.value = '';
                     if (!file) return;
                     if (!TYPES.includes(file.type))
                        return onError(t('Нужен файл PNG, JPG, SVG или WEBP'));
                     if (file.size > MAX_BYTES)
                        return onError(t('Файл больше 2 МБ'));
                     onChange({ ...value, file });
                  }}
               />
               {shown && (
                  <button
                     type='button'
                     className={SMALL_BUTTON}
                     data-hint={t(
                        'Убрать логотип: вместо него будут инициалы компании',
                     )}
                     onClick={() => onChange({ url: '', file: null })}
                  >
                     <Trash2 aria-hidden className='size-3.5' />
                     {t('Удалить')}
                  </button>
               )}
            </div>
            <p
               className={
                  error
                     ? 'text-danger mt-1.5 text-xs'
                     : 'text-ink-soft mt-1.5 text-xs'
               }
            >
               {error ||
                  t(
                     'PNG, JPG, SVG или WEBP до 2 МБ, лучше квадратный. Показывается в списке и карточке сделки.',
                  )}
            </p>
         </div>
      </div>
   );
};

export default LogoField;

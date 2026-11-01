import { Button, Field, Spinner } from '@shared/components';
import { toast } from '@shared/helpers/toast';
import type { Localized, SiteLanguage } from '@shared/types/site.types';
import clsx from 'clsx';
import { ExternalLink, Upload, X } from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_NAMES, SITE_LANGUAGES } from '../../constants';
import site from '../../services';

// Which languages a record is written in.
export const LangMarks = ({ filled }: { filled: SiteLanguage[] }) => (
   <span className='flex gap-1'>
      {SITE_LANGUAGES.map((language) => (
         <span
            key={language}
            className={clsx(
               'rounded px-1 text-[10px] leading-4 font-semibold uppercase',
               filled.includes(language)
                  ? 'bg-success-tint text-success-ink'
                  : 'bg-ground text-ink-faint',
            )}
         >
            {language}
         </span>
      ))}
   </span>
);

// The three languages of a form, each with a mark when it is written.
export const LangTabs = ({
   value,
   filled,
   onChange,
}: {
   value: SiteLanguage;
   filled: SiteLanguage[];
   onChange: (language: SiteLanguage) => void;
}) => {
   const { t } = useTranslation('site');
   return (
      <div
         role='tablist'
         aria-label={t('Язык текста')}
         className='border-line flex gap-1 border-b'
      >
         {SITE_LANGUAGES.map((language) => (
            <button
               key={language}
               type='button'
               role='tab'
               aria-selected={language === value}
               className={clsx(
                  'text-meta -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 font-semibold',
                  language === value
                     ? 'border-accent text-ink-strong'
                     : 'text-ink-soft hover:text-ink border-transparent',
               )}
               data-hint={
                  filled.includes(language)
                     ? t('Открыть текст на этом языке')
                     : t(
                          'Текста на этом языке пока нет: сайт покажет другой язык',
                       )
               }
               onClick={() => onChange(language)}
            >
               <span
                  aria-hidden
                  className={clsx(
                     'size-1.5 rounded-full',
                     filled.includes(language)
                        ? 'bg-success'
                        : 'bg-line-strong',
                  )}
               />
               {LANGUAGE_NAMES[language]}
            </button>
         ))}
      </div>
   );
};

// A text in each language: three fields side by side on a wide form.
export const LocalizedRow = ({
   label,
   value,
   rows = 2,
   onChange,
}: {
   label: string;
   value: Localized;
   rows?: number;
   onChange: (value: Localized) => void;
}) => (
   <div className='grid gap-3 md:grid-cols-3'>
      {SITE_LANGUAGES.map((language) => (
         <Field key={language} label={`${label}, ${language.toUpperCase()}`}>
            {rows > 1 ? (
               <textarea
                  className='field-input'
                  rows={rows}
                  value={value[language]}
                  onChange={(event) =>
                     onChange({ ...value, [language]: event.target.value })
                  }
               />
            ) : (
               <input
                  className='field-input'
                  value={value[language]}
                  onChange={(event) =>
                     onChange({ ...value, [language]: event.target.value })
                  }
               />
            )}
         </Field>
      ))}
   </div>
);

// A file of the website: picked and stored at once, its address kept.
export const FileField = ({
   label,
   hint,
   value,
   kind,
   maxBytes,
   dark = false,
   onChange,
}: {
   label: string;
   hint?: string;
   value: string;
   kind: 'image' | 'video';
   maxBytes: number;
   dark?: boolean; // shown on a dark ground, as a white logo is
   onChange: (address: string) => void;
}) => {
   const { t } = useTranslation('site');
   const input = useRef<HTMLInputElement>(null);
   const [uploading, setUploading] = useState(false);

   const upload = async (file: File | undefined) => {
      if (!file) return;
      if (file.size > maxBytes) {
         toast.error(
            t('Файл слишком большой'),
            t('Можно до {{size}} МБ.', {
               size: Math.round(maxBytes / 1024 / 1024),
            }),
         );
         return;
      }
      setUploading(true);
      try {
         onChange((await site.uploadFile(file)).url);
      } catch (failure) {
         console.error(failure);
         toast.error(t('Не удалось загрузить файл'));
      } finally {
         setUploading(false);
      }
   };

   return (
      <Field hint={hint} label={label}>
         {value &&
            (kind === 'image' ? (
               <img
                  alt=''
                  className={clsx(
                     'border-line h-24 w-full rounded-lg border object-contain p-3',
                     dark ? 'bg-navy' : 'bg-ground',
                  )}
                  src={value}
               />
            ) : (
               <video
                  controls
                  className='border-line max-h-40 w-full rounded-lg border bg-black'
                  preload='metadata'
                  src={value}
               />
            ))}
         <span className='flex flex-wrap items-center gap-2'>
            <Button
               hint={
                  value
                     ? t('Выбрать другой файл вместо этого')
                     : t('Выбрать файл с компьютера')
               }
               loading={uploading}
               size='sm'
               variant='ghost'
               onClick={() => input.current?.click()}
            >
               {uploading ? (
                  <Spinner className='size-3.5' />
               ) : (
                  <Upload aria-hidden />
               )}
               {value ? t('Заменить') : t('Загрузить')}
            </Button>
            {value && (
               <button
                  type='button'
                  className='text-ink-soft hover:text-danger text-meta inline-flex items-center gap-1'
                  data-hint={t(
                     'Убрать этот файл: на сайте снова будет прежний вид',
                  )}
                  onClick={() => onChange('')}
               >
                  <X aria-hidden className='size-3.5' />
                  {t('Убрать')}
               </button>
            )}
         </span>
         <input
            ref={input}
            hidden
            accept={kind === 'image' ? 'image/*' : 'video/*'}
            type='file'
            onChange={(event) => {
               void upload(event.target.files?.[0]);
               event.target.value = '';
            }}
         />
      </Field>
   );
};

// A page of the website, opened in a new tab.
export const OnSite = ({
   path,
   children,
}: {
   path: string;
   children?: ReactNode;
}) => {
   const { t } = useTranslation('site');
   return (
      <a
         className='link inline-flex items-center gap-1 whitespace-nowrap'
         data-hint={t('Открыть эту страницу сайта в новой вкладке')}
         href={site.pageUrl(path)}
         rel='noreferrer'
         target='_blank'
      >
         {children ?? t('На сайте')}
         <ExternalLink aria-hidden className='size-3.5' />
      </a>
   );
};

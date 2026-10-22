import { INDUSTRY_MANDATES, LISTS } from '@modules/Settings/constants';
import settings, { listOf } from '@modules/Settings/services';
import {
   Button,
   Checkbox,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type {
   IndustryMandate,
   ListItem,
   ListItemInput,
   ListKind,
} from '@shared/types/settings.types';
import type { SupportedLanguageType } from '@shared/types/system/language.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ListItemDialogProps {
   kind: ListKind;
   item: ListItem | null; // null: a new row
   open: boolean;
   onClose: () => void;
}

const NAME_MAX = 80;

const LANGUAGES = [
   ['ru', 'Название (рус.)'],
   ['uz', 'Название (узб.)'],
   ['en', 'Название (англ.)'],
] as const satisfies readonly (readonly [SupportedLanguageType, string])[];

// How each list writes its keys: industries as the website's ids
// (e-commerce), countries as ISO codes (KZ), the rest with underscores.
const KEY_PATTERNS: Record<ListKind, RegExp> = {
   industries: /^[a-z0-9]+(-[a-z0-9]+)*$/,
   countries: /^[A-Z]{2}$/,
   rounds: /^[a-z0-9]+(_[a-z0-9]+)*$/,
   sources: /^[a-z0-9]+(_[a-z0-9]+)*$/,
   reasons: /^[a-z0-9]+(_[a-z0-9]+)*$/,
   taskTypes: /^[a-z0-9]+(_[a-z0-9]+)*$/,
};

// "Series B" → "series_b"; "Industrial Tech" → "industrial-tech"
const keyFrom = (kind: ListKind, name: string) => {
   if (kind === 'countries') return '';
   const separator = kind === 'industries' ? '-' : '_';
   return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, separator)
      .replace(new RegExp(`^\\${separator}+|\\${separator}+$`, 'g'), '');
};

const blank = (kind: ListKind): ListItemInput => ({
   key: '',
   names: { ru: '', uz: '', en: '' },
   active: true,
   ...(kind === 'industries' && { mandate: 'allowed' as IndustryMandate }),
   ...((kind === 'rounds' || kind === 'countries') && { inMandate: false }),
   ...(kind === 'sources' && { onSite: false }),
   ...(kind === 'reasons' && { isMandate: false }),
});

const ListItemForm = ({
   kind,
   item,
   onClose,
}: Omit<ListItemDialogProps, 'open'>) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   const list = LISTS[kind];
   const [value, setValue] = useState<ListItemInput>(() =>
      item ? { ...item } : blank(kind),
   );
   // the key follows the English name until it is typed by hand
   const [keyTyped, setKeyTyped] = useState(!!item);
   const [tried, setTried] = useState(false);
   const [saving, setSaving] = useState(false);

   const taken =
      !item && listOf(kind, true).some((other) => other.key === value.key);
   const errors = {
      ru: value.names.ru.trim() ? '' : t('Укажите название'),
      key: !value.key
         ? t('Укажите код')
         : !KEY_PATTERNS[kind].test(value.key)
           ? t('Код пишется так: {{hint}}', { hint: t(list.keyHint) })
           : taken
             ? t('Такой код уже есть')
             : '',
   };
   const valid = !errors.ru && !errors.key;

   const setName = (language: SupportedLanguageType, name: string) =>
      setValue((prev) => ({
         ...prev,
         names: { ...prev.names, [language]: name },
         ...(!keyTyped && language === 'en' && { key: keyFrom(kind, name) }),
      }));

   // how the journal shows the row: its names, its mark and whether it is used
   const describe = (row: ListItemInput | null) => {
      if (!row) return '';
      const flag = list.flag;
      const mark =
         flag === 'mandate'
            ? t(INDUSTRY_MANDATES[row.mandate ?? 'allowed'].label)
            : flag && row[flag]
              ? t(list.flagLabel)
              : '';
      return [
         row.names.ru,
         mark,
         row.active ? t('используется') : t('отключён'),
      ]
         .filter(Boolean)
         .join(' · ');
   };

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setTried(true);
      if (!valid) return;
      const next: ListItemInput = {
         ...value,
         names: {
            ru: value.names.ru.trim(),
            uz: value.names.uz.trim(),
            en: value.names.en.trim(),
         },
      };
      setSaving(true);
      try {
         await settings.saveListItem(
            kind,
            item?.id ?? null,
            next,
            user.id,
            t('Справочник «{{list}}» · {{name}}', {
               list: t(list.title),
               name: next.names.ru,
            }),
            describe,
         );
         onClose();
      } finally {
         setSaving(false);
      }
   };

   const flag = list.flag;

   return (
      <form noValidate className={MODAL_FORM} onSubmit={handleSubmit}>
         <ModalBody>
            <div className='grid gap-4'>
               {LANGUAGES.map(([language, label], index) => (
                  <Field
                     key={language}
                     error={language === 'ru' && tried ? errors.ru : undefined}
                     label={t(label)}
                  >
                     <input
                        aria-invalid={language === 'ru' && tried && !!errors.ru}
                        className='field-input'
                        data-autofocus={index === 0 || undefined}
                        maxLength={NAME_MAX}
                        value={value.names[language]}
                        onChange={(event) =>
                           setName(language, event.target.value)
                        }
                     />
                  </Field>
               ))}
               <Field
                  error={tried ? errors.key : undefined}
                  hint={
                     item
                        ? t('Код не меняется: сделки и сайт хранят его')
                        : t(list.keyHint)
                  }
                  label={t(list.keyLabel)}
               >
                  <input
                     aria-invalid={tried && !!errors.key}
                     className='field-input disabled:bg-ground disabled:text-ink-soft font-mono'
                     disabled={!!item}
                     maxLength={40}
                     value={value.key}
                     onChange={(event) => {
                        setKeyTyped(true);
                        setValue((prev) => ({
                           ...prev,
                           key:
                              kind === 'countries'
                                 ? event.target.value.toUpperCase()
                                 : event.target.value,
                        }));
                     }}
                  />
               </Field>
               {flag === 'mandate' && (
                  <Field label={t(list.flagLabel)}>
                     <select
                        className='field-input'
                        value={value.mandate}
                        onChange={(event) =>
                           setValue((prev) => ({
                              ...prev,
                              mandate: event.target.value as IndustryMandate,
                           }))
                        }
                     >
                        {(
                           Object.keys(INDUSTRY_MANDATES) as IndustryMandate[]
                        ).map((mandate) => (
                           <option key={mandate} value={mandate}>
                              {t(INDUSTRY_MANDATES[mandate].label)}
                           </option>
                        ))}
                     </select>
                  </Field>
               )}
               {flag && flag !== 'mandate' && (
                  <label className='flex items-center gap-2.5'>
                     <Checkbox
                        checked={!!value[flag]}
                        label={t(list.flagLabel)}
                        onChange={() =>
                           setValue((prev) => ({
                              ...prev,
                              [flag]: !prev[flag],
                           }))
                        }
                     />
                     {t(list.flagLabel)}
                  </label>
               )}
               {item && (
                  <label className='flex items-start gap-2.5'>
                     <span className='pt-0.5'>
                        <Checkbox
                           checked={value.active}
                           label={t('Используется')}
                           onChange={() =>
                              setValue((prev) => ({
                                 ...prev,
                                 active: !prev.active,
                              }))
                           }
                        />
                     </span>
                     <span>
                        {t('Используется')}
                        <span className='text-ink-soft block text-xs'>
                           {t(
                              'Снимите, чтобы формы перестали предлагать эту строку; сделки и задачи с ней её сохранят.',
                           )}
                        </span>
                     </span>
                  </label>
               )}
            </div>
         </ModalBody>
         <ModalFooter note={t('Изменение попадёт в журнал')}>
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button disabled={saving} type='submit'>
               {item ? t('Сохранить') : t('Добавить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

// A list's row added or changed by the director (Настройки → a list).
const ListItemDialog = ({ kind, item, open, onClose }: ListItemDialogProps) => {
   const { t } = useTranslation('settings');
   const list = LISTS[kind];

   return (
      <Modal
         open={open}
         subtitle={t(list.title)}
         title={
            item
               ? t('Изменить: {{name}}', { name: item.names.ru })
               : t('Новая строка: {{list}}', { list: t(list.one) })
         }
         onClose={onClose}
      >
         {open && (
            <ListItemForm
               key={item?.id ?? 'new'}
               item={item}
               kind={kind}
               onClose={onClose}
            />
         )}
      </Modal>
   );
};

export default ListItemDialog;

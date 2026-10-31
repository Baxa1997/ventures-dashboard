import {
   INDUSTRY_MANDATES,
   LISTS,
   METRIC_FORMAT_LABELS,
   STATUS_GROUPS,
   TEMPLATE_ACCEPT,
   TONE_HEX,
} from '@modules/Settings/constants';
import {
   describeRow,
   isSwitchFlag,
   SWITCH_LABELS,
} from '@modules/Settings/helpers';
import settings, { listOf } from '@modules/Settings/services';
import { uploadFile } from '@shared/api/ucode';
import {
   Badge,
   Button,
   Checkbox,
   ColorInput,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { toLatin } from '@shared/helpers';
import { useAction, useCurrentUser } from '@shared/hooks';
import type { MetricFormat } from '@shared/types/portfolio.types';
import type {
   IndustryMandate,
   ItemTone,
   ListItemInput,
   ListKind,
   StatusGroup,
} from '@shared/types/settings.types';
import type { SupportedLanguageType } from '@shared/types/system/language.types';
import { type FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ListItemDialogProps {
   kind: ListKind;
   open: boolean;
   onClose: () => void;
}

const NAME_MAX = 80;

const LANGUAGES = [
   ['ru', 'Название (рус.)'],
   ['uz', 'Название (узб.)'],
   ['en', 'Название (англ.)'],
] as const satisfies readonly (readonly [SupportedLanguageType, string])[];

const SNAKE = /^[a-z0-9]+(_[a-z0-9]+)*$/;

// How each list writes its keys: industries as the website's ids
// (e-commerce), countries as ISO codes (KZ), the rest with underscores.
const KEY_PATTERNS: Record<ListKind, RegExp> = {
   industries: /^[a-z0-9]+(-[a-z0-9]+)*$/,
   countries: /^[A-Z]{2}$/,
   rounds: SNAKE,
   sources: SNAKE,
   reasons: SNAKE,
   taskTypes: SNAKE,
   taskStatuses: SNAKE,
   metrics: SNAKE,
   reportDocs: SNAKE,
   docTemplates: SNAKE,
   docFolders: SNAKE,
   ddAudits: SNAKE,
   criteria: SNAKE,
};

// "Series B" → "series_b"; "Industrial Tech" → "industrial-tech"
const keyFrom = (kind: ListKind, name: string) => {
   if (kind === 'countries') return '';
   const separator = kind === 'industries' ? '-' : '_';
   return toLatin(name.trim())
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
   ...(kind === 'taskStatuses' && {
      group: 'progress' as StatusGroup,
      tone: 'accent' as ItemTone,
   }),
   ...(kind === 'metrics' && { format: 'number' as MetricFormat }),
   ...(kind === 'criteria' && {
      hints: { ru: '', uz: '', en: '' },
      weight: 0,
   }),
   ...(LISTS[kind].flag === 'file' && { file: null }),
});

const ListItemForm = ({
   kind,
   onClose,
}: Omit<ListItemDialogProps, 'open'>) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   const list = LISTS[kind];
   const fileInput = useRef<HTMLInputElement>(null);
   const [value, setValue] = useState<ListItemInput>(() => blank(kind));
   // the template picked, uploaded on adding
   const [picked, setPicked] = useState<File | null>(null);
   // the key follows the English name until it is typed by hand
   const [keyTyped, setKeyTyped] = useState(false);
   const [tried, setTried] = useState(false);

   const taken = listOf(kind, true).some((other) => other.key === value.key);
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

   // the code follows the English name, or the Russian one while there is
   // no English, until it is typed by hand
   const setName = (language: SupportedLanguageType, name: string) =>
      setValue((prev) => {
         const names = { ...prev.names, [language]: name };
         return {
            ...prev,
            names,
            ...(!keyTyped && { key: keyFrom(kind, names.en || names.ru) }),
         };
      });

   const save = useAction(
      async () => {
         const file = picked ? await uploadFile(picked, 'Templates') : null;
         const next: ListItemInput = {
            ...value,
            names: {
               ru: value.names.ru.trim(),
               uz: value.names.uz.trim(),
               en: value.names.en.trim(),
            },
            ...(LISTS[kind].flag === 'file' && { file }),
         };
         await settings.saveListItem(
            kind,
            null,
            next,
            user.id,
            t('Справочник «{{list}}» · {{name}}', {
               list: t(list.title),
               name: next.names.ru,
            }),
            (row) => describeRow(t, kind, row),
         );
      },
      { kind: 'create' },
   );

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setTried(true);
      if (valid && (await save.run())) onClose();
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
                  hint={t('{{hint}}. Код потом не меняется: записи хранят его', {
                     hint: t(list.keyHint),
                  })}
                  label={t(list.keyLabel)}
               >
                  <input
                     aria-invalid={tried && !!errors.key}
                     className='field-input font-mono'
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
               {flag === 'weight' && (
                  <>
                     <Field label={t('Что оценивается')}>
                        <input
                           className='field-input'
                           maxLength={160}
                           value={value.hints?.ru ?? ''}
                           onChange={(event) =>
                              setValue((prev) => ({
                                 ...prev,
                                 hints: {
                                    ru: event.target.value,
                                    uz: prev.hints?.uz ?? '',
                                    en: prev.hints?.en ?? '',
                                 },
                              }))
                           }
                        />
                     </Field>
                     <Field label={t(list.flagLabel)}>
                        <input
                           className='field-input'
                           inputMode='numeric'
                           value={value.weight ?? 0}
                           onChange={(event) =>
                              setValue((prev) => ({
                                 ...prev,
                                 weight:
                                    Number(
                                       event.target.value.replace(/\D/g, ''),
                                    ) || 0,
                              }))
                           }
                        />
                     </Field>
                  </>
               )}
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
               {flag === 'group' && (
                  <div className='grid gap-4 sm:grid-cols-2'>
                     <Field label={t('Группа')}>
                        <select
                           className='field-input'
                           value={value.group}
                           onChange={(event) =>
                              setValue((prev) => ({
                                 ...prev,
                                 group: event.target.value as StatusGroup,
                              }))
                           }
                        >
                           {(Object.keys(STATUS_GROUPS) as StatusGroup[]).map(
                              (group) => (
                                 <option key={group} value={group}>
                                    {t(STATUS_GROUPS[group])}
                                 </option>
                              ),
                           )}
                        </select>
                     </Field>
                     <Field label={t('Цвет')}>
                        <div className='flex h-9 items-center gap-3'>
                           <ColorInput
                              label={t('Цвет')}
                              value={
                                 value.color || TONE_HEX[value.tone ?? 'accent']
                              }
                              onChange={(color) =>
                                 setValue((prev) => ({ ...prev, color }))
                              }
                           />
                           <Badge
                              color={value.color || undefined}
                              tone={value.tone ?? 'neutral'}
                           >
                              {value.names.ru || t('Статус')}
                           </Badge>
                        </div>
                     </Field>
                  </div>
               )}
               {flag === 'format' && (
                  <Field
                     hint={t('Как цифра показывается в отчётах')}
                     label={t(list.flagLabel)}
                  >
                     <select
                        className='field-input'
                        value={value.format}
                        onChange={(event) =>
                           setValue((prev) => ({
                              ...prev,
                              format: event.target.value as MetricFormat,
                           }))
                        }
                     >
                        {(
                           Object.keys(METRIC_FORMAT_LABELS) as MetricFormat[]
                        ).map((format) => (
                           <option key={format} value={format}>
                              {t(METRIC_FORMAT_LABELS[format])}
                           </option>
                        ))}
                     </select>
                  </Field>
               )}
               {flag === 'file' && (
                  <Field
                     hint={t('Excel, Word, PowerPoint или PDF')}
                     label={t(list.flagLabel)}
                  >
                     <div className='text-meta flex flex-wrap items-center gap-x-4 gap-y-1'>
                        {picked ? (
                           <span className='font-medium'>{picked.name}</span>
                        ) : (
                           <span className='text-ink-soft'>
                              {t('Шаблона нет')}
                           </span>
                        )}
                        <button
                           type='button'
                           className='link'
                           onClick={() => fileInput.current?.click()}
                        >
                           {picked ? t('Заменить файл') : t('Выбрать файл')}
                        </button>
                        {picked && (
                           <button
                              type='button'
                              className='text-ink-soft hover:text-danger'
                              onClick={() => setPicked(null)}
                           >
                              {t('Убрать')}
                           </button>
                        )}
                        <input
                           ref={fileInput}
                           accept={TEMPLATE_ACCEPT}
                           hidden
                           type='file'
                           onChange={(event) => {
                              setPicked(event.target.files?.[0] ?? null);
                              event.target.value = '';
                           }}
                        />
                     </div>
                  </Field>
               )}
               {isSwitchFlag(flag) && (
                  <label className='flex items-center gap-2.5'>
                     <Checkbox
                        checked={!!value[flag]}
                        label={t(SWITCH_LABELS[flag])}
                        onChange={() =>
                           setValue((prev) => ({
                              ...prev,
                              [flag]: !prev[flag],
                           }))
                        }
                     />
                     {t(SWITCH_LABELS[flag])}
                  </label>
               )}
            </div>
         </ModalBody>
         <ModalFooter note={t('Изменение попадёт в журнал')}>
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button loading={save.pending} type='submit'>
               {t('Добавить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

/* A new row of a list, added by the director (Настройки → a list): its
   names, its key (made from the name until typed, checked against the
   list's own way of writing keys) and its mark. The rows are changed in
   the list itself. */
const ListItemDialog = ({ kind, open, onClose }: ListItemDialogProps) => {
   const { t } = useTranslation('settings');
   const list = LISTS[kind];

   return (
      <Modal
         open={open}
         subtitle={t(list.title)}
         title={t('Новая строка: {{list}}', { list: t(list.one) })}
         onClose={onClose}
      >
         {open && <ListItemForm kind={kind} onClose={onClose} />}
      </Modal>
   );
};

export default ListItemDialog;

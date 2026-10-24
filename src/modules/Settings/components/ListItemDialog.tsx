import {
   INDUSTRY_MANDATES,
   LISTS,
   METRIC_FORMAT_LABELS,
   STATUS_GROUPS,
   TEMPLATE_ACCEPT,
   TONE_LABELS,
} from '@modules/Settings/constants';
import settings, { listOf } from '@modules/Settings/services';
import { deleteFile, uploadFile } from '@shared/api/ucode';
import {
   Badge,
   Button,
   Checkbox,
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
   ListItem,
   ListItemInput,
   ListKind,
   StatusGroup,
} from '@shared/types/settings.types';
import type { SupportedLanguageType } from '@shared/types/system/language.types';
import type { TFunction } from 'i18next';
import { type FormEvent, useRef, useState } from 'react';
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
};

// The flags a row is marked by with a box.
const BOX_LABELS = {
   inMandate: 'В мандате',
   onSite: 'На сайте',
   isMandate: 'По мандату',
} as const;
type BoxFlag = keyof typeof BOX_LABELS;
const isBoxFlag = (flag: string | null): flag is BoxFlag =>
   !!flag && flag in BOX_LABELS;

// How the journal shows a row: its names, its mark and whether it is used.
export const describeRow = (
   t: TFunction<'settings'>,
   kind: ListKind,
   row: ListItemInput | null,
) => {
   if (!row) return '';
   const flag = LISTS[kind].flag;
   const mark =
      flag === 'mandate'
         ? t(INDUSTRY_MANDATES[row.mandate ?? 'allowed'].label)
         : flag === 'group'
           ? t(STATUS_GROUPS[row.group ?? 'progress'])
           : flag === 'format'
             ? t(METRIC_FORMAT_LABELS[row.format ?? 'number'])
             : flag === 'file'
               ? (row.file?.name ?? '')
               : isBoxFlag(flag) && row[flag]
                 ? t(BOX_LABELS[flag])
                 : '';
   return [row.names.ru, mark, row.active ? t('используется') : t('отключён')]
      .filter(Boolean)
      .join(' · ');
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
   ...(LISTS[kind].flag === 'file' && { file: null }),
});

const ListItemForm = ({
   kind,
   item,
   onClose,
}: Omit<ListItemDialogProps, 'open'>) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   const list = LISTS[kind];
   const fileInput = useRef<HTMLInputElement>(null);
   const [value, setValue] = useState<ListItemInput>(() =>
      item ? { ...item } : blank(kind),
   );
   // the template picked to replace the current one, uploaded on saving
   const [picked, setPicked] = useState<File | null>(null);
   // the key follows the English name until it is typed by hand
   const [keyTyped, setKeyTyped] = useState(!!item);
   const [tried, setTried] = useState(false);

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

   const describe = (row: ListItemInput | null) => describeRow(t, kind, row);

   const save = useAction(
      async () => {
         const file = picked
            ? await uploadFile(picked, 'Templates')
            : (value.file ?? null);
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
            item?.id ?? null,
            next,
            user.id,
            t('Справочник «{{list}}» · {{name}}', {
               list: t(list.title),
               name: next.names.ru,
            }),
            describe,
         );
         // the template it no longer has
         if (item?.file?.id && item.file.id !== file?.id)
            await deleteFile(item.file.id);
      },
      { kind: item ? 'save' : 'create' },
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
                  hint={
                     item
                        ? t('Код не меняется: записи хранят его')
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
               {flag === 'group' && (
                  <div className='grid gap-4 sm:grid-cols-2'>
                     <Field
                        hint={
                           item?.isSystem
                              ? t('Группа системного статуса не меняется')
                              : undefined
                        }
                        label={t('Группа')}
                     >
                        <select
                           className='field-input disabled:bg-ground'
                           disabled={!!item?.isSystem}
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
                        <div className='flex items-center gap-3'>
                           <select
                              className='field-input flex-1'
                              value={value.tone}
                              onChange={(event) =>
                                 setValue((prev) => ({
                                    ...prev,
                                    tone: event.target.value as ItemTone,
                                 }))
                              }
                           >
                              {(Object.keys(TONE_LABELS) as ItemTone[]).map(
                                 (tone) => (
                                    <option key={tone} value={tone}>
                                       {t(TONE_LABELS[tone])}
                                    </option>
                                 ),
                              )}
                           </select>
                           <Badge tone={value.tone ?? 'neutral'}>
                              {value.names.ru || t('Статус')}
                           </Badge>
                        </div>
                     </Field>
                  </div>
               )}
               {flag === 'format' && (
                  <Field
                     hint={
                        item?.isSystem
                           ? t('Формат системного показателя не меняется')
                           : t('Как цифра показывается в отчётах')
                     }
                     label={t(list.flagLabel)}
                  >
                     <select
                        className='field-input disabled:bg-ground'
                        disabled={!!item?.isSystem}
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
                        ) : value.file ? (
                           <a
                              className='link'
                              href={value.file.url}
                              rel='noreferrer'
                              target='_blank'
                           >
                              {value.file.name}
                           </a>
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
                           {value.file || picked
                              ? t('Заменить файл')
                              : t('Выбрать файл')}
                        </button>
                        {(value.file || picked) && (
                           <button
                              type='button'
                              className='text-ink-soft hover:text-danger'
                              onClick={() => {
                                 setPicked(null);
                                 setValue((prev) => ({ ...prev, file: null }));
                              }}
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
               {isBoxFlag(flag) && (
                  <label className='flex items-center gap-2.5'>
                     <Checkbox
                        checked={!!value[flag]}
                        label={t(BOX_LABELS[flag])}
                        onChange={() =>
                           setValue((prev) => ({
                              ...prev,
                              [flag]: !prev[flag],
                           }))
                        }
                     />
                     {t(BOX_LABELS[flag])}
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
                              'Снимите, чтобы формы перестали предлагать эту строку; записи с ней её сохранят.',
                           )}
                        </span>
                     </span>
                  </label>
               )}
            </div>
         </ModalBody>
         <ModalFooter
            note={
               item?.isSystem
                  ? t('Системная строка: её можно переименовать, но не удалить')
                  : t('Изменение попадёт в журнал')
            }
         >
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button loading={save.pending} type='submit'>
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

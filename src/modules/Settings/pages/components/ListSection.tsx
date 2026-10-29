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
   inputOf,
   isSwitchFlag,
   SWITCH_LABELS,
} from '@modules/Settings/helpers';
import settings, { nameOf, releaseFile } from '@modules/Settings/services';
import { uploadFile } from '@shared/api/ucode';
import { ColorInput, Notice, Spinner, Switch } from '@shared/components';
import { toast } from '@shared/helpers/toast';
import { useCurrentUser } from '@shared/hooks';
import type { MetricFormat } from '@shared/types/portfolio.types';
import type {
   IndustryMandate,
   ListItem,
   ListItemInput,
   ListKind,
   StatusGroup,
} from '@shared/types/settings.types';
import type { SupportedLanguageType } from '@shared/types/system/language.types';
import clsx from 'clsx';
import { Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
   ACTION_COLUMN,
   CELL,
   DictCard,
   DRAGGED_ROW,
   HANDLE_COLUMN,
   HEAD,
   ROW_SELECT,
   RowDelete,
   type RowDragProps,
   RowHandle,
   RowInput,
   STICKY_END,
   useRowDraft,
   useRowDrag,
   useRowOrder,
} from './Dict';

const LANGUAGES = [
   ['ru', 'Название (рус.)'],
   ['uz', 'Название (узб.)'],
   ['en', 'Название (англ.)'],
] as const satisfies readonly (readonly [SupportedLanguageType, string])[];

const ICON_BUTTON =
   'text-ink-soft hover:bg-hover hover:text-ink grid size-6.5 shrink-0 place-items-center rounded-md transition-colors disabled:opacity-45';

interface ListRowProps {
   kind: ListKind;
   item: ListItem;
   editable: boolean;
   drag: RowDragProps;
   onDelete: () => void;
}

/* One row of a list, every field of it changed where it stands: in use or
   not, the colour of a status, the names in the three languages, the list's
   own mark (a select, a switch or a file). The key stays as it was made,
   since records keep it; a system row is renamed, never deleted. Every change
   goes to the journal. */
const ListRow = ({ kind, item, editable, drag, onDelete }: ListRowProps) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   const list = LISTS[kind];
   const fileInput = useRef<HTMLInputElement>(null);
   const [uploading, setUploading] = useState(false);

   const row = useRowDraft<ListItemInput>(async (draft) => {
      const current = (await settings.getSettings()).lists[kind].find(
         ({ id }) => id === item.id,
      );
      if (!current) return;
      const before = inputOf(current);
      const next = { ...before, ...draft };
      if (JSON.stringify(next) === JSON.stringify(before)) return;
      await settings.saveListItem(
         kind,
         item.id,
         next,
         user.id,
         t('Справочник «{{list}}» · {{name}}', {
            list: t(list.title),
            name: next.names.ru,
         }),
         (value) => describeRow(t, kind, value),
      );
      // the template it no longer has, unless a request still offers it
      if (before.file && before.file.id !== next.file?.id)
         await releaseFile(before.file);
   });
   const shown = { ...item, ...row.draft };
   const saved = t('Сохранено');

   const rename = (language: SupportedLanguageType, name: string) => {
      if (language === 'ru' && !name) {
         toast.error(t('Укажите название'));
         return;
      }
      row.change({ names: { ...shown.names, [language]: name } }, saved);
   };

   const upload = (picked: File) => {
      setUploading(true);
      row.run(async () => {
         try {
            row.add({ file: await uploadFile(picked, 'Templates') });
            await row.persist();
         } finally {
            setUploading(false);
         }
      }, t('Файл загружен'));
   };

   const flag = list.flag;
   const mark = () => {
      if (flag === 'mandate')
         return (
            <select
               aria-label={t(list.flagLabel)}
               className={ROW_SELECT}
               disabled={!editable}
               value={shown.mandate ?? 'allowed'}
               onChange={(event) =>
                  row.change(
                     { mandate: event.target.value as IndustryMandate },
                     saved,
                  )
               }
            >
               {(Object.keys(INDUSTRY_MANDATES) as IndustryMandate[]).map(
                  (mandate) => (
                     <option key={mandate} value={mandate}>
                        {t(INDUSTRY_MANDATES[mandate].label)}
                     </option>
                  ),
               )}
            </select>
         );
      if (flag === 'group')
         return (
            <select
               aria-label={t('Группа')}
               className={ROW_SELECT}
               disabled={!editable || item.isSystem}
               title={
                  item.isSystem
                     ? t('Группа системного статуса не меняется')
                     : undefined
               }
               value={shown.group ?? 'progress'}
               onChange={(event) =>
                  row.change(
                     { group: event.target.value as StatusGroup },
                     saved,
                  )
               }
            >
               {(Object.keys(STATUS_GROUPS) as StatusGroup[]).map((group) => (
                  <option key={group} value={group}>
                     {t(STATUS_GROUPS[group])}
                  </option>
               ))}
            </select>
         );
      if (flag === 'format')
         return (
            <select
               aria-label={t(list.flagLabel)}
               className={ROW_SELECT}
               disabled={!editable || item.isSystem}
               title={
                  item.isSystem
                     ? t('Формат системного показателя не меняется')
                     : undefined
               }
               value={shown.format ?? 'number'}
               onChange={(event) =>
                  row.change(
                     { format: event.target.value as MetricFormat },
                     saved,
                  )
               }
            >
               {(Object.keys(METRIC_FORMAT_LABELS) as MetricFormat[]).map(
                  (format) => (
                     <option key={format} value={format}>
                        {t(METRIC_FORMAT_LABELS[format])}
                     </option>
                  ),
               )}
            </select>
         );
      if (flag === 'file')
         return (
            <div className='text-meta flex min-w-0 items-center gap-1'>
               {shown.file ? (
                  <a
                     className='link min-w-0 flex-1 truncate'
                     href={shown.file.url}
                     rel='noreferrer'
                     target='_blank'
                     title={shown.file.name}
                  >
                     {shown.file.name}
                  </a>
               ) : (
                  <span className='text-ink-faint min-w-0 flex-1'>
                     {t('Шаблона нет')}
                  </span>
               )}
               {editable && (
                  <>
                     <button
                        type='button'
                        aria-label={
                           shown.file ? t('Заменить файл') : t('Выбрать файл')
                        }
                        className={ICON_BUTTON}
                        disabled={uploading}
                        title={
                           shown.file ? t('Заменить файл') : t('Выбрать файл')
                        }
                        onClick={() => fileInput.current?.click()}
                     >
                        {uploading ? (
                           <Spinner className='size-3.5' />
                        ) : (
                           <Upload aria-hidden className='size-3.5' />
                        )}
                     </button>
                     {shown.file && !uploading && (
                        <button
                           type='button'
                           aria-label={t('Убрать файл')}
                           className={clsx(ICON_BUTTON, 'hover:text-danger')}
                           title={t('Убрать файл')}
                           onClick={() =>
                              row.change({ file: null }, t('Файл убран'))
                           }
                        >
                           <X aria-hidden className='size-3.5' />
                        </button>
                     )}
                     <input
                        ref={fileInput}
                        accept={TEMPLATE_ACCEPT}
                        hidden
                        type='file'
                        onChange={(event) => {
                           const picked = event.target.files?.[0];
                           event.target.value = '';
                           if (picked) upload(picked);
                        }}
                     />
                  </>
               )}
            </div>
         );
      if (isSwitchFlag(flag))
         return (
            <Switch
               small
               checked={!!shown[flag]}
               disabled={!editable}
               label={t(SWITCH_LABELS[flag])}
               onChange={(on) => row.change({ [flag]: on }, saved)}
            />
         );
      return null;
   };

   return (
      <tr className={clsx(drag.dragged && DRAGGED_ROW)} style={drag.style}>
         <td className={CELL}>{drag.handle}</td>
         <td className={CELL}>
            <Switch
               small
               checked={shown.active}
               disabled={!editable}
               label={t('Используется: {{name}}', { name: nameOf(item) })}
               title={
                  shown.active
                     ? t('Используется: формы предлагают строку')
                     : t('Отключена: формы её не предлагают')
               }
               onChange={(active) => row.change({ active }, saved)}
            />
         </td>
         {kind === 'taskStatuses' && (
            <td className={CELL}>
               <ColorInput
                  disabled={!editable}
                  label={t('Цвет: {{name}}', { name: nameOf(item) })}
                  value={shown.color || TONE_HEX[shown.tone ?? 'neutral']}
                  onChange={(color) => row.change({ color }, saved)}
               />
            </td>
         )}
         {LANGUAGES.map(([language, label]) => (
            <td key={language} className={CELL}>
               <RowInput
                  disabled={!editable}
                  label={t(label)}
                  maxLength={80}
                  placeholder={language === 'ru' ? undefined : '—'}
                  value={shown.names[language]}
                  onSave={(name) => rename(language, name)}
               />
            </td>
         ))}
         <td className={CELL}>
            <span
               className='border-line bg-hover text-ink-soft block h-7 truncate rounded-md border px-2 font-mono text-xs leading-6.5'
               title={t('Код не меняется: записи хранят его')}
            >
               {item.key}
            </span>
         </td>
         {flag && <td className={CELL}>{mark()}</td>}
         <td className={clsx(CELL, STICKY_END)}>
            {(editable || item.isSystem) && (
               <RowDelete
                  locked={
                     item.isSystem
                        ? t(
                             'Системная строка: её можно переименовать, но не удалить',
                          )
                        : undefined
                  }
                  name={nameOf(item)}
                  onDelete={onDelete}
               />
            )}
         </td>
      </tr>
   );
};

interface ListSectionProps {
   kind: ListKind;
   items: ListItem[]; // in their order, the turned-off ones too
   editable: boolean;
   onAdd: () => void;
   onDelete: (item: ListItem) => void; // asks first; not for system rows
}

/* One reference list in the order the forms show it, edited where it
   stands. The director turns rows on and off, renames them, sets their
   marks, orders and deletes them; a row in use is deleted once its records
   move to another, and the platform's own rows are renamed, never deleted.
   A new row is added in a dialog, which checks its key. */
const ListSection = ({
   kind,
   items,
   editable,
   onAdd,
   onDelete,
}: ListSectionProps) => {
   const { t } = useTranslation('settings');
   const list = LISTS[kind];
   const order = useRowOrder(
      items,
      (item) => item.id,
      (id, to) => settings.moveListItem(kind, id, to),
   );
   const drag = useRowDrag(order.move);

   return (
      <>
         <DictCard
            addLabel={t('Добавить')}
            body={drag.body}
            className={
               kind === 'taskStatuses' ? 'min-w-[50rem]' : 'min-w-[46rem]'
            }
            editable={editable}
            note={
               editable
                  ? t(
                       'Изменения сохраняются сразу и попадают в журнал. Отключённую строку формы не предлагают, записи её сохраняют. Замок — системная строка: её можно переименовать, но не удалить.',
                    )
                  : t('Менять справочники может только директор.')
            }
            head={
               <>
                  <th className={clsx(HEAD, HANDLE_COLUMN)}>
                     <span className='sr-only'>{t('Порядок')}</span>
                  </th>
                  <th className={clsx(HEAD, 'w-11')}>{t('Вкл.')}</th>
                  {kind === 'taskStatuses' && (
                     <th className={clsx(HEAD, 'w-11')}>{t('Цвет')}</th>
                  )}
                  {LANGUAGES.map(([language, label]) => (
                     <th key={language} className={HEAD}>
                        {t(label)}
                     </th>
                  ))}
                  <th className={clsx(HEAD, 'w-28')}>{t(list.keyLabel)}</th>
                  {list.flag && (
                     <th
                        className={clsx(
                           HEAD,
                           list.flag === 'file'
                              ? 'w-52'
                              : isSwitchFlag(list.flag)
                                ? 'w-21'
                                : 'w-40',
                        )}
                     >
                        {t(list.flagLabel)}
                     </th>
                  )}
                  <th className={clsx(HEAD, ACTION_COLUMN, STICKY_END)}>
                     <span className='sr-only'>{t('Действия')}</span>
                  </th>
               </>
            }
            onAdd={onAdd}
         >
            {order.rows.length ? (
               order.rows.map((item, index) => (
                  <ListRow
                     key={item.id}
                     drag={{
                        dragged: drag.dragged === index,
                        style: drag.rowStyle(index),
                        handle: editable && (
                           <RowHandle
                              count={order.rows.length}
                              index={index}
                              name={nameOf(item)}
                              onMove={order.move}
                              onPress={(event) => drag.press(index, event)}
                           />
                        ),
                     }}
                     editable={editable}
                     item={item}
                     kind={kind}
                     onDelete={() => onDelete(item)}
                  />
               ))
            ) : (
               <tr>
                  <td
                     className='text-ink-soft px-4.5 py-8 text-center'
                     colSpan={9}
                  >
                     {t('Список пуст')}
                  </td>
               </tr>
            )}
         </DictCard>
         <Notice className='mt-4'>{t(list.note)}</Notice>
      </>
   );
};

export default ListSection;

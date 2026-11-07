import {
   Button,
   Card,
   ConfirmDialog,
   Field,
   InlineField,
   ItemActions,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   NoData,
   Segmented,
   Switch,
   Table,
   TD,
   TH,
} from '@shared/components';
import {
   DRAGGED_ROW,
   RowHandle,
   useRowDrag,
   useRowOrder,
} from '@modules/Settings/pages/components/Dict';
import type { Row } from '@shared/api/ucode';
import clsx from 'clsx';
import {
   BrainCircuit,
   Briefcase,
   ChartColumn,
   Compass,
   CreditCard,
   FolderLock,
   Globe,
   GraduationCap,
   Handshake,
   Landmark,
   Lightbulb,
   type LucideIcon,
   MapPin,
   Plane,
   PlugZap,
   Plus,
   Presentation,
   Rocket,
   ShieldCheck,
   ShoppingCart,
   Target,
   TrendingUp,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
   type SiteField,
   SITE_LANGUAGES,
   SITE_TABLES,
   type SiteTableId,
   type SiteTableInfo,
} from '../../constants';
import type { SiteLanguage } from '@shared/types/site.types';
import { filledIn, firstOf } from '../../helpers';
import { useSiteSave } from '../../hooks';
import site, { localized, localizedRow } from '../../services';
import { LangMarks, LocalizedRow, OnSite } from './parts';

// The icons a card can have: the website knows the same names (SiteIcon).
const ICONS: Record<string, LucideIcon> = {
   Landmark,
   PlugZap,
   GraduationCap,
   TrendingUp,
   Globe,
   Handshake,
   CreditCard,
   BrainCircuit,
   ShoppingCart,
   MapPin,
   Compass,
   Plane,
   Presentation,
   FolderLock,
   Briefcase,
   Rocket,
   ShieldCheck,
   Lightbulb,
   ChartColumn,
   Target,
};

const text = (row: Row, field: SiteField) =>
   field.plain
      ? String(row[field.slug] ?? '')
      : firstOf(localized(row, field.slug));

const RowDialog = ({
   id,
   row,
   onClose,
}: {
   id: SiteTableId;
   row: Row;
   onClose: () => void;
}) => {
   const { t } = useTranslation('site');
   const info: SiteTableInfo = SITE_TABLES[id];
   const [value, setValue] = useState(row);
   const saving = useSiteSave(() => site.saveRow(id, value));
   const ready = Boolean(text(value, info.fields[0]).trim());
   const submit = async (event: FormEvent) => {
      event.preventDefault();
      if (ready && (await saving.run())) onClose();
   };
   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               {info.icon && (
                  <Field label={t('Значок')}>
                     <span className='flex flex-wrap gap-1.5'>
                        {Object.entries(ICONS).map(([name, Icon]) => (
                           <button
                              key={name}
                              type='button'
                              aria-label={name}
                              aria-pressed={value.icon === name}
                              className={clsx(
                                 'grid size-9 place-items-center rounded-lg border transition-colors',
                                 value.icon === name
                                    ? 'border-accent bg-accent-tint text-accent-strong'
                                    : 'border-line text-ink-soft hover:bg-hover',
                              )}
                              data-hint={t('Выбрать этот значок')}
                              onClick={() => setValue({ ...value, icon: name })}
                           >
                              <Icon aria-hidden className='size-4.5' />
                           </button>
                        ))}
                     </span>
                  </Field>
               )}
               {info.fields.map((field) =>
                  field.options ? (
                     <Field key={field.slug} label={t(field.label)}>
                        <select
                           className='field-input'
                           value={String(value[field.slug] ?? '')}
                           onChange={(event) =>
                              setValue({
                                 ...value,
                                 [field.slug]: event.target.value,
                              })
                           }
                        >
                           {field.options.map(([option, label]) => (
                              <option key={option} value={option}>
                                 {t(label)}
                              </option>
                           ))}
                        </select>
                     </Field>
                  ) : field.plain ? (
                     <Field key={field.slug} label={t(field.label)}>
                        <input
                           className='field-input'
                           value={String(value[field.slug] ?? '')}
                           onChange={(event) =>
                              setValue({
                                 ...value,
                                 [field.slug]: event.target.value,
                              })
                           }
                        />
                     </Field>
                  ) : (
                     <LocalizedRow
                        key={field.slug}
                        label={t(field.label)}
                        rows={field.long ? 3 : 1}
                        value={localized(value, field.slug)}
                        onChange={(next) =>
                           setValue({
                              ...value,
                              ...localizedRow(field.slug, next),
                           })
                        }
                     />
                  ),
               )}
            </div>
         </ModalBody>
         <ModalFooter>
            <Button
               hint={t('Закрыть окно, ничего не меняя')}
               variant='text'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               disabled={!ready}
               hint={
                  ready
                     ? t('Сохранить и сразу показать на сайте')
                     : t('Заполните первое поле хотя бы на одном языке')
               }
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

/* A table of the website: one array of its code. Its texts are changed
   where they stand, in the language picked above the table, and saved as
   they are left; the site shows them on its next refresh. The pencil opens
   the whole row with its icon and every language. */
const SiteTable = ({ id, rows: stored }: { id: SiteTableId; rows: Row[] }) => {
   const { t } = useTranslation('site');
   const info: SiteTableInfo = SITE_TABLES[id];
   const [language, setLanguage] = useState<SiteLanguage>('ru');
   const [editing, setEditing] = useState<Row | null>(null);
   const [removing, setRemoving] = useState<Row | null>(null);
   const moving = useSiteSave((guid: string, to: number) =>
      site.moveRow(id, guid, to),
   );
   const order = useRowOrder(
      stored,
      (row) => row.guid,
      (guid, to) => moving.run(guid, to),
   );
   const drag = useRowDrag(order.move);
   const rows = order.rows;
   const showing = useSiteSave((guid: string, shown: boolean) =>
      site.showRow(id, guid, shown),
   );
   const nameOf = (row: Row) => text(row, info.fields[0]);
   const columns = info.fields.filter(({ inForm }) => !inForm);
   const languages = (row: Row) =>
      filledIn(
         ...info.fields
            .filter(({ plain, optional }) => !plain && !optional)
            .map(({ slug }) => localized(row, slug)),
      );

   return (
      <div className='grid gap-4'>
         <div className='flex items-center justify-between gap-3'>
            <code className='text-ink-faint text-xs'>{info.table}</code>
            <span className='flex flex-wrap items-center gap-3'>
               {columns.some(({ plain }) => !plain) && (
                  <Segmented
                     items={SITE_LANGUAGES.map((value) => ({
                        id: value,
                        label: value.toUpperCase(),
                     }))}
                     label={t('Язык текстов в таблице')}
                     value={language}
                     onChange={setLanguage}
                  />
               )}
               <OnSite path={info.path} />
               <Button
                  hint={t('Добавить новую строку в эту таблицу')}
                  onClick={() =>
                     setEditing({
                        guid: '',
                        sort_order: rows.length + 1,
                        is_visible: true,
                        ...(info.icon && { icon: 'Target' }),
                        ...Object.fromEntries(
                           info.fields.flatMap(({ slug, options }) =>
                              options ? [[slug, options[0]?.[0]]] : [],
                           ),
                        ),
                     })
                  }
               >
                  <Plus aria-hidden />
                  {t('Добавить строку')}
               </Button>
            </span>
         </div>
         <Card>
            {rows.length ? (
               <Table
                  body={drag.body}
                  head={
                     <>
                        <th className={TH} />
                        {info.icon && <th className={TH}>{t('Значок')}</th>}
                        {columns.map((field) => (
                           <th key={field.slug} className={TH}>
                              {t(field.label)}
                           </th>
                        ))}
                        <th className={TH}>{t('Языки')}</th>
                        <th className={TH}>{t('На сайте')}</th>
                        <th className={TH} />
                     </>
                  }
               >
                  {rows.map((row, index) => {
                     const Icon = ICONS[String(row.icon)];
                     return (
                        <tr
                           key={row.guid}
                           className={clsx(
                              drag.dragged === index && DRAGGED_ROW,
                           )}
                           style={drag.rowStyle(index)}
                        >
                           <td className={TD}>
                              <RowHandle
                                 count={rows.length}
                                 index={index}
                                 name={nameOf(row)}
                                 onMove={order.move}
                                 onPress={(event) => drag.press(index, event)}
                              />
                           </td>
                           {info.icon && (
                              <td className={TD}>
                                 {Icon && (
                                    <Icon
                                       aria-hidden
                                       className='text-ink-soft size-4.5'
                                    />
                                 )}
                              </td>
                           )}
                           {columns.map((field, column) => {
                              // a plain field is one for every language
                              const slug = field.plain
                                 ? field.slug
                                 : `${field.slug}_${language}`;
                              return (
                                 <td
                                    key={field.slug}
                                    className={clsx(
                                       TD,
                                       field.options
                                          ? 'min-w-32'
                                          : 'min-w-48 max-w-[56ch]',
                                    )}
                                 >
                                    <InlineField
                                       className={clsx(
                                          column === 0
                                             ? 'font-semibold'
                                             : 'text-ink-soft',
                                       )}
                                       kind={
                                          field.options
                                             ? 'select'
                                             : field.long
                                               ? 'multiline'
                                               : 'text'
                                       }
                                       label={
                                          field.plain
                                             ? t(field.label)
                                             : `${t(field.label)}, ${language.toUpperCase()}`
                                       }
                                       maxLength={field.long ? 2000 : 300}
                                       options={field.options?.map(
                                          ([value, label]) => ({
                                             value,
                                             label: t(label),
                                          }),
                                       )}
                                       placeholder={
                                          field.plain
                                             ? undefined
                                             : t('Нет текста на этом языке')
                                       }
                                       validate={(next) =>
                                          column === 0 &&
                                          !next &&
                                          !SITE_LANGUAGES.some(
                                             (other) =>
                                                other !== language &&
                                                String(
                                                   row[
                                                      `${field.slug}_${other}`
                                                   ] ?? '',
                                                ).trim(),
                                          )
                                             ? t(
                                                  'Заполните первое поле хотя бы на одном языке',
                                               )
                                             : undefined
                                       }
                                       value={String(row[slug] ?? '')}
                                       onSave={(next) =>
                                          site.saveRow(id, {
                                             ...row,
                                             [slug]: next,
                                          })
                                       }
                                    />
                                 </td>
                              );
                           })}
                           <td className={TD}>
                              <LangMarks filled={languages(row)} />
                           </td>
                           <td className={TD}>
                              <Switch
                                 small
                                 checked={row.is_visible !== false}
                                 disabled={showing.pending}
                                 hint={
                                    row.is_visible !== false
                                       ? t('Скрыть строку с сайта')
                                       : t('Показать строку на сайте')
                                 }
                                 label={nameOf(row)}
                                 onChange={(next) =>
                                    void showing.run(row.guid, next)
                                 }
                              />
                           </td>
                           <td className={TD}>
                              <ItemActions
                                 icons
                                 name={nameOf(row)}
                                 onDelete={() => setRemoving(row)}
                                 onEdit={() => setEditing(row)}
                              />
                           </td>
                        </tr>
                     );
                  })}
               </Table>
            ) : (
               <NoData>
                  {t(
                     'В таблице нет строк, поэтому сайт показывает то, что записано в его коде.',
                  )}
               </NoData>
            )}
         </Card>
         <Modal
            open={editing !== null}
            size='wide'
            title={editing?.guid ? t('Строка') : t('Новая строка')}
            onClose={() => setEditing(null)}
         >
            {editing && (
               <RowDialog
                  id={id}
                  row={editing}
                  onClose={() => setEditing(null)}
               />
            )}
         </Modal>
         <ConfirmDialog
            open={removing !== null}
            subtitle={removing ? nameOf(removing) : undefined}
            success={t('Строка удалена')}
            title={t('Удалить строку?')}
            onClose={() => setRemoving(null)}
            onConfirm={() => removing && site.removeRow(id, removing.guid)}
         >
            <p>{t('Она пропадёт с сайта, вернуть её будет нельзя.')}</p>
         </ConfirmDialog>
      </div>
   );
};

export default SiteTable;

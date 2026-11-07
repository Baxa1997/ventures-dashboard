import { Spinner } from '@shared/components';
import { useSaveQueue } from '@shared/hooks';
import clsx from 'clsx';
import { Plus, TriangleAlert, X } from 'lucide-react';
import { type FocusEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// A row as the owner types it: a name, its value and a remark under it.
export interface EditableRow {
   label: string;
   value: string;
   note: string;
   warn?: boolean; // the remark needs attention
}

const emptyRow = (): EditableRow => ({ label: '', value: '', note: '' });

// The rows worth keeping: those with a name and a value.
const filledRows = (rows: EditableRow[]) =>
   rows
      .map((row) => ({
         ...row,
         label: row.label.trim(),
         value: row.value.trim(),
         note: row.note.trim(),
      }))
      .filter(({ label, value }) => label && value);

interface InlineRowsProps {
   rows: EditableRow[]; // as saved
   onSave: (rows: EditableRow[]) => unknown; // the rows with a name and a value
   // what each part holds, as its placeholder says
   placeholders: { label: string; value: string; note: string };
   warnLabel?: string; // set: a row can be marked, with this name
   max: number;
   addLabel: string;
   tiles?: boolean; // metric tiles; otherwise label–value rows
}

const key = (rows: EditableRow[]) => JSON.stringify(filledRows(rows));

/* Rows of a card changed where they stand, such as the metrics DD confirmed
   or the synergy with the bank: typed in place, saved when the person leaves
   the card's fields, added with «+» and removed with ×. A row without a name
   or a value is not kept. */
const InlineRows = ({
   rows,
   onSave,
   placeholders,
   warnLabel,
   max,
   addLabel,
   tiles = false,
}: InlineRowsProps) => {
   const { t } = useTranslation('deals');
   const save = useSaveQueue();
   const box = useRef<HTMLDivElement>(null);
   const [draft, setDraft] = useState<EditableRow[]>(rows);
   const [saving, setSaving] = useState(false);
   const [added, setAdded] = useState(false);
   const saved = key(rows);

   // what was saved elsewhere shows, unless a row is being typed
   useEffect(() => {
      if (!box.current?.contains(document.activeElement)) setDraft(rows);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [saved]);

   // a row just added takes the focus
   useEffect(() => {
      if (!added) return;
      setAdded(false);
      const inputs = box.current?.querySelectorAll<HTMLInputElement>(
         '[data-row-label]',
      );
      inputs?.[inputs.length - 1]?.focus();
   }, [added]);

   const commit = async (next: EditableRow[]) => {
      if (key(next) === saved) return;
      setSaving(true);
      await save(async () => {
         await onSave(filledRows(next));
      });
      setSaving(false);
   };

   const onBlur = (event: FocusEvent<HTMLDivElement>) => {
      if (!box.current?.contains(event.relatedTarget as Node | null))
         commit(draft);
   };

   const set = (index: number, patch: Partial<EditableRow>) =>
      setDraft((prev) =>
         prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
      );

   const change = (next: EditableRow[]) => {
      setDraft(next);
      commit(next);
   };

   const input = (
      index: number,
      part: 'label' | 'value' | 'note',
      className: string,
      maxLength: number,
   ) => (
      <input
         aria-label={placeholders[part]}
         className={clsx('inline-input', tiles && 'hover:bg-white', className)}
         data-hint={t('Нажмите, чтобы изменить: {{name}}', {
            name: placeholders[part],
         })}
         maxLength={maxLength}
         placeholder={placeholders[part]}
         value={draft[index][part]}
         onChange={(event) => set(index, { [part]: event.target.value })}
         onKeyDown={(event) => {
            if (event.key === 'Enter') {
               event.preventDefault();
               event.currentTarget.blur();
            }
            if (event.key === 'Escape') {
               event.stopPropagation();
               setDraft(rows);
               event.currentTarget.blur();
            }
         }}
         {...(part === 'label' && { 'data-row-label': true })}
      />
   );

   const remove = (index: number) => (
      <button
         type='button'
         aria-label={t('Убрать строку')}
         className='text-ink-soft hover:text-danger grid size-6 shrink-0 place-items-center rounded-md hover:bg-white focus-visible:opacity-100'
         data-hint={t('Убрать эту строку')}
         onClick={() => change(draft.filter((_, i) => i !== index))}
      >
         <X aria-hidden className='size-3.5' />
      </button>
   );

   const warn = (index: number) =>
      warnLabel && (
         <button
            type='button'
            aria-label={warnLabel}
            aria-pressed={!!draft[index].warn}
            className={clsx(
               'grid size-6 shrink-0 place-items-center rounded-md hover:bg-white',
               draft[index].warn ? 'text-warning-ink' : 'text-ink-faint',
            )}
            data-hint={
               draft[index].warn
                  ? t('Снять выделение')
                  : t('Выделить комментарий как требующий внимания')
            }
            onClick={() =>
               change(
                  draft.map((row, i) =>
                     i === index ? { ...row, warn: !row.warn } : row,
                  ),
               )
            }
         >
            <TriangleAlert aria-hidden className='size-3.5' />
         </button>
      );

   const add = draft.length < max && (
      <button
         type='button'
         className={clsx(
            'text-accent flex items-center gap-1.5 text-sm font-semibold',
            tiles
               ? 'border-line-strong hover:border-accent hover:bg-accent-tint min-h-24 justify-center rounded-lg border border-dashed'
               : 'self-start py-2 hover:underline',
         )}
         data-hint={t('Добавить ещё одну строку')}
         onClick={() => {
            setDraft((prev) => [...prev, emptyRow()]);
            setAdded(true);
         }}
      >
         <Plus aria-hidden className='size-4' />
         {addLabel}
      </button>
   );

   return (
      <div ref={box} className='relative' onBlur={onBlur}>
         {tiles ? (
            <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
               {draft.map((row, index) => (
                  <div
                     // rows have no id; their place is theirs while typed
                     key={index}
                     className='bg-ground group relative rounded-lg px-4 py-3'
                  >
                     <div className='flex items-center gap-1'>
                        {input(index, 'label', 'text-ink-soft text-xs', 60)}
                        <span className='flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100'>
                           {warn(index)}
                           {remove(index)}
                        </span>
                     </div>
                     {input(index, 'value', 'mt-1 text-xl font-bold', 120)}
                     {input(
                        index,
                        'note',
                        clsx(
                           'mt-1 text-xs',
                           row.warn ? 'text-warning-ink' : 'text-ink-soft',
                        ),
                        200,
                     )}
                  </div>
               ))}
               {add}
            </div>
         ) : (
            <div className='flex flex-col'>
               {draft.map((_, index) => (
                  <div
                     key={index}
                     className='border-line group grid grid-cols-[6.5rem_minmax(0,1fr)_auto] gap-x-4 border-b py-2.5'
                  >
                     {input(index, 'label', 'text-ink-soft', 60)}
                     <div className='min-w-0'>
                        {input(index, 'value', '', 120)}
                        {input(index, 'note', 'text-ink-soft text-xs', 200)}
                     </div>
                     <span className='flex items-start opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100'>
                        {warn(index)}
                        {remove(index)}
                     </span>
                  </div>
               ))}
               {add}
            </div>
         )}
         {saving && (
            <Spinner className='text-ink-soft absolute -top-6 right-0 size-3.5' />
         )}
      </div>
   );
};

export default InlineRows;

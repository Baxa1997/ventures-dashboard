import { Checkbox } from '@shared/components';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// A row as the owner types it: a name, its value and a remark under it.
export interface EditableRow {
   label: string;
   value: string;
   note: string;
   warn?: boolean; // the remark needs attention
}

interface RowsEditorProps {
   rows: EditableRow[];
   onChange: (rows: EditableRow[]) => void;
   // what each column holds, as its placeholder says
   placeholders: { label: string; value: string; note: string };
   warnLabel?: string; // set: each row has a box to mark it, with this name
   max: number;
}

export const emptyRow = (): EditableRow => ({ label: '', value: '', note: '' });

// The rows worth keeping: those with a name and a value.
export const filledRows = (rows: EditableRow[]) =>
   rows
      .map((row) => ({
         ...row,
         label: row.label.trim(),
         value: row.value.trim(),
         note: row.note.trim(),
      }))
      .filter(({ label, value }) => label && value);

/* Rows of a card the owner fills in, such as the metrics DD confirmed or the
   synergy with the bank: one line each, added and removed here. A row
   without a name or a value is dropped on saving. */
const RowsEditor = ({
   rows,
   onChange,
   placeholders,
   warnLabel,
   max,
}: RowsEditorProps) => {
   const { t } = useTranslation('deals');
   const set = (index: number, patch: Partial<EditableRow>) =>
      onChange(
         rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
      );

   return (
      <div className='flex flex-col gap-2.5'>
         {rows.map((row, index) => (
            <div
               // rows have no id until saved; their place is theirs while editing
               key={index}
               className='border-line grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-lg border p-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:border-0 sm:p-0'
            >
               <input
                  aria-label={placeholders.label}
                  className='field-input max-sm:col-span-2'
                  maxLength={60}
                  placeholder={placeholders.label}
                  value={row.label}
                  onChange={(event) =>
                     set(index, { label: event.target.value })
                  }
               />
               <input
                  aria-label={placeholders.value}
                  className='field-input max-sm:col-span-2'
                  maxLength={120}
                  placeholder={placeholders.value}
                  value={row.value}
                  onChange={(event) =>
                     set(index, { value: event.target.value })
                  }
               />
               <input
                  aria-label={placeholders.note}
                  className='field-input'
                  maxLength={200}
                  placeholder={placeholders.note}
                  value={row.note}
                  onChange={(event) => set(index, { note: event.target.value })}
               />
               <div className='flex items-center gap-3'>
                  {warnLabel && (
                     <span className='text-ink-soft flex items-center gap-2 text-xs'>
                        <Checkbox
                           checked={!!row.warn}
                           label={warnLabel}
                           onChange={() => set(index, { warn: !row.warn })}
                        />
                        <span aria-hidden className='sm:sr-only'>
                           {warnLabel}
                        </span>
                     </span>
                  )}
                  <button
                     type='button'
                     aria-label={t('Убрать строку')}
                     className='text-ink-soft hover:bg-ground hover:text-danger grid size-8 place-items-center rounded-lg'
                     onClick={() =>
                        onChange(rows.filter((_, i) => i !== index))
                     }
                  >
                     <X aria-hidden className='size-4' />
                  </button>
               </div>
            </div>
         ))}
         {rows.length < max && (
            <button
               type='button'
               className='link self-start text-sm'
               onClick={() => onChange([...rows, emptyRow()])}
            >
               {t('Добавить строку')}
            </button>
         )}
      </div>
   );
};

export default RowsEditor;

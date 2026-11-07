import { normalHandle } from '@modules/Deals/helpers';
import { CABINET_ROLES } from '@modules/Portfolio/constants';
import { STICKY_HEAD, Switch, TABLE_BOX } from '@shared/components';
import { useStickyHead } from '@shared/hooks';
import type { CabinetTeamRow } from '@shared/types/deals.types';
import clsx from 'clsx';
import { Plus, X } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

// A person as the form holds them; `key` tells the rows apart while they change.
export interface TeamDraft extends CabinetTeamRow {
   key: string;
}

// A participant of the capital as the form holds them: the share as typed.
export interface OwnerDraft {
   key: string;
   name: string;
   role: string;
   share: string;
}

export type TeamField = 'name' | 'email' | 'telegram' | 'whatsapp';

const CELL = 'field-input h-8 px-2 text-meta';
const HEAD = 'text-ink-soft px-1 pb-1 text-left text-xs font-semibold';
// the column names, when they stay in view, cover the gaps beside them too
const HEAD_ROW = '[&>th]:shadow-[0_0_0_4px_var(--color-white)]';
const ADD =
   'border-line text-ink hover:bg-hover inline-flex h-7 items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs font-semibold';
const REMOVE =
   'text-ink-soft hover:bg-ground hover:text-danger grid size-7 place-items-center rounded-md';

// The rows' shares added up, as typed.
export const shareTotal = (rows: OwnerDraft[]) =>
   rows.reduce(
      (sum, { share }) => sum + (Number(share.replace(',', '.')) || 0),
      0,
   );

interface TeamTableProps {
   rows: TeamDraft[];
   // a row's fields that are wrong, by its key
   errors: Record<string, Partial<Record<TeamField, boolean>>>;
   editable: boolean;
   onChange: (rows: TeamDraft[]) => void;
   onAdd: () => void;
   onRemove: (row: TeamDraft) => void; // asks first for a saved person
}

/* «Доступ в кабинет основателя», as the prototype has it: who signs in to
   the startup's cabinet, with their role, email (their login), Telegram and
   WhatsApp, whether their access is on, and a cross to take them off. The
   owner of the cabinet stays: their role is CEO and they cannot be taken off. */
export const TeamTable = ({
   rows,
   errors,
   editable,
   onChange,
   onAdd,
   onRemove,
}: TeamTableProps) => {
   const table = useRef<HTMLTableElement>(null);
   useStickyHead(table);
   const { t } = useTranslation('deals');
   const { t: tp } = useTranslation('portfolio');
   const set = (key: string, patch: Partial<TeamDraft>) =>
      onChange(
         rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
      );

   const text = (
      row: TeamDraft,
      field: TeamField,
      label: string,
      extra: { type?: string; placeholder?: string } = {},
   ) => (
      <input
         aria-invalid={!!errors[row.key]?.[field]}
         aria-label={`${label}: ${row.name || t('новый участник')}`}
         className={CELL}
         disabled={!editable}
         maxLength={field === 'email' ? 120 : 60}
         value={row[field]}
         onBlur={
            field === 'telegram' || field === 'whatsapp'
               ? () => set(row.key, { [field]: normalHandle(row[field]) })
               : undefined
         }
         onChange={(event) => set(row.key, { [field]: event.target.value })}
         {...extra}
      />
   );

   return (
      <div>
         <div className={clsx(TABLE_BOX, '-mx-1')}>
            <table
               ref={table}
               className='w-full min-w-[46rem] border-separate border-spacing-x-1 border-spacing-y-1'
            >
               <thead className={STICKY_HEAD}>
                  <tr className={HEAD_ROW}>
                     <th className={HEAD}>{t('Имя')}</th>
                     <th className={clsx(HEAD, 'w-28')}>{t('Роль')}</th>
                     <th className={HEAD}>{t('Email (логин)')}</th>
                     <th className={HEAD}>{t('Telegram')}</th>
                     <th className={HEAD}>{t('WhatsApp')}</th>
                     <th className={clsx(HEAD, 'w-14')}>{t('Доступ')}</th>
                     <th className='w-8' />
                  </tr>
               </thead>
               <tbody>
                  {rows.map((row) => (
                     <tr key={row.key}>
                        <td>{text(row, 'name', t('Имя'))}</td>
                        <td>
                           <select
                              aria-label={t('Роль: {{name}}', {
                                 name: row.name || t('новый участник'),
                              })}
                              className={CELL}
                              disabled={!editable || row.owner}
                              value={row.owner ? 'ceo' : row.role}
                              onChange={(event) =>
                                 set(row.key, {
                                    role: event.target
                                       .value as TeamDraft['role'],
                                 })
                              }
                           >
                              {Object.entries(CABINET_ROLES).map(
                                 ([value, label]) => (
                                    <option key={value} value={value}>
                                       {tp(label)}
                                    </option>
                                 ),
                              )}
                           </select>
                        </td>
                        <td>
                           {text(row, 'email', t('Email'), { type: 'email' })}
                        </td>
                        <td>
                           {text(row, 'telegram', t('Telegram'), {
                              placeholder: '@username',
                           })}
                        </td>
                        <td>
                           {text(row, 'whatsapp', t('WhatsApp'), {
                              placeholder: '@username',
                           })}
                        </td>
                        <td>
                           <Switch
                              small
                              checked={row.active}
                              disabled={!editable}
                              hint={t(
                                 row.active
                                    ? 'Закрыть доступ к кабинету: {{name}}'
                                    : 'Открыть доступ к кабинету: {{name}}',
                                 { name: row.name || t('новый участник') },
                              )}
                              label={t('Доступ к кабинету: {{name}}', {
                                 name: row.name || t('новый участник'),
                              })}
                              onChange={(active) => set(row.key, { active })}
                           />
                        </td>
                        <td>
                           {editable && !row.owner && (
                              <button
                                 type='button'
                                 aria-label={t('Убрать: {{name}}', {
                                    name: row.name || t('новый участник'),
                                 })}
                                 className={REMOVE}
                                 data-hint={
                                    row.id
                                       ? t(
                                            'Убрать человека из кабинета: доступ закроется после сохранения',
                                         )
                                       : t('Убрать эту строку')
                                 }
                                 onClick={() => onRemove(row)}
                              >
                                 <X aria-hidden className='size-4' />
                              </button>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         {editable && (
            <button
               type='button'
               className={clsx(ADD, 'mt-1.5')}
               data-hint={t(
                  'Добавить человека из компании: он войдёт в кабинет по своему email',
               )}
               onClick={onAdd}
            >
               <Plus aria-hidden className='size-3.5' />
               {t('Участник команды')}
            </button>
         )}
      </div>
   );
};

interface CapitalTableProps {
   rows: OwnerDraft[];
   error: boolean; // the shares do not add up to 100%
   editable: boolean;
   onChange: (rows: OwnerDraft[]) => void;
}

/* «Структура капитала»: who holds what before the deal, and the total, red
   while it is not 100%. */
export const CapitalTable = ({
   rows,
   error,
   editable,
   onChange,
}: CapitalTableProps) => {
   const { t } = useTranslation('deals');
   const total = shareTotal(rows);
   const set = (key: string, patch: Partial<OwnerDraft>) =>
      onChange(
         rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
      );

   return (
      <table className='-mx-1 w-[calc(100%+0.5rem)] border-separate border-spacing-x-1 border-spacing-y-1'>
         <thead className={STICKY_HEAD}>
            <tr className={HEAD_ROW}>
               <th className={HEAD}>{t('Участник')}</th>
               <th className={HEAD}>{t('Роль')}</th>
               <th className={clsx(HEAD, 'w-24')}>{t('Доля, %')}</th>
               <th className='w-8' />
            </tr>
         </thead>
         <tbody>
            {rows.map((row) => (
               <tr key={row.key}>
                  <td>
                     <input
                        aria-label={t('Участник')}
                        className={CELL}
                        disabled={!editable}
                        maxLength={120}
                        value={row.name}
                        onChange={(event) =>
                           set(row.key, { name: event.target.value })
                        }
                     />
                  </td>
                  <td>
                     <input
                        aria-label={t('Роль')}
                        className={CELL}
                        disabled={!editable}
                        maxLength={60}
                        value={row.role}
                        onChange={(event) =>
                           set(row.key, { role: event.target.value })
                        }
                     />
                  </td>
                  <td>
                     <input
                        aria-invalid={error}
                        aria-label={t('Доля, %')}
                        className={clsx(CELL, 'text-right tabular-nums')}
                        disabled={!editable}
                        inputMode='decimal'
                        maxLength={6}
                        value={row.share}
                        onChange={(event) =>
                           set(row.key, {
                              share: event.target.value.replace(/[^\d.,]/g, ''),
                           })
                        }
                     />
                  </td>
                  <td>
                     {editable && (
                        <button
                           type='button'
                           aria-label={t('Убрать: {{name}}', {
                              name: row.name || t('участник'),
                           })}
                           className={REMOVE}
                           data-hint={t(
                              'Убрать участника из структуры капитала',
                           )}
                           onClick={() =>
                              onChange(
                                 rows.filter(({ key }) => key !== row.key),
                              )
                           }
                        >
                           <X aria-hidden className='size-4' />
                        </button>
                     )}
                  </td>
               </tr>
            ))}
         </tbody>
         <tfoot>
            <tr>
               <td colSpan={2}>
                  {editable && (
                     <button
                        type='button'
                        className={ADD}
                        data-hint={t('Добавить участника капитала и его долю')}
                        onClick={() =>
                           onChange([
                              ...rows,
                              {
                                 key: crypto.randomUUID(),
                                 name: '',
                                 role: '',
                                 share: '',
                              },
                           ])
                        }
                     >
                        <Plus aria-hidden className='size-3.5' />
                        {t('Участник')}
                     </button>
                  )}
               </td>
               <td
                  className={clsx(
                     'px-2 text-right font-bold tabular-nums',
                     error && 'text-danger',
                  )}
               >
                  {rows.length > 0 &&
                     `${Number(total.toFixed(2)).toLocaleString('ru-RU')}%`}
               </td>
               <td />
            </tr>
         </tfoot>
      </table>
   );
};

import {
   Badge,
   type BadgeTone,
   Card,
   NoData,
   Table,
   TD,
   TH,
} from '@shared/components';
import { formatDayYear, personName } from '@shared/helpers';
import type { SettingsChange } from '@shared/types/settings.types';
import clsx from 'clsx';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const ACTIONS = {
   added: { label: 'Добавлено', tone: 'success' },
   deleted: { label: 'Удалено', tone: 'danger' },
   changed: { label: 'Изменено', tone: 'accent' },
} as const satisfies Record<string, { label: string; tone: BadgeTone }>;

// What a change did, read from it: a value that was not there was added, one
// that is gone (or moved to another row) was deleted.
const actionOf = ({ from, to }: SettingsChange) => {
   if (!from) return ACTIONS.added;
   return !to || to.startsWith('→') ? ACTIONS.deleted : ACTIONS.changed;
};

interface JournalProps {
   journal: SettingsChange[]; // the newest first
}

/* Every change of the rules, the lists and the people: when, who, what it
   was and what it became. Narrowed to one person, or to what was changed. */
const Journal = ({ journal }: JournalProps) => {
   const { t } = useTranslation('settings');
   const [who, setWho] = useState('');
   const [query, setQuery] = useState('');
   const people = [...new Set(journal.map(({ userId }) => userId))];
   const words = query.trim().toLowerCase();
   const rows = journal.filter(
      (change) =>
         (!who || change.userId === who) &&
         (!words ||
            [change.field, change.from, change.to]
               .join(' ')
               .toLowerCase()
               .includes(words)),
   );

   return (
      <>
         <div className='mb-3 flex flex-wrap items-center gap-2'>
            <select
               aria-label={t('Пользователь')}
               className='field-input text-meta h-8 w-auto bg-white'
               value={who}
               onChange={(event) => setWho(event.target.value)}
            >
               <option value=''>{t('Все пользователи')}</option>
               {people.map((id) => (
                  <option key={id} value={id}>
                     {personName(id) || t('Без имени')}
                  </option>
               ))}
            </select>
            <label className='relative w-full sm:ml-auto sm:w-60'>
               <Search
                  aria-hidden
                  className='text-ink-faint pointer-events-none absolute top-2.25 left-2.5 size-3.5'
               />
               <input
                  aria-label={t('Что изменено')}
                  className='field-input text-meta h-8 bg-white pl-8'
                  placeholder={t('Что изменено')}
                  type='search'
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
               />
            </label>
         </div>
         <Card>
            {rows.length ? (
               <Table
                  className='min-w-[48rem]'
                  head={
                     <>
                        <th className={TH}>{t('Дата')}</th>
                        <th className={TH}>{t('Пользователь')}</th>
                        <th className={TH}>{t('Действие')}</th>
                        <th className={TH}>{t('Что изменено')}</th>
                        <th className={TH}>{t('Было')}</th>
                        <th className={TH}>{t('Стало')}</th>
                     </>
                  }
               >
                  {rows.map((change) => {
                     const action = actionOf(change);
                     return (
                        <tr key={change.id} className='align-top'>
                           <td
                              className={clsx(
                                 TD,
                                 'whitespace-nowrap tabular-nums',
                              )}
                           >
                              {formatDayYear(change.date)}
                           </td>
                           <td className={clsx(TD, 'whitespace-nowrap')}>
                              {personName(change.userId) || '—'}
                           </td>
                           <td className={TD}>
                              <Badge tone={action.tone}>
                                 {t(action.label)}
                              </Badge>
                           </td>
                           <td className={clsx(TD, 'min-w-48 font-semibold')}>
                              {change.field}
                           </td>
                           <td
                              className={clsx(
                                 TD,
                                 'text-ink-soft min-w-40 wrap-break-word',
                              )}
                           >
                              {change.from || '—'}
                           </td>
                           <td className={clsx(TD, 'min-w-40 wrap-break-word')}>
                              {change.to || '—'}
                           </td>
                        </tr>
                     );
                  })}
               </Table>
            ) : (
               <NoData>
                  {journal.length
                     ? t('Ничего не найдено')
                     : t('Правила ещё не менялись')}
               </NoData>
            )}
         </Card>
      </>
   );
};

export default Journal;

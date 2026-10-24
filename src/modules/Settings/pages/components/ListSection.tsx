import {
   INDUSTRY_MANDATES,
   LISTS,
   METRIC_FORMAT_LABELS,
   STATUS_GROUPS,
} from '@modules/Settings/constants';
import settings, { nameOf } from '@modules/Settings/services';
import {
   Badge,
   Card,
   ItemActions,
   NoData,
   Spinner,
   Table,
   TD,
   TH,
} from '@shared/components';
import { useAction } from '@shared/hooks';
import type { ListItem, ListKind } from '@shared/types/settings.types';
import clsx from 'clsx';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ListSectionProps {
   kind: ListKind;
   items: ListItem[]; // in their order, the turned-off ones too
   editable: boolean;
   onEdit: (item: ListItem) => void;
   onDelete: (item: ListItem) => void; // asks first; not for system rows
}

const ICON_BUTTON =
   'text-ink-soft hover:bg-ground hover:text-ink grid size-7 place-items-center rounded-md disabled:pointer-events-none disabled:opacity-30';

/* One reference list: its rows in the order the forms show them, each with
   its names in the three languages, its key, its own column (in the mandate,
   on the website, a status's group, a metric's format, a template) and
   whether it is in use. The director adds, changes, orders and deletes rows;
   a row in use is deleted once its records move to another, and the
   platform's own rows are renamed, never deleted. */
const ListSection = ({
   kind,
   items,
   editable,
   onEdit,
   onDelete,
}: ListSectionProps) => {
   const { t, i18n } = useTranslation('settings');
   const list = LISTS[kind];
   // the arrow whose request runs, for its spinner; the others wait
   const [target, setTarget] = useState('');
   const moving = useAction(
      (item: ListItem, step: -1 | 1) =>
         settings.moveListItem(kind, item.id, step),
      { success: t('Порядок сохранён') },
   );
   const spins = (id: string) => moving.pending && target === id;
   // the two names in the languages other than the interface's
   const others = (item: ListItem) =>
      (['ru', 'uz', 'en'] as const)
         .filter((language) => language !== i18n.resolvedLanguage)
         .map((language) => item.names[language])
         .filter((name) => name && name !== nameOf(item))
         .join(' · ');

   const move = (item: ListItem, step: -1 | 1) => {
      setTarget(`${item.id}${step}`);
      moving.run(item, step);
   };

   const mark = (item: ListItem) => {
      if (list.flag === 'mandate') {
         const mandate = INDUSTRY_MANDATES[item.mandate ?? 'allowed'];
         return <Badge tone={mandate.tone}>{t(mandate.label)}</Badge>;
      }
      if (list.flag === 'group')
         return (
            <span className='text-ink-soft whitespace-nowrap'>
               {t(STATUS_GROUPS[item.group ?? 'progress'])}
            </span>
         );
      if (list.flag === 'format')
         return (
            <span className='text-ink-soft'>
               {t(METRIC_FORMAT_LABELS[item.format ?? 'number'])}
            </span>
         );
      if (list.flag === 'file')
         return item.file ? (
            <a
               className='link break-all'
               href={item.file.url}
               rel='noreferrer'
               target='_blank'
            >
               {item.file.name}
            </a>
         ) : (
            <span className='text-ink-faint'>—</span>
         );
      if (!list.flag) return null;
      return item[list.flag] ? (
         <Badge tone='success'>{t('да')}</Badge>
      ) : (
         <span className='text-ink-faint'>—</span>
      );
   };

   return (
      <Card className='flex flex-col'>
         <p className='text-ink-soft px-5 pt-3 pb-1 text-xs'>{t(list.note)}</p>
         {items.length ? (
            <Table
               className='min-w-xl'
               head={
                  <>
                     {editable && (
                        <th className={clsx(TH, 'w-16')}>
                           <span className='sr-only'>{t('Порядок')}</span>
                        </th>
                     )}
                     <th className={TH}>{t('Название')}</th>
                     <th className={TH}>{t(list.keyLabel)}</th>
                     {list.flag && <th className={TH}>{t(list.flagLabel)}</th>}
                     <th className={TH}>{t('Статус')}</th>
                     {editable && (
                        <th className={clsx(TH, 'w-20')}>
                           <span className='sr-only'>{t('Действия')}</span>
                        </th>
                     )}
                  </>
               }
            >
               {items.map((item, index) => (
                  <tr
                     key={item.id}
                     className={clsx(!item.active && 'opacity-60')}
                  >
                     {editable && (
                        <td className={clsx(TD, 'py-1')}>
                           <div className='flex'>
                              <button
                                 aria-label={t('Выше')}
                                 className={ICON_BUTTON}
                                 disabled={moving.pending || index === 0}
                                 type='button'
                                 onClick={() => move(item, -1)}
                              >
                                 {spins(`${item.id}-1`) ? (
                                    <Spinner />
                                 ) : (
                                    <ChevronUp className='size-4' />
                                 )}
                              </button>
                              <button
                                 aria-label={t('Ниже')}
                                 className={ICON_BUTTON}
                                 disabled={
                                    moving.pending || index === items.length - 1
                                 }
                                 type='button'
                                 onClick={() => move(item, 1)}
                              >
                                 {spins(`${item.id}1`) ? (
                                    <Spinner />
                                 ) : (
                                    <ChevronDown className='size-4' />
                                 )}
                              </button>
                           </div>
                        </td>
                     )}
                     <td className={TD}>
                        <div className='flex flex-wrap items-center gap-2 font-semibold'>
                           {kind === 'taskStatuses' ? (
                              <Badge tone={item.tone ?? 'neutral'}>
                                 {nameOf(item)}
                              </Badge>
                           ) : (
                              nameOf(item)
                           )}
                           {item.isSystem && (
                              <span className='text-ink-soft text-xs font-normal'>
                                 {t('системный')}
                              </span>
                           )}
                        </div>
                        {others(item) && (
                           <div className='text-ink-soft text-xs'>
                              {others(item)}
                           </div>
                        )}
                     </td>
                     <td
                        className={clsx(TD, 'text-ink-soft font-mono text-xs')}
                     >
                        {item.key}
                     </td>
                     {list.flag && <td className={TD}>{mark(item)}</td>}
                     <td className={TD}>
                        {item.active ? (
                           <Badge tone='success'>{t('Используется')}</Badge>
                        ) : (
                           <Badge tone='neutral'>{t('Отключён')}</Badge>
                        )}
                     </td>
                     {editable && (
                        <td className={clsx(TD, 'py-1')}>
                           <ItemActions
                              icons
                              name={nameOf(item)}
                              onDelete={
                                 item.isSystem
                                    ? undefined
                                    : () => onDelete(item)
                              }
                              onEdit={() => onEdit(item)}
                           />
                        </td>
                     )}
                  </tr>
               ))}
            </Table>
         ) : (
            <NoData>{t('Список пуст')}</NoData>
         )}
         <p className='text-ink-soft border-line mt-auto border-t px-5 py-3 text-xs'>
            {editable
               ? t(
                    'Строку можно отключить — формы перестанут её предлагать, записи сохранят — или удалить: записи с ней сначала перейдут на другую строку. Системные строки только переименовываются. Порядок — тот, в котором формы показывают список.',
                 )
               : t('Менять справочники может только директор.')}
         </p>
      </Card>
   );
};

export default ListSection;

import { INDUSTRY_MANDATES, LISTS } from '@modules/Settings/constants';
import settings, { nameOf } from '@modules/Settings/services';
import { Badge, Card, NoData, Table, TD, TH } from '@shared/components';
import type { ListItem, ListKind } from '@shared/types/settings.types';
import clsx from 'clsx';
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ListSectionProps {
   kind: ListKind;
   items: ListItem[]; // in their order, the turned-off ones too
   editable: boolean;
   onEdit: (item: ListItem) => void;
}

const ICON_BUTTON =
   'text-ink-soft hover:bg-ground hover:text-ink grid size-7 place-items-center rounded-md disabled:pointer-events-none disabled:opacity-30';

/* One reference list: its rows in the order the forms show them, each with
   its names in the three languages, its key, its mark (in the mandate, on the
   website…) and whether it is in use. The director adds and changes rows and
   moves them up and down; a row is turned off rather than deleted, so the
   deals and tasks that have it keep it. */
const ListSection = ({ kind, items, editable, onEdit }: ListSectionProps) => {
   const { t, i18n } = useTranslation('settings');
   const list = LISTS[kind];
   const [moving, setMoving] = useState(false);
   // the two names in the languages other than the interface's
   const others = (item: ListItem) =>
      (['ru', 'uz', 'en'] as const)
         .filter((language) => language !== i18n.resolvedLanguage)
         .map((language) => item.names[language])
         .filter((name) => name && name !== nameOf(item))
         .join(' · ');

   const move = async (item: ListItem, step: -1 | 1) => {
      setMoving(true);
      try {
         await settings.moveListItem(kind, item.id, step);
      } finally {
         setMoving(false);
      }
   };

   const mark = (item: ListItem) => {
      if (list.flag === 'mandate') {
         const mandate = INDUSTRY_MANDATES[item.mandate ?? 'allowed'];
         return <Badge tone={mandate.tone}>{t(mandate.label)}</Badge>;
      }
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
                        <th className={clsx(TH, 'w-10')}>
                           <span className='sr-only'>{t('Изменить')}</span>
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
                                 disabled={moving || index === 0}
                                 type='button'
                                 onClick={() => move(item, -1)}
                              >
                                 <ChevronUp className='size-4' />
                              </button>
                              <button
                                 aria-label={t('Ниже')}
                                 className={ICON_BUTTON}
                                 disabled={moving || index === items.length - 1}
                                 type='button'
                                 onClick={() => move(item, 1)}
                              >
                                 <ChevronDown className='size-4' />
                              </button>
                           </div>
                        </td>
                     )}
                     <td className={TD}>
                        <div className='font-semibold'>{nameOf(item)}</div>
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
                           <button
                              aria-label={t('Изменить: {{name}}', {
                                 name: nameOf(item),
                              })}
                              className={ICON_BUTTON}
                              type='button'
                              onClick={() => onEdit(item)}
                           >
                              <Pencil className='size-3.5' />
                           </button>
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
                    'Строку не удаляют, а отключают: формы перестают её предлагать, а сделки и задачи с ней сохраняют её. Порядок — тот, в котором формы показывают список.',
                 )
               : t('Менять справочники может только директор.')}
         </p>
      </Card>
   );
};

export default ListSection;

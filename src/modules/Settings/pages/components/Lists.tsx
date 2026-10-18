import {
   REJECT_REASON_LABELS,
   REJECT_REASON_ORDER,
   SOURCE_LABELS,
   SOURCE_ORDER,
} from '@modules/Deals/constants';
import { INDUSTRY_MANDATES } from '@modules/Settings/constants';
import { Badge, Card } from '@shared/components';
import type { SettingsState } from '@shared/types/settings.types';
import { useTranslation } from 'react-i18next';

interface ListsProps {
   data: SettingsState;
}

interface ListItem {
   key: string;
   text: string;
   badge?: (typeof INDUSTRY_MANDATES)[keyof typeof INDUSTRY_MANDATES];
}

/* The reference lists the platform's forms and checks use. They change
   together with the documents they come from, so they are read-only here. */
const Lists = ({ data }: ListsProps) => {
   const { t } = useTranslation('settings');
   const { t: tDeals } = useTranslation('deals');

   const lists: { title: string; note: string; items: ListItem[] }[] = [
      {
         title: t('Отрасли'),
         note: t('Отрасли формы заявки на сайте и их место в мандате'),
         items: data.industries.map(({ id, name, mandate }) => ({
            key: id,
            text: name,
            badge: INDUSTRY_MANDATES[mandate],
         })),
      },
      {
         title: t('Причины отказа'),
         note: t('Отказ возможен только с причиной из списка'),
         items: REJECT_REASON_ORDER.map((reason) => ({
            key: reason,
            text: tDeals(REJECT_REASON_LABELS[reason]),
         })),
      },
      {
         title: t('Источники сделок'),
         note: t('Откуда пришла заявка'),
         items: SOURCE_ORDER.map((source) => ({
            key: source,
            text: tDeals(SOURCE_LABELS[source]),
         })),
      },
   ];

   return (
      <>
         <div className='gap-section stagger grid lg:grid-cols-2 2xl:grid-cols-3'>
            {lists.map((list) => (
               <Card
                  key={list.title}
                  hint={list.items.length}
                  title={list.title}
               >
                  <p className='text-ink-soft px-5 pt-3 text-xs'>{list.note}</p>
                  <ul className='divide-line divide-y px-5 pb-2'>
                     {list.items.map((item) => (
                        <li
                           key={item.key}
                           className='flex items-center justify-between gap-3 py-2.5'
                        >
                           {item.text}
                           {item.badge && (
                              <Badge tone={item.badge.tone}>
                                 {t(item.badge.label)}
                              </Badge>
                           )}
                        </li>
                     ))}
                  </ul>
               </Card>
            ))}
         </div>
         <p className='text-ink-soft mt-section text-xs'>
            {t(
               'Справочники меняются вместе с положениями фонда; правки вносит директор по решению НС.',
            )}
         </p>
      </>
   );
};

export default Lists;

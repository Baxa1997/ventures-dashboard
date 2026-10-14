import { TYPE_LABELS } from '@modules/Contracts/constants';
import {
   REJECT_REASON_LABELS,
   REJECT_REASON_ORDER,
   SOURCE_LABELS,
   SOURCE_ORDER,
} from '@modules/Deals/constants';
import finance from '@modules/Finance/services';
import { Card } from '@shared/components';
import { useServiceData } from '@shared/hooks';
import type { ContractType } from '@shared/types/contracts.types';
import { useTranslation } from 'react-i18next';

const loadFinance = () => finance.getState();
const subscribeFinance = (listener: () => void) => finance.subscribe(listener);

/* The reference lists the platform's forms and checks use. They change
   together with the documents they come from, so they are read-only here. */
const Lists = () => {
   const { t } = useTranslation('settings');
   const { t: tDeals } = useTranslation('deals');
   const { t: tContracts } = useTranslation('contracts');
   const financeData = useServiceData(loadFinance, subscribeFinance);

   const lists = [
      {
         title: t('Причины отказа'),
         note: t('Отказ возможен только с причиной из списка'),
         items: REJECT_REASON_ORDER.map((reason) =>
            tDeals(REJECT_REASON_LABELS[reason]),
         ),
      },
      {
         title: t('Источники сделок'),
         note: t('Откуда пришла заявка'),
         items: SOURCE_ORDER.map((source) => tDeals(SOURCE_LABELS[source])),
      },
      {
         title: t('Статьи операций'),
         note: t('Привязаны к строкам бюджета; по ним считается факт'),
         items: financeData?.categories.map(({ title }) => title) ?? [],
      },
      {
         title: t('Типы договоров'),
         note: t('Вкладки реестра договоров'),
         items: (Object.keys(TYPE_LABELS) as ContractType[]).map((type) =>
            tContracts(TYPE_LABELS[type]),
         ),
      },
   ];

   return (
      <>
         <div className='gap-section stagger grid lg:grid-cols-2 2xl:grid-cols-4'>
            {lists.map((list) => (
               <Card
                  key={list.title}
                  hint={list.items.length}
                  title={list.title}
               >
                  <p className='text-ink-soft px-5 pt-3 text-xs'>{list.note}</p>
                  <ul className='divide-line divide-y px-5 pb-2'>
                     {list.items.map((item) => (
                        <li key={item} className='py-2.5'>
                           {item}
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

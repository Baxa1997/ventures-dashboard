import {
   approverOf,
   isClosed,
   waitsApproval,
} from '@modules/Procurement/helpers';
import {
   listName,
   listOf,
   nameOf,
   vendorName,
} from '@modules/Settings/services';
import { Avatar, Badge, KanbanBoard } from '@shared/components';
import {
   formatMoneyShort,
   formatNumericDate,
   personName,
   shortName,
   todayISO,
} from '@shared/helpers';
import type { Procurement } from '@shared/types/procurement.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface ProcurementBoardProps {
   requests: Procurement[];
   onOpen: (request: Procurement) => void;
   onMove: (request: Procurement, stage: string) => void;
}

// What a card shows: what is bought, its category and sum, the vendor and the
// date it is needed by, who asks and who approves.
const CardFace = ({ request }: { request: Procurement }) => {
   const { t } = useTranslation('procurement');
   const owner = personName(request.ownerId);
   const late =
      !!request.needDate && !isClosed(request) && request.needDate < todayISO();

   return (
      <>
         <span className='font-semibold'>{request.title}</span>
         <div className='flex flex-wrap items-center gap-1.5 text-xs'>
            <Badge tone='indigo'>
               {listName('procCategories', request.category)}
            </Badge>
            <b>{formatMoneyShort(request.amount)}</b>
         </div>
         <div className='text-ink-faint flex justify-between gap-2 text-xs'>
            <span className='truncate'>
               {vendorName(request.vendorId) || t('Поставщик не выбран')}
            </span>
            {request.needDate && (
               <span className={clsx('shrink-0', late && 'text-danger')}>
                  {t('к {{date}}', {
                     date: formatNumericDate(request.needDate),
                  })}
               </span>
            )}
         </div>
         <div className='text-ink-faint flex items-center gap-1.5 text-xs'>
            <Avatar name={owner} />
            <span className='truncate'>{owner}</span>
            {waitsApproval(request) && (
               <span className='truncate'>
                  {t('· согласует {{name}}', {
                     name: shortName(personName(approverOf(request))),
                  })}
               </span>
            )}
         </div>
      </>
   );
};

// «Канбан»: a column per stage with how many and how much; a card carried to
// another goes by the same rules as the table's button.
const ProcurementBoard = ({
   requests,
   onOpen,
   onMove,
}: ProcurementBoardProps) => {
   const { t } = useTranslation('procurement');
   // a stage turned off stays while a request is still on it
   const columns = listOf('procStages', true)
      .filter(
         ({ active, key }) =>
            active || requests.some(({ stage }) => stage === key),
      )
      .map((item) => {
         const cards = requests.filter(({ stage }) => stage === item.key);
         return {
            id: item.key,
            label: nameOf(item),
            color: item.color || 'var(--color-neutral)',
            aside: `${cards.length} · ${formatMoneyShort(
               cards.reduce((sum, { amount }) => sum + amount, 0),
            )}`,
         };
      });

   return (
      <>
         <KanbanBoard
            columnOf={({ stage }) => stage}
            columns={columns}
            idOf={({ id }) => id}
            items={requests}
            nameOf={({ title }) => title}
            renderCard={(request) => <CardFace request={request} />}
            onMove={onMove}
            onOpen={onOpen}
         />
         <p className='text-ink-soft mt-2.5 text-xs'>
            {t(
               'Перетащите заявку на следующий этап. Этапы, категории и поставщики настраиваются в «Настройки → Фонд».',
            )}
         </p>
      </>
   );
};

export default ProcurementBoard;

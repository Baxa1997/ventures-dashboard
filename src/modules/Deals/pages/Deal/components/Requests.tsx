import { RequestDialog } from '@modules/Deals/components';
import { isOpen } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { listName } from '@modules/Settings/services';
import {
   ActionMenu,
   Badge,
   Button,
   Card,
   ConfirmDialog,
   NoData,
   Spinner,
   Table,
   TD,
   TH,
} from '@shared/components';
import { formatDate, todayISO } from '@shared/helpers';
import { useCurrentUser, useRequest } from '@shared/hooks';
import type { Deal, DealRequest } from '@shared/types/deals.types';
import clsx from 'clsx';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DataRoom from './DataRoom';

interface RequestsProps {
   deal: Deal;
   folderId: string; // the open folder of the data room
   onFolder: (folderId: string) => void;
   onRequest: (title: string) => void;
}

interface RequestRowProps {
   dealId: string;
   request: DealRequest;
   writable: boolean;
   onEdit: () => void;
   onRemove: () => void;
}

/* A request to the founder, as the design's row: its tick, what was asked,
   the data room folder its file goes to, the deadline and the status. The
   tick says it came; taken off, the request waits again. The founder answers
   in the startup cabinet, and the request then shows «Ответ получен» with
   what they wrote until the fund ticks it. */
const RequestRow = ({
   dealId,
   request,
   writable,
   onEdit,
   onRemove,
}: RequestRowProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   const ticking = useRequest();
   const { status } = request;
   const received = status === 'accepted';
   const late = status === 'waiting' && request.dueDate < todayISO();
   const line =
      status !== 'waiting' && request.detail
         ? t('Ответ: {{text}}', { text: request.detail })
         : request.ddQuestionnaire
           ? t('DD-вопросник · анкета в кабинете основателя')
           : request.text;

   const tick = () =>
      ticking.run(() =>
         received
            ? deals.reopenRequest(dealId, request.id, user.id)
            : status === 'answered'
              ? deals.acceptAnswer(dealId, request.id)
              : deals.receiveRequest(dealId, request.id, user.id),
      );

   return (
      <tr>
         <td className={clsx(TD, 'w-9')}>
            <button
               type='button'
               aria-label={t('Получено')}
               aria-pressed={received}
               className={clsx(
                  'grid size-4.5 place-items-center rounded-[5px] border',
                  received
                     ? 'bg-success border-success text-white'
                     : 'border-line-strong hover:border-success bg-white',
               )}
               data-hint={
                  received
                     ? t('Снять отметку о получении')
                     : t('Отметить, что документ получен')
               }
               disabled={!writable || ticking.pending}
               onClick={tick}
            >
               {ticking.pending ? (
                  <Spinner className='size-3' />
               ) : (
                  received && <Check aria-hidden className='size-3' />
               )}
            </button>
         </td>
         <td className={TD}>
            <div
               className={clsx(
                  'font-semibold',
                  received && 'text-ink-soft font-normal line-through',
               )}
            >
               {request.title}
            </div>
            {line && (
               <div className='text-ink-soft line-clamp-1 text-xs' title={line}>
                  {line}
               </div>
            )}
         </td>
         <td className={clsx(TD, 'whitespace-nowrap')}>
            {request.folder ? listName('docFolders', request.folder) : '—'}
         </td>
         <td
            className={clsx(
               TD,
               'whitespace-nowrap',
               late && 'text-danger font-semibold',
            )}
         >
            {formatDate(request.dueDate)}
         </td>
         <td className={clsx(TD, 'whitespace-nowrap')}>
            {received ? (
               <Badge tone='success'>{t('Получено')}</Badge>
            ) : status === 'answered' ? (
               <Badge tone='accent'>{t('Ответ получен')}</Badge>
            ) : late ? (
               <Badge tone='danger'>{t('Просрочено')}</Badge>
            ) : (
               <Badge tone='warning'>{t('Ожидаем')}</Badge>
            )}
         </td>
         <td className={clsx(TD, 'w-0 text-right')}>
            {writable && (
               <ActionMenu
                  actions={[
                     {
                        label: t('Изменить'),
                        icon: Pencil,
                        onSelect: onEdit,
                     },
                     {
                        label: t('Удалить'),
                        icon: Trash2,
                        danger: true,
                        onSelect: onRemove,
                     },
                  ]}
                  name={request.title}
               />
            )}
         </td>
      </tr>
   );
};

/* «Запросы и документы», as the design draws them: the requests to the
   founder as a table, the data room under them. */
const Requests = ({ deal, folderId, onFolder, onRequest }: RequestsProps) => {
   const { t } = useTranslation('deals');
   const requests = deal.requests ?? [];
   const writable = isOpen(deal);
   const [editing, setEditing] = useState<DealRequest | null>(null);
   const [removing, setRemoving] = useState<DealRequest | null>(null);

   return (
      <div className='gap-section flex flex-1 flex-col'>
         <Card
            action={
               writable && (
                  <Button
                     className='h-8 px-3 text-xs'
                     hint={t(
                        'Попросить у основателя документ: запрос появится в его кабинете',
                     )}
                     onClick={() => onRequest('')}
                  >
                     <Plus aria-hidden />
                     {t('Запросить документ')}
                  </Button>
               )
            }
            title={t('Запросы основателю')}
         >
            {requests.length ? (
               <Table
                  className='min-w-2xl'
                  head={
                     <>
                        <th className={clsx(TH, 'w-9')}>
                           <span className='sr-only'>{t('Получено')}</span>
                        </th>
                        <th className={TH}>{t('Что запрошено')}</th>
                        <th className={TH}>{t('Папка дата рума')}</th>
                        <th className={TH}>{t('Срок')}</th>
                        <th className={TH}>{t('Статус')}</th>
                        <th className={TH}>
                           <span className='sr-only'>{t('Действия')}</span>
                        </th>
                     </>
                  }
               >
                  {requests.map((request) => (
                     <RequestRow
                        key={request.id}
                        dealId={deal.id}
                        request={request}
                        writable={writable}
                        onEdit={() => setEditing(request)}
                        onRemove={() => setRemoving(request)}
                     />
                  ))}
               </Table>
            ) : (
               <NoData>{t('Запросов пока нет.')}</NoData>
            )}
         </Card>

         <DataRoom
            deal={deal}
            folderId={folderId}
            onFolder={onFolder}
            onRequest={onRequest}
         />
         <RequestDialog
            deal={editing && deal}
            request={editing}
            onClose={() => setEditing(null)}
         />
         <ConfirmDialog
            open={removing !== null}
            subtitle={removing?.title}
            title={t('Удалить запрос?')}
            onClose={() => setRemoving(null)}
            onConfirm={() =>
               removing && deals.removeRequest(deal.id, removing.id)
            }
         >
            <p>
               {t(
                  'Запрос уйдёт из списка вместе с файлами для заявителя; присланные им документы останутся в data room. Если других открытых запросов нет, часы стадии снова пойдут.',
               )}
            </p>
         </ConfirmDialog>
      </div>
   );
};

export default Requests;

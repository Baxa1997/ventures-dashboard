import { stageName } from '@modules/Settings/services';
import { STATUS_LABELS } from '@modules/Deals/constants';
import { personName, reasonText } from '@modules/Deals/helpers';
import { Card, NoData } from '@shared/components';
import { formatDayYear } from '@shared/helpers';
import type { Deal, JournalEntry } from '@shared/types/deals.types';
import { useTranslation } from 'react-i18next';

interface HistoryProps {
   deal: Deal;
}

/* The deal's journal, newest first: stage moves, requests, decisions. An
   entry without an employee came from the applicant: the website's
   application, or an answer or a document from the startup cabinet. */
const History = ({ deal }: HistoryProps) => {
   const { t } = useTranslation('deals');

   const textOf = (entry: JournalEntry) => {
      switch (entry.kind) {
         case 'text':
            return entry.text;
         case 'created':
            return entry.userId
               ? t('Заявка добавлена вручную · {{name}}', {
                    name: personName(entry.userId),
                 })
               : t('Заявка с сайта');
         case 'taken':
            return t('Взята в скрининг · {{name}}', {
               name: personName(entry.userId),
            });
         case 'stage':
            return entry.stage === 'portfolio'
               ? t('Переведена в портфель')
               : t('Переведена в стадию «{{stage}}»', {
                    stage: stageName(entry.stage),
                 });
         case 'rejected':
            return t('Отказ: {{reason}} · {{name}}', {
               reason: reasonText(entry.reason).toLowerCase(),
               name: personName(entry.userId),
            });
         case 'request':
            return t('Запрос заявителю: {{title}} · {{name}}', {
               title: entry.title,
               name: personName(entry.userId),
            });
         case 'answered':
            return entry.userId
               ? t('Ответ заявителя записан: {{title}} · {{name}}', {
                    title: entry.title,
                    name: personName(entry.userId),
                 })
               : t('Заявитель ответил на запрос в кабинете: {{title}}', {
                    title: entry.title,
                 });
         case 'document': {
            const params = {
               title: entry.title,
               name: personName(entry.userId),
            };
            if (entry.result === 'accepted')
               return t('Документ принят: {{title}} · {{name}}', params);
            if (entry.result === 'rejected')
               return t('Документ отклонён: {{title}} · {{name}}', params);
            if (!entry.userId)
               return t('Заявитель загрузил документ в кабинете: {{title}}', {
                  title: entry.title,
               });
            return t(
               'Документ загружен от имени фонда: {{title}} · {{name}}',
               params,
            );
         }
         case 'screening':
            return t('Скрининг завершён · {{name}}', {
               name: personName(entry.userId),
            });
         case 'memo':
            return t('Меморандум утверждён спонсором · {{name}}', {
               name: personName(entry.userId),
            });
         case 'approved':
            return t('Директор одобрил переход · {{name}}', {
               name: personName(entry.userId),
            });
         case 'edited':
            return t('Данные сделки изменены · {{name}}', {
               name: personName(entry.userId),
            });
         case 'moved': {
            // the founder withdrew the application in the startup cabinet
            if (!entry.userId && entry.status === 'withdrawn')
               return entry.reason
                  ? t('Заявитель отозвал заявку в кабинете: {{reason}}', {
                       reason: entry.reason,
                    })
                  : t('Заявитель отозвал заявку в кабинете');
            const moved = {
               stage: stageName(entry.stage),
               status: t(STATUS_LABELS[entry.status]).toLowerCase(),
               reason: entry.reason,
               name: personName(entry.userId),
            };
            // the reason is written only when one was given
            return entry.reason
               ? t(
                    'Вручную: «{{stage}}», {{status}} — {{reason}} · {{name}}',
                    moved,
                 )
               : t('Вручную: «{{stage}}», {{status}} · {{name}}', moved);
         }
         case 'workstream':
            return entry.handed
               ? t('Направление DD передано исполнителю: {{name}}', {
                    name: entry.name,
                 })
               : t('Добавлено направление DD: {{name}}', { name: entry.name });
      }
   };

   if (!deal.journal.length)
      return (
         <Card className='grid flex-1 place-items-center'>
            <NoData>{t('Записей в журнале этой сделки в примере нет')}</NoData>
         </Card>
      );

   return (
      <Card title={t('Журнал сделки')}>
         <ol className='divide-line divide-y px-5 py-1'>
            {deal.journal.map((entry) => (
               <li
                  key={entry.id}
                  className='text-meta grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 py-3'
               >
                  <time className='text-ink-soft' dateTime={entry.date}>
                     {formatDayYear(entry.date)}
                  </time>
                  <span>{textOf(entry)}</span>
               </li>
            ))}
         </ol>
      </Card>
   );
};

export default History;

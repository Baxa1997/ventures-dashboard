import { useDealLinks } from '@modules/Deals/hooks';
import { PORTFOLIO_PATH } from '@modules/Portfolio/constants';
import { Card, FactList, type FactRow } from '@shared/components';
import { SECTION_PATHS } from '@shared/constants';
import { formatDate } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface RelatedCardProps {
   deal: Deal;
}

/* «Связанные объекты»: where else the deal is in the panel — its tasks, the
   company's requests and documents, DD, the memorandum, the meetings and,
   once closed, its company in Портфель — each with a link there. */
const RelatedCard = ({ deal }: RelatedCardProps) => {
   const { t } = useTranslation('deals');
   const { tasks, company } = useDealLinks(deal.id);
   const open = tasks
      .filter(
         ({ relation, relationId, status }) =>
            relation === 'deal' && relationId === deal.id && status !== 'done',
      )
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
   const nearest = open[0];
   const waiting = (deal.requests ?? []).filter(
      ({ status }) => status === 'waiting',
   ).length;
   const documents = deal.documents?.length ?? 0;
   const streams = deal.workstreams ?? [];
   const closed = streams.filter(({ status }) => status === 'done').length;
   const decisions = deal.decisions?.length ?? 0;

   const link = (to: string, text: string) => (
      <Link className='link' to={to}>
         {text}
      </Link>
   );

   const rows: (FactRow | false)[] = [
      {
         label: t('Задачи'),
         value: nearest
            ? link(
                 `${SECTION_PATHS.tasks}?tab=open&task=${nearest.id}`,
                 t('{{count}} открытая', { count: open.length }),
              )
            : t('открытых нет'),
         note:
            nearest &&
            (nearest.dueDate
               ? t('ближайшая до {{date}}', {
                    date: formatDate(nearest.dueDate),
                 })
               : nearest.dueLabel),
      },
      (waiting > 0 || documents > 0) && {
         label: t('Запросы'),
         value: link(
            '?tab=requests',
            [
               waiting > 0 && t('{{count}} ждёт ответа', { count: waiting }),
               documents > 0 && t('{{count}} документ', { count: documents }),
            ]
               .filter(Boolean)
               .join(' · '),
         ),
      },
      streams.length > 0 && {
         label: t('DD'),
         value: link(
            '?tab=dd',
            t('{{done}} из {{total}} направлений закрыто', {
               done: closed,
               total: streams.length,
            }),
         ),
      },
      !!deal.memo && {
         label: t('Меморандум'),
         value: link(
            '?tab=memo',
            deal.memo.approvedAt
               ? t('v{{version}} · утверждён {{date}}', {
                    version: deal.memo.version,
                    date: formatDate(deal.memo.approvedAt),
                 })
               : t('v{{version}} · черновик', { version: deal.memo.version }),
         ),
      },
      !!deal.committee && {
         label: t('Заседание'),
         value: link(
            `${SECTION_PATHS.committee}/${deal.committee.id}`,
            t(
               deal.stage === 'board'
                  ? 'НС № {{number}} · {{date}}'
                  : 'ИК № {{number}} · {{date}}',
               {
                  number: deal.committee.number,
                  date: formatDate(deal.committee.date),
               },
            ),
         ),
      },
      decisions > 0 && {
         label: t('Решения'),
         value: link(
            '?tab=decisions',
            t('{{count}} решение ИК и НС', { count: decisions }),
         ),
      },
      !!company && {
         label: t('Портфель'),
         value: link(`${PORTFOLIO_PATH}/${company.id}`, company.name),
      },
   ];

   return (
      <Card title={t('Связанные объекты')}>
         <div className='text-meta px-5 py-1'>
            <FactList
               divided
               labelWidth='6.5rem'
               rows={rows.filter((row): row is FactRow => !!row)}
            />
         </div>
      </Card>
   );
};

export default RelatedCard;

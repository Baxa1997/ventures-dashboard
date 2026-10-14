import { RiskList } from '@modules/Deals/components';
import {
   WORKSTREAM_STATUS_LABELS,
   WORKSTREAM_STATUS_TONES,
} from '@modules/Deals/constants';
import { Badge, Card, NoData, buttonClass } from '@shared/components';
import { SECTION_PATHS } from '@shared/constants';
import { formatDate } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface DueDiligenceProps {
   deal: Deal;
}

const TH = 'px-3 py-2.5 text-xs font-normal text-ink-soft';

// Detailed DD: its workstreams with who does each, and the risks found.
const DueDiligence = ({ deal }: DueDiligenceProps) => {
   const { t } = useTranslation('deals');
   const streams = deal.workstreams ?? [];
   const risks = deal.risks ?? [];
   const closed = streams.filter(({ status }) => status === 'done').length;
   const high = risks.filter(({ level }) => level === 'high').length;
   const { dd } = deal;

   const tiles = dd && [
      ...(deal.stage === 'dd' && deal.days
         ? [
              {
                 label: t('Срок стадии'),
                 value: t('{{used}} из {{norm}} р.д.', deal.days),
                 note: `${t('до {{date}}', { date: formatDate(dd.due) })} · ${
                    deal.clock?.pausedDays
                       ? t('на паузе {{total}} р.д.', {
                            total: deal.clock.pausedDays,
                         })
                       : t('пауз не было')
                 }`,
                 tone: '',
              },
           ]
         : []),
      {
         label: t('Направлений закрыто'),
         value: t('{{done}} из {{total}}', { done: closed, total: streams.length }),
         note: dd.closedNote,
         tone: closed < streams.length ? 'text-warning-ink' : '',
      },
      {
         label: t('Открытых рисков'),
         value: String(risks.length),
         note: `${t('{{count}} высокий', { count: high })} · ${
            risks.every(({ ownerId }) => ownerId)
               ? t('владельцы назначены')
               : t('не у всех есть владелец')
         }`,
         tone: risks.length ? 'text-danger' : '',
      },
      {
         label: t('Внешний DD по договорам'),
         value: dd.external.value,
         note: dd.external.note,
         tone: '',
      },
   ];

   return (
      <div className='gap-section flex flex-col'>
         {tiles && (
            <dl className='gap-section grid grid-cols-2 xl:grid-cols-4'>
               {tiles.map((tile) => (
                  <div
                     key={tile.label}
                     className='border-line rounded-lg border bg-white px-5 py-4'
                  >
                     <dt className='text-ink-soft text-xs'>{tile.label}</dt>
                     <dd>
                        <div
                           className={clsx(
                              'text-display mt-1.5 font-bold tabular-nums',
                              tile.tone,
                           )}
                        >
                           {tile.value}
                        </div>
                        <div className='text-ink-soft mt-1.5 text-xs'>
                           {tile.note}
                        </div>
                     </dd>
                  </div>
               ))}
            </dl>
         )}

         <Card
            action={
               <Link className='link' to={SECTION_PATHS.documents}>
                  {t('Шаблон DD')}
               </Link>
            }
            className='overflow-hidden'
            hint={dd && t('данные из «Трекер аудита» в Notion')}
            title={t('Направления DD')}
         >
            {streams.length ? (
               <div className='overflow-x-auto'>
                  <table className='text-meta w-full min-w-4xl border-collapse text-left'>
                     <thead>
                        <tr className='bg-ground border-line border-b'>
                           <th className={`${TH} pl-5`}>{t('Направление')}</th>
                           <th className={TH}>{t('Исполнитель и основание')}</th>
                           <th className={TH}>{t('Передано')}</th>
                           <th className={TH}>{t('Срок')}</th>
                           <th className={TH}>{t('Статус')}</th>
                           <th className={`${TH} pr-5`}>{t('Вывод')}</th>
                        </tr>
                     </thead>
                     <tbody className='divide-line divide-y'>
                        {streams.map((stream) => (
                           <tr key={stream.id} className='align-top'>
                              <td className='py-3.5 pr-3 pl-5 text-sm font-semibold'>
                                 {stream.name}
                              </td>
                              <td className='w-[27%] px-3 py-3.5'>
                                 {stream.executor}
                              </td>
                              <td className='text-ink-soft px-3 py-3.5 whitespace-nowrap'>
                                 {stream.handedAt ? formatDate(stream.handedAt) : '—'}
                              </td>
                              <td className='text-ink-soft px-3 py-3.5 whitespace-nowrap'>
                                 {formatDate(stream.dueDate)}
                              </td>
                              <td className='px-3 py-3.5'>
                                 <Badge tone={WORKSTREAM_STATUS_TONES[stream.status]}>
                                    {t(WORKSTREAM_STATUS_LABELS[stream.status])}
                                 </Badge>
                              </td>
                              <td className='text-ink-soft w-[25%] py-3.5 pr-5 pl-3 text-xs'>
                                 {stream.conclusion || '—'}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            ) : (
               <NoData>{t('Направлений DD для этой сделки в примере нет')}</NoData>
            )}
         </Card>

         <div className='gap-section grid items-start xl:grid-cols-[minmax(0,1fr)_23.75rem]'>
            <Card
               action={
                  deal.memo && (
                     <Link className='link' to='?tab=memo'>
                        {t('Матрица рисков')}
                     </Link>
                  )
               }
               hint={t('{{count}} открытый', { count: risks.length })}
               title={t('Ключевые риски')}
            >
               {risks.length ? (
                  <RiskList risks={risks} />
               ) : (
                  <NoData>{t('Открытых рисков нет')}</NoData>
               )}
            </Card>

            {dd && (
               <div className='gap-section flex min-w-0 flex-col'>
                  <Card title={t('Факторы в пользу')}>
                     <ul className='divide-line text-meta divide-y px-5 py-1'>
                        {dd.strengths.map((strength) => (
                           <li key={strength} className='py-3'>
                              {strength}
                           </li>
                        ))}
                     </ul>
                  </Card>
                  {dd.alert && (
                     <section className='bg-warning-tint rounded-lg p-5'>
                        <h2 className='text-warning-ink font-semibold'>
                           {dd.alert.title}
                        </h2>
                        <p className='text-meta mt-2'>{dd.alert.text}</p>
                        <Link
                           className={buttonClass('ghost', 'mt-3.5')}
                           to={SECTION_PATHS.procurement}
                        >
                           {t('Создать закупку')}
                        </Link>
                     </section>
                  )}
               </div>
            )}
         </div>
      </div>
   );
};

export default DueDiligence;

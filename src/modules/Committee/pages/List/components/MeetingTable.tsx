import {
   COMMITTEE_PATH,
   MEETING_STATUS,
   PROTOCOL_STATES,
} from '@modules/Committee/constants';
import {
   itemBadge,
   materialsOf,
   meetingName,
   meetingType,
   participantsOf,
   speakerOf,
   tallyVotes,
} from '@modules/Committee/helpers';
import type { CommitteeData } from '@modules/Committee/hooks';
import {
   headerBadge,
   industryText,
   roundText,
   scoreClass,
   scoreOf,
} from '@modules/Deals/helpers';
import { relativeDay } from '@modules/Work/helpers';
import {
   Badge,
   Button,
   Card,
   CompanyMark,
   NoData,
   Table,
   TD,
   TH,
} from '@shared/components';
import { formatDayYear, formatUsd, personName } from '@shared/helpers';
import type { Meeting } from '@shared/types/committee.types';
import clsx from 'clsx';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

interface MeetingTableProps {
   data: CommitteeData;
}

/* «Таблица»: the register of the meetings, newest first, as the design draws
   it. A row opens in place to show its questions — the deal, its stage, the
   sum asked, the score, who presents it, the votes, the decision and the
   materials — and leads to the meeting. */
const MeetingTable = ({ data }: MeetingTableProps) => {
   const { t } = useTranslation('committee');
   const { t: tWork } = useTranslation('work');
   const [open, setOpen] = useState<string[]>([]);
   const meetings = [...data.meetings].sort((a, b) =>
      b.date.localeCompare(a.date),
   );

   const toggle = (id: string) =>
      setOpen((ids) =>
         ids.includes(id) ? ids.filter((one) => one !== id) : [...ids, id],
      );

   if (!meetings.length)
      return (
         <Card className='grid flex-1 place-items-center'>
            <NoData>{t('Заседаний пока нет')}</NoData>
         </Card>
      );

   return (
      <Card>
         <Table
            className='min-w-5xl'
            head={
               <>
                  <th aria-label={t('Раскрыть')} className={clsx(TH, 'w-10')} />
                  <th className={TH}>{t('Заседание')}</th>
                  <th className={TH}>{t('Дата')}</th>
                  <th className={TH}>{t('Статус')}</th>
                  <th className={TH}>{t('Вопросы повестки')}</th>
                  <th className={TH}>{t('Итоги')}</th>
                  <th className={clsx(TH, 'text-right')}>{t('Члены ИК')}</th>
                  <th className={TH}>{t('Протокол')}</th>
               </>
            }
         >
            {meetings.map((meeting) => {
               const opened = open.includes(meeting.id);
               const status = MEETING_STATUS[meeting.status];
               return (
                  <Fragment key={meeting.id}>
                     <tr
                        aria-expanded={opened}
                        className='hover:bg-hover cursor-pointer'
                        tabIndex={0}
                        onClick={() => toggle(meeting.id)}
                        onKeyDown={(event) => {
                           if (event.key !== 'Enter' && event.key !== ' ')
                              return;
                           event.preventDefault();
                           toggle(meeting.id);
                        }}
                     >
                        <td className={TD}>
                           <ChevronRight
                              aria-hidden
                              className={clsx(
                                 'text-ink-soft size-4 transition-transform',
                                 opened && 'rotate-90',
                              )}
                           />
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           <div className='font-bold'>
                              {meetingName(t, meeting)}
                           </div>
                           <div className='text-ink-soft text-xs'>
                              {meetingType(t, meeting)}
                           </div>
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           <div className='tabular-nums'>
                              {formatDayYear(meeting.date)}
                              {meeting.time && ` · ${meeting.time}`}
                           </div>
                           {meeting.status === 'planned' && (
                              <div className='text-ink-faint text-xs'>
                                 {relativeDay(tWork, meeting.date)}
                              </div>
                           )}
                        </td>
                        <td className={TD}>
                           <Badge tone={status.tone}>{t(status.label)}</Badge>
                        </td>
                        <td className={clsx(TD, 'min-w-44')}>
                           {meeting.agenda.length ? (
                              meeting.agenda
                                 .map(({ title }) => title)
                                 .join(', ')
                           ) : (
                              <span className='text-ink-faint'>
                                 {t('повестка пуста')}
                              </span>
                           )}
                        </td>
                        <td className={TD}>
                           <div className='flex flex-wrap gap-1'>
                              {meeting.agenda.map((item) => {
                                 const badge = itemBadge(t, meeting, item);
                                 return (
                                    <Badge key={item.id} tone={badge.tone}>
                                       {badge.label}
                                    </Badge>
                                 );
                              })}
                           </div>
                        </td>
                        <td className={clsx(TD, 'text-right tabular-nums')}>
                           {participantsOf(meeting, data.members).length}
                        </td>
                        <td className={TD}>
                           {meeting.protocol === 'none' ? (
                              <span className='text-ink-faint'>—</span>
                           ) : (
                              <Badge
                                 tone={PROTOCOL_STATES[meeting.protocol].tone}
                              >
                                 {t(PROTOCOL_STATES[meeting.protocol].label)}
                              </Badge>
                           )}
                        </td>
                     </tr>
                     {opened && (
                        <tr>
                           <td
                              className='bg-ground/60 px-4.5 py-3.5'
                              colSpan={8}
                           >
                              <MeetingItems data={data} meeting={meeting} />
                           </td>
                        </tr>
                     )}
                  </Fragment>
               );
            })}
         </Table>
         <footer className='border-line text-ink-soft flex flex-wrap justify-between gap-2 border-t px-4.5 py-2.5 text-xs'>
            <span>{t('{{count}} заседание', { count: meetings.length })}</span>
            <span>
               {t('Нажмите на строку, чтобы увидеть вопросы заседания')}
            </span>
         </footer>
      </Card>
   );
};

interface MeetingItemsProps {
   data: CommitteeData;
   meeting: Meeting;
}

// The questions of a meeting, inside its opened row.
const MeetingItems = ({ data, meeting }: MeetingItemsProps) => {
   const { t, i18n } = useTranslation('committee');
   const { t: tDeals } = useTranslation('deals');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const navigate = useNavigate();

   return (
      <div className='border-line overflow-hidden rounded-lg border bg-white'>
         {meeting.agenda.length ? (
            <Table
               className='min-w-4xl'
               head={
                  <>
                     <th className={TH}>{t('Вопрос')}</th>
                     <th className={TH}>{t('Этап сделки')}</th>
                     <th className={clsx(TH, 'text-right')}>{t('Запрос')}</th>
                     <th className={clsx(TH, 'text-right')}>{t('Скоринг')}</th>
                     <th className={TH}>{t('Докладчик')}</th>
                     <th className={TH}>{t('Голоса')}</th>
                     <th className={TH}>{t('Решение')}</th>
                     <th className={TH}>{t('Материалы')}</th>
                  </>
               }
            >
               {meeting.agenda.map((item) => {
                  const deal = data.deals.find(({ id }) => id === item.dealId);
                  const stage = deal && headerBadge(tDeals, deal);
                  const score = deal ? scoreOf(deal) : null;
                  const materials =
                     item.kind === 'decision' ? materialsOf(item, deal) : null;
                  const tally = tallyVotes(meeting, data.members, item);
                  const result = itemBadge(t, meeting, item);
                  return (
                     <tr key={item.id}>
                        <td className={TD}>
                           <div className='flex items-center gap-2.5'>
                              <CompanyMark name={item.title} />
                              <div className='min-w-0'>
                                 {deal ? (
                                    <Link
                                       className='font-semibold hover:underline'
                                       to={`/deals/${deal.id}`}
                                    >
                                       {item.title}
                                    </Link>
                                 ) : (
                                    <span className='font-semibold'>
                                       {item.title}
                                    </span>
                                 )}
                                 <div className='text-ink-soft text-xs'>
                                    {deal
                                       ? [industryText(deal), roundText(deal)]
                                            .filter(Boolean)
                                            .join(' · ')
                                       : t('Вопрос для информации')}
                                 </div>
                              </div>
                           </div>
                        </td>
                        <td className={TD}>
                           {stage ? (
                              <Badge tone={stage.tone}>{stage.label}</Badge>
                           ) : (
                              <span className='text-ink-faint'>—</span>
                           )}
                        </td>
                        <td
                           className={clsx(
                              TD,
                              'text-right whitespace-nowrap tabular-nums',
                           )}
                        >
                           {item.amount || deal?.amount
                              ? formatUsd(
                                   item.amount || deal?.amount || 0,
                                   language,
                                )
                              : '—'}
                        </td>
                        <td
                           className={clsx(
                              TD,
                              'text-right whitespace-nowrap tabular-nums',
                           )}
                        >
                           {score === null ? (
                              <span className='text-ink-faint'>—</span>
                           ) : (
                              <b className={scoreClass(score)}>
                                 {t('{{score}} / 5', {
                                    score: score.toFixed(1),
                                 })}
                              </b>
                           )}
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           {personName(speakerOf(item, deal)) || '—'}
                        </td>
                        <td
                           className={clsx(
                              TD,
                              'whitespace-nowrap tabular-nums',
                           )}
                        >
                           {item.kind === 'info' ? (
                              <span className='text-ink-faint'>—</span>
                           ) : meeting.status === 'planned' ? (
                              <span className='text-ink-faint'>
                                 {t('голосование не начато')}
                              </span>
                           ) : (
                              <span
                                 title={t('За / против / особое мнение')}
                              >
                                 {[
                                    tally.for,
                                    tally.against,
                                    tally.dissent.length,
                                 ].join(' · ')}
                              </span>
                           )}
                        </td>
                        <td className={TD}>
                           <Badge tone={result.tone}>{result.label}</Badge>
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           {materials ? (
                              <Badge
                                 tone={
                                    materials.ready < materials.total
                                       ? 'warning'
                                       : 'success'
                                 }
                              >
                                 {t('{{ready}} из {{total}}', materials)}
                              </Badge>
                           ) : (
                              <span className='text-ink-faint'>—</span>
                           )}
                        </td>
                     </tr>
                  );
               })}
            </Table>
         ) : (
            <p className='text-ink-soft px-4.5 py-3'>
               {t('В повестке нет вопросов.')}
            </p>
         )}
         <div className='border-line flex flex-wrap items-center justify-between gap-2 border-t px-4.5 py-2.5'>
            <span className='text-ink-soft text-xs'>
               {[
                  t('{{count}} вопрос', { count: meeting.agenda.length }),
                  meetingType(t, meeting),
               ].join(' · ')}
            </span>
            <Button
               hint={t('Открыть страницу заседания')}
               size='sm'
               variant='ghost'
               onClick={() => navigate(`${COMMITTEE_PATH}/${meeting.id}`)}
            >
               <ArrowUpRight aria-hidden />
               {t('Открыть заседание')}
            </Button>
         </div>
      </div>
   );
};

export default MeetingTable;

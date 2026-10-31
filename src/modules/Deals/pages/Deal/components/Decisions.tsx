import { COMMITTEE_PATH } from '@modules/Committee/constants';
import { meetingTitle, tallyVotes } from '@modules/Committee/helpers';
import committee from '@modules/Committee/services';
import { isOpen, nextStageOf } from '@modules/Deals/helpers';
import {
   Badge,
   type BadgeTone,
   Button,
   Card,
   Notice,
   Table,
   TD,
   TH,
} from '@shared/components';
import { formatDate } from '@shared/helpers';
import { useServiceData } from '@shared/hooks';
import type { Meeting } from '@shared/types/committee.types';
import type { Deal, Decision } from '@shared/types/deals.types';
import clsx from 'clsx';
import { BadgeCheck, CalendarClock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface DecisionsProps {
   deal: Deal;
   onTransfer: () => void; // the deal goes to the portfolio
}

const VERDICT_TONES: Record<Decision['verdict'], BadgeTone> = {
   approved: 'success',
   rejected: 'danger',
   other: 'warning',
};

const loadCommittee = () => committee.getState();
const onCommittee = (listener: () => void) => committee.subscribe(listener);

const meetingLink = (meeting: Meeting) =>
   `${COMMITTEE_PATH}/${meeting.id}?tab=voting`;

interface DecisionRowsProps {
   decisions: Decision[];
   conditions?: string; // the protocol's conditions for the deal
}

// A body's decisions as label and value: the stage, the outcome in its
// colour with what was decided, and the conditions set.
const DecisionRows = ({ decisions, conditions }: DecisionRowsProps) => {
   const { t } = useTranslation('deals');
   return (
      <dl className='text-meta grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3.5 gap-y-2'>
         {decisions.map((decision) => (
            <div key={decision.id} className='contents'>
               <dt className='text-ink-soft'>{decision.body}</dt>
               <dd>
                  <Badge tone={VERDICT_TONES[decision.verdict]}>
                     {decision.outcome}
                  </Badge>
                  {decision.detail && (
                     <div className='text-ink-soft mt-1 text-xs'>
                        {decision.detail}
                     </div>
                  )}
               </dd>
            </div>
         ))}
         {conditions && (
            <>
               <dt className='text-ink-soft'>{t('Условия')}</dt>
               <dd className='font-medium whitespace-pre-line'>
                  {conditions}
               </dd>
            </>
         )}
      </dl>
   );
};

/* «Решение ИК и НС», as the design draws it: the investment committee —
   the vote at its last meeting on the deal and what it decided at each
   stage — and the supervisory board beside it; once the deal is on its
   last stage, the step to the portfolio; then every decision on the deal
   with the meeting that took it. */
const Decisions = ({ deal, onTransfer }: DecisionsProps) => {
   const { t } = useTranslation('deals');
   const { t: tc } = useTranslation('committee');
   const data = useServiceData(loadCommittee, onCommittee);
   const decisions = deal.decisions ?? [];
   const ic = decisions.filter(({ stage }) => stage !== 'board');
   const board = decisions.filter(({ stage }) => stage === 'board');
   // the meetings the deal was on, the newest first
   const meetings = (data?.meetings ?? [])
      .filter(({ agenda }) => agenda.some(({ dealId }) => dealId === deal.id))
      .sort((a, b) => b.date.localeCompare(a.date));
   const icMeeting = meetings.find(({ body }) => body === 'ic');
   const boardMeeting = meetings.find(({ body }) => body === 'board');
   const itemOf = (meeting?: Meeting) =>
      meeting?.agenda.find(({ dealId }) => dealId === deal.id);
   const icItem = itemOf(icMeeting);
   const tally =
      data && icMeeting && icItem && icMeeting.status !== 'planned'
         ? tallyVotes(icMeeting, data.members, icItem)
         : null;
   const awaiting = (meeting?: Meeting) =>
      meeting && meeting.status !== 'held' && !itemOf(meeting)?.outcome;
   const approvedByIc = ic.some(({ verdict }) => verdict === 'approved');

   const meetingAction = (meeting?: Meeting) =>
      meeting && (
         <Link className='link text-xs' to={meetingLink(meeting)}>
            {t('{{meeting}} · {{date}}', {
               meeting: meetingTitle(tc, meeting),
               date: formatDate(meeting.date),
            })}
         </Link>
      );
   const planned = (meeting: Meeting) => (
      <Notice icon={CalendarClock}>
         {t(
            'Сделка в повестке: {{meeting}}, {{date}}. Решение появится после голосования.',
            {
               meeting: meetingTitle(tc, meeting),
               date: formatDate(meeting.date),
            },
         )}
      </Notice>
   );

   return (
      <div className='gap-section flex flex-1 flex-col'>
         <div className='gap-section grid items-start lg:grid-cols-2'>
            <Card
               action={meetingAction(icMeeting)}
               title={t('Инвестиционный комитет')}
            >
               <div className='grid gap-3.5 p-5'>
                  {tally && (
                     <div className='text-ink-soft flex flex-wrap gap-x-3 text-xs tabular-nums'>
                        <span>
                           {t('За')}: <b className='text-ink'>{tally.for}</b>
                        </span>
                        <span>
                           {t('Против')}:{' '}
                           <b className='text-ink'>{tally.against}</b>
                        </span>
                        <span>
                           {t('Особое мнение')}:{' '}
                           <b className='text-ink'>{tally.dissent.length}</b>
                        </span>
                        <span>
                           {t('Не голосовали')}:{' '}
                           <b className='text-ink'>
                              {tally.present - tally.voted}
                           </b>
                        </span>
                     </div>
                  )}
                  {ic.length > 0 && (
                     <DecisionRows
                        conditions={icItem?.protocol.conditions}
                        decisions={ic}
                     />
                  )}
                  {icMeeting && awaiting(icMeeting) && planned(icMeeting)}
                  {!ic.length && !icMeeting && (
                     <p className='text-ink-soft text-meta'>
                        {t('Сделка ещё не выносилась на ИК.')}
                     </p>
                  )}
               </div>
            </Card>

            <Card
               action={
                  meetingAction(boardMeeting) ?? (
                     <Badge tone={board.length ? 'success' : 'neutral'}>
                        {board.length ? t('Решение есть') : t('Ожидает')}
                     </Badge>
                  )
               }
               title={t('Наблюдательный совет')}
            >
               <div className='grid gap-3.5 p-5'>
                  <p className='text-ink-soft text-xs'>
                     {t(
                        'После ИК-2 сделку одобряет Наблюдательный совет SQB Ventures; его заседания ведутся в «Инвесткомитете».',
                     )}
                  </p>
                  {board.length > 0 && (
                     <DecisionRows
                        conditions={itemOf(boardMeeting)?.protocol.conditions}
                        decisions={board}
                     />
                  )}
                  {boardMeeting &&
                     awaiting(boardMeeting) &&
                     planned(boardMeeting)}
                  {!board.length && !boardMeeting && (
                     <p className='text-ink-soft text-meta'>
                        {approvedByIc
                           ? t('Ожидает заседания Наблюдательного совета.')
                           : t('Ожидает решения ИК.')}
                     </p>
                  )}
               </div>
            </Card>
         </div>

         {isOpen(deal) && !nextStageOf(deal.stage) && (
            <Card>
               <div className='flex flex-wrap items-center gap-3.5 p-5'>
                  <BadgeCheck
                     aria-hidden
                     className='text-success size-5.5 shrink-0'
                  />
                  <p className='text-meta min-w-56 flex-1'>
                     <b>{t('Все одобрения получены.')}</b>{' '}
                     {t(
                        'Закройте сделку после подписания договора: компания перейдёт в портфель, а основатель увидит, что заявка принята.',
                     )}
                  </p>
                  <Button onClick={onTransfer}>
                     {t('Перевести в портфель')}
                  </Button>
               </div>
            </Card>
         )}

         {decisions.length > 0 && (
            <Card title={t('Все решения по сделке')}>
               <Table
                  className='min-w-xl'
                  head={
                     <>
                        <th className={TH}>{t('Орган')}</th>
                        <th className={TH}>{t('Решение')}</th>
                        <th className={TH}>{t('Подробности')}</th>
                        <th className={TH}>{t('Заседание')}</th>
                     </>
                  }
               >
                  {decisions.map((decision) => (
                     <tr key={decision.id}>
                        <td className={clsx(TD, 'font-semibold')}>
                           {decision.body}
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           <Badge tone={VERDICT_TONES[decision.verdict]}>
                              {decision.outcome}
                           </Badge>
                        </td>
                        <td className={clsx(TD, 'text-ink-soft text-xs')}>
                           {decision.detail || '—'}
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           {decision.meetingId ? (
                              <Link
                                 className='link'
                                 to={`${COMMITTEE_PATH}/${decision.meetingId}?tab=protocol`}
                              >
                                 {decision.meetingLabel || t('Открыть')}
                              </Link>
                           ) : (
                              decision.meetingLabel || '—'
                           )}
                        </td>
                     </tr>
                  ))}
               </Table>
            </Card>
         )}
      </div>
   );
};

export default Decisions;

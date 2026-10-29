import { stageName } from '@modules/Settings/services';
import { COMMITTEE_PATH } from '@modules/Committee/constants';
import {
   formatName,
   materialsReady,
   meetingName,
   meetingType,
   participantsOf,
   waitingDeals,
} from '@modules/Committee/helpers';
import type { CommitteeData } from '@modules/Committee/hooks';
import { relativeDay } from '@modules/Work/helpers';
import { Button } from '@shared/components';
import { formatDate } from '@shared/helpers';
import type { Meeting } from '@shared/types/committee.types';
import dayjs from 'dayjs';
import { CalendarPlus, Gavel } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

const CARD =
   'border-line shadow-card animate-rise mb-4 flex flex-wrap items-center gap-3.5 rounded-xl border border-l-3 border-l-sky bg-white px-4.5 py-4';
const ICON =
   'bg-accent-tint text-accent-strong grid size-11 shrink-0 place-items-center rounded-lg';

interface NextMeetingProps {
   data: CommitteeData;
   meeting: Meeting;
}

/* The coming meeting, or the one going on, as the design draws it: a card
   that opens it, with when it is, what it decides and how its preparation
   stands. The preparation itself is done on the meeting's page. */
const NextMeeting = ({ data, meeting }: NextMeetingProps) => {
   const { t } = useTranslation('committee');
   const { t: tWork } = useTranslation('work');
   const participants = participantsOf(meeting, data.members);
   const confirmed = participants.filter(
      ({ id }) => meeting.attendance[id] === 'confirmed',
   ).length;
   const when =
      meeting.status === 'live'
         ? t('Идёт заседание · с {{time}}', { time: meeting.startedAt ?? '' })
         : meeting.status === 'break'
           ? t('Перерыв · с {{time}}', { time: meeting.breakAt ?? '' })
           : t('Ближайшее заседание · {{when}}', {
                when: relativeDay(tWork, meeting.date),
             });
   const materials = meeting.materialsSentAt
      ? t('материалы разосланы {{date}}', {
           date: formatDate(meeting.materialsSentAt),
        })
      : materialsReady(meeting, data.deals)
        ? t('материалы готовы к рассылке')
        : t('материалы членам ИК — до {{date}}', {
             date: formatDate(meeting.materialsDue),
          });

   return (
      <Link
         className={`${CARD} hover:shadow-raised transition-shadow`}
         to={`${COMMITTEE_PATH}/${meeting.id}`}
      >
         <span className={ICON}>
            <Gavel aria-hidden className='size-5' />
         </span>
         <div className='min-w-0 flex-1'>
            <div className='text-ink-soft text-xs font-medium'>{when}</div>
            <div className='text-ink-strong text-[17px] leading-6 font-extrabold'>
               {t('{{name}} · {{date}} в {{time}}', {
                  name: meetingName(t, meeting),
                  date: dayjs(meeting.date).format('D MMMM YYYY'),
                  time: meeting.time,
               })}
            </div>
            <div className='text-ink-soft text-meta mt-0.5'>
               {[
                  meetingType(t, meeting),
                  formatName(t, meeting.format),
                  t('{{count}} вопрос', { count: meeting.agenda.length }),
                  meeting.status === 'planned'
                     ? t('подтвердили {{confirmed}} из {{total}}', {
                          confirmed,
                          total: participants.length,
                       })
                     : t('{{count}} член ИК', { count: participants.length }),
                  meeting.status === 'planned' && materials,
               ]
                  .filter(Boolean)
                  .join(' · ')}
            </div>
         </div>
         <span className='link text-meta shrink-0'>{t('Открыть →')}</span>
      </Link>
   );
};

interface NoMeetingProps {
   data: CommitteeData;
   onSchedule: () => void;
}

// No meeting is planned: the deals waiting for one, and where to plan it.
export const NoMeeting = ({ data, onSchedule }: NoMeetingProps) => {
   const { t } = useTranslation('committee');
   const waiting = [
      ...(['ic1', 'ic2'] as const).flatMap((stage) =>
         waitingDeals(data.meetings, data.deals, 'ic', stage).map((deal) => ({
            deal,
            stage: stageName(stage),
         })),
      ),
      ...waitingDeals(data.meetings, data.deals, 'board', null).map((deal) => ({
         deal,
         stage: t('НС'),
      })),
   ];

   return (
      <div className={CARD}>
         <span className={ICON}>
            <CalendarPlus aria-hidden className='size-5' />
         </span>
         <div className='min-w-0 flex-1'>
            <div className='text-ink-strong text-[17px] leading-6 font-extrabold'>
               {t('Ближайших заседаний нет')}
            </div>
            {waiting.length ? (
               <p className='text-meta mt-0.5'>
                  {t('Ждут заседания:')}{' '}
                  {waiting.map(({ deal, stage }, index) => (
                     <span key={deal.id}>
                        {index > 0 && ', '}
                        <Link className='link' to={`/deals/${deal.id}`}>
                           {deal.company}
                        </Link>{' '}
                        <span className='text-ink-soft'>· {stage}</span>
                     </span>
                  ))}
               </p>
            ) : (
               <p className='text-ink-soft text-meta mt-0.5'>
                  {t(
                     'Сделка попадает на заседание, когда доходит до стадии ИК-1, ИК-2 или «Набсовет».',
                  )}
               </p>
            )}
         </div>
         <Button className='shrink-0' onClick={onSchedule}>
            {t('Назначить заседание')}
         </Button>
      </div>
   );
};

export default NextMeeting;

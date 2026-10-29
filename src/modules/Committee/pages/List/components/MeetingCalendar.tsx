import { COMMITTEE_PATH } from '@modules/Committee/constants';
import { isUpcoming, meetingName } from '@modules/Committee/helpers';
import type { CommitteeData } from '@modules/Committee/hooks';
import { MonthCalendar, TONE_COLORS } from '@shared/components';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

interface MeetingCalendarProps {
   data: CommitteeData;
}

/* «Календарь»: the meetings of a month, the coming ones in blue and the held
   ones in green, with the companies on their agenda under them. The month of
   the next meeting is shown first. */
const MeetingCalendar = ({ data }: MeetingCalendarProps) => {
   const { t } = useTranslation('committee');
   const navigate = useNavigate();
   const next = data.meetings
      .filter(isUpcoming)
      .sort((a, b) => a.date.localeCompare(b.date))[0];

   return (
      <MonthCalendar
         hint={t('Синие — запланированные, зелёные — проведённые')}
         renderDay={(date) =>
            data.meetings
               .filter((meeting) => meeting.date === date)
               .map((meeting) => {
                  const color = isUpcoming(meeting)
                     ? TONE_COLORS.accent
                     : TONE_COLORS.success;
                  return (
                     <div key={meeting.id}>
                        <button
                           type='button'
                           className='text-ink mt-1 block w-full truncate rounded-sm border-l-2 px-1.5 py-0.5 text-left text-[11px]'
                           style={{
                              borderLeftColor: color,
                              background: `color-mix(in srgb, ${color} 22%, transparent)`,
                           }}
                           onClick={() =>
                              navigate(`${COMMITTEE_PATH}/${meeting.id}`)
                           }
                        >
                           {[meetingName(t, meeting), meeting.time]
                              .filter(Boolean)
                              .join(' · ')}
                        </button>
                        {meeting.agenda.map((item) => (
                           <span
                              key={item.id}
                              className='block truncate pl-1 text-[10.5px]'
                           >
                              {item.title}
                           </span>
                        ))}
                     </div>
                  );
               })
         }
         start={next?.date}
      />
   );
};

export default MeetingCalendar;

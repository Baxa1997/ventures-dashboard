import Decisions from '@modules/Committee/components/Decisions';
import ScheduleDialog from '@modules/Committee/components/ScheduleDialog';
import {
   COMMITTEE_PATH,
   LIST_VIEW_LABELS,
   LIST_VIEWS,
   type ListView,
   RESULTS,
} from '@modules/Committee/constants';
import {
   isUpcoming,
   meetingName,
   meetingType,
} from '@modules/Committee/helpers';
import { useCommittee } from '@modules/Committee/hooks';
import {
   Button,
   buttonClass,
   Loading,
   PageBody,
   PageHeader,
   Segmented,
} from '@shared/components';
import { SETTINGS_PATH } from '@shared/constants';
import { downloadCsv } from '@shared/helpers';
import {
   CalendarDays,
   CalendarPlus,
   Gavel,
   type LucideIcon,
   Table2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
   Execution,
   MeetingCalendar,
   MeetingTable,
   NextMeeting,
   NoMeeting,
} from './components';

const VIEW_ICONS: Record<ListView, LucideIcon> = {
   table: Table2,
   calendar: CalendarDays,
   decisions: Gavel,
};

const toView = (value: string | null): ListView =>
   LIST_VIEWS.find((view) => view === value) ?? 'table';

/* Инвесткомитет, as the design draws it: the coming meeting on top, then the
   meetings of the committee and the board as a table whose rows open to their
   questions, or as a calendar; «Решения» is the register of decisions with
   the conditions still to be carried out. The address keeps the view
   (?view=calendar); a deal's card opens a new meeting for the deal with
   ?schedule=<deal id>. */
const CommitteeList = () => {
   const { t } = useTranslation('committee');
   const { t: tLayout } = useTranslation('layout');
   const navigate = useNavigate();
   const data = useCommittee();
   const [params, setParams] = useSearchParams();
   const view = toView(params.get('view'));
   const scheduleFor = params.get('schedule') ?? undefined;
   const [scheduling, setScheduling] = useState(false);
   const title = t('Инвесткомитет');

   const header = (
      <PageHeader
         actions={
            <>
               {/* the rules the panel applies: quorum, materials, votes */}
               <Link
                  className={buttonClass('ghost')}
                  to={`${SETTINGS_PATH}/committee`}
               >
                  {t('Положение об ИК')}
               </Link>
               <Button onClick={() => setScheduling(true)}>
                  <CalendarPlus aria-hidden />
                  {t('Назначить заседание')}
               </Button>
            </>
         }
         meta={t(
            'Заседания Инвестиционного комитета и наблюдательного совета: повестка, состав, голосование и протоколы.',
         )}
         section={tLayout('Инвестиции')}
         title={title}
      />
   );

   if (!data)
      return (
         <>
            {header}
            <Loading />
         </>
      );

   // the meeting going on, or else the nearest planned one
   const upcoming = data.meetings
      .filter(isUpcoming)
      .sort((a, b) => a.date.localeCompare(b.date));
   const next =
      upcoming.find(({ status }) => status !== 'planned') ?? upcoming[0];

   const exportRegister = () =>
      downloadCsv('zasedaniya-ik.csv', [
         [t('Заседание'), t('Дата'), t('Тип'), t('Вопросы'), t('Решение')],
         ...[...data.meetings]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((meeting) => [
               meetingName(t, meeting),
               meeting.date,
               meetingType(t, meeting),
               meeting.summary,
               t(RESULTS[meeting.result].label),
            ]),
      ]);

   return (
      <>
         {header}
         <PageBody className='flex flex-col'>
            {next ? (
               <NextMeeting data={data} meeting={next} />
            ) : (
               <NoMeeting data={data} onSchedule={() => setScheduling(true)} />
            )}
            <div className='mb-3.5 flex flex-wrap items-center gap-2'>
               <Segmented
                  items={LIST_VIEWS.map((id) => ({
                     id,
                     label: t(LIST_VIEW_LABELS[id]),
                     icon: VIEW_ICONS[id],
                  }))}
                  label={t('Вид')}
                  value={view}
                  onChange={(id) =>
                     setParams(id === 'table' ? {} : { view: id }, {
                        replace: true,
                     })
                  }
               />
               {view === 'table' && (
                  <Button
                     className='ml-auto'
                     variant='ghost'
                     onClick={exportRegister}
                  >
                     {t('Экспорт')}
                  </Button>
               )}
            </div>
            {view === 'table' && <MeetingTable data={data} />}
            {view === 'calendar' && <MeetingCalendar data={data} />}
            {view === 'decisions' && (
               <div className='gap-section grid flex-1 items-start xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]'>
                  <div className='flex min-w-0 flex-col'>
                     <Decisions data={data} />
                  </div>
                  <Execution data={data} />
               </div>
            )}
         </PageBody>
         <ScheduleDialog
            data={data}
            dealId={scheduleFor}
            open={scheduling || !!scheduleFor}
            onClose={() => {
               setScheduling(false);
               if (scheduleFor) setParams({}, { replace: true });
            }}
            onScheduled={(meeting) =>
               navigate(`${COMMITTEE_PATH}/${meeting.id}`)
            }
         />
      </>
   );
};

export default CommitteeList;

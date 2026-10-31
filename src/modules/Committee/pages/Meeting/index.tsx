import MeetingDialog from '@modules/Committee/components/MeetingDialog';
import {
   COMMITTEE_PATH,
   MEETING_TAB_LABELS,
   MEETING_TABS,
   type MeetingTab,
   OLD_MEETING_TABS,
} from '@modules/Committee/constants';
import {
   attendedMembers,
   isDecided,
   meetingTitle,
   participantsOf,
   preparationOf,
} from '@modules/Committee/helpers';
import { type CommitteeData, useCommittee } from '@modules/Committee/hooks';
import committee from '@modules/Committee/services';
import {
   Button,
   buttonClass,
   Card,
   ConfirmDialog,
   Loading,
   NoData,
   Notice,
   PageBody,
   PageHeader,
   Tabs,
} from '@shared/components';
import { directorId } from '@shared/constants';
import { useCurrentUser, useRequest } from '@shared/hooks';
import type { AgendaItem, Meeting } from '@shared/types/committee.types';
import dayjs from 'dayjs';
import {
   LayoutPanelLeft,
   type LucideIcon,
   Rocket,
   ScrollText,
   Users,
   Vote,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import Agenda from './components/Agenda';
import MeetingHeader from './components/MeetingHeader';
import Overview from './components/Overview';
import Participants from './components/Participants';
import Protocol from './components/Protocol';
import SignDialog from './components/SignDialog';
import SponsorDialog from './components/SponsorDialog';
import Voting from './components/Voting';

const TAB_ICONS: Record<MeetingTab, LucideIcon> = {
   overview: LayoutPanelLeft,
   agenda: Rocket,
   members: Users,
   voting: Vote,
   protocol: ScrollText,
};

// The open tab from the address; the tabs' old names lead to their new ones.
const toTab = (value: string | null): MeetingTab =>
   MEETING_TABS.find((tab) => tab === value) ??
   (value ? OLD_MEETING_TABS[value] : undefined) ??
   'overview';

/* A meeting of the committee or the board, as the design draws it: its head,
   then «Обзор», the questions, the members, the voting and the protocol.
   While it is open the secretary records the votes and writes the protocol;
   the fund's rules turn the votes into a result, and the meeting closes with
   the protocol, whose decisions go to the register and the deals' cards. */
const MeetingPage = () => {
   const { t } = useTranslation('committee');
   const { id } = useParams();
   const data = useCommittee();
   const meeting = data?.meetings.find((item) => item.id === id);

   if (!data || !meeting)
      return (
         <>
            <PageHeader
               section={<Link to={COMMITTEE_PATH}>{t('Инвесткомитет')}</Link>}
               title={data ? t('Заседание не найдено') : t('Заседание')}
            />
            {data ? (
               <PageBody className='flex flex-col'>
                  <Card className='grid flex-1 place-items-center'>
                     <NoData>
                        <Link
                           className='link'
                           data-hint={t('Вернуться к списку заседаний')}
                           to={COMMITTEE_PATH}
                        >
                           {t('К заседаниям')}
                        </Link>
                     </NoData>
                  </Card>
               </PageBody>
            ) : (
               <Loading />
            )}
         </>
      );

   return <MeetingView key={meeting.id} data={data} meeting={meeting} />;
};

interface MeetingViewProps {
   data: CommitteeData;
   meeting: Meeting;
}

const MeetingView = ({ data, meeting }: MeetingViewProps) => {
   const { t } = useTranslation('committee');
   const user = useCurrentUser();
   const navigate = useNavigate();
   const [params, setParams] = useSearchParams();
   const tab = toTab(params.get('tab'));
   const [sponsorItem, setSponsorItem] = useState<AgendaItem | null>(null);
   const [signing, setSigning] = useState(false);
   // the meeting's day and format being changed; the meeting asked to be deleted
   const [changing, setChanging] = useState(false);
   const [removing, setRemoving] = useState(false);
   // the protocol asked for print from another tab: printed once it shows
   const [printing, setPrinting] = useState(false);
   const starting = useRequest({ success: t('Заседание открыто') });
   const pausing = useRequest({
      success:
         meeting.status === 'break'
            ? t('Заседание продолжено')
            : t('Объявлен перерыв'),
   });
   const forming = useRequest({ success: t('Протокол сформирован') });
   const planned = meeting.status === 'planned';
   const live = meeting.status === 'live';
   const held = meeting.status === 'held';
   const canRecord =
      user.id === meeting.secretaryId || user.role === 'director';
   const allDecided = meeting.agenda.every(isDecided);
   const prepared = preparationOf(meeting, data.members).ready;
   const title = meetingTitle(t, meeting);
   const participants = participantsOf(meeting, data.members);

   const setTab = (next: MeetingTab) =>
      setParams(next === 'overview' ? {} : { tab: next }, { replace: true });

   useEffect(() => {
      if (!printing || tab !== 'protocol') return;
      setPrinting(false);
      window.print();
   }, [printing, tab]);

   const actions = (() => {
      // the members sign the printed protocol; the secretary marks it here
      if (held)
         return (
            <>
               <Button
                  hint={t('Открыть печать: протокол можно сохранить в PDF')}
                  variant='ghost'
                  onClick={() => {
                     setTab('protocol');
                     setPrinting(true);
                  }}
               >
                  {t('Скачать протокол')}
               </Button>
               {meeting.protocol === 'signing' && canRecord && (
                  <Button
                     hint={t('Указать ссылку на подписанный протокол')}
                     onClick={() => setSigning(true)}
                  >
                     {t('Отметить протокол подписанным')}
                  </Button>
               )}
               {meeting.protocol === 'signed' && meeting.protocolFile && (
                  <a
                     className={buttonClass('ghost')}
                     data-hint={t(
                        'Открыть файл подписанного протокола в новой вкладке',
                     )}
                     href={meeting.protocolFile}
                     rel='noreferrer'
                     target='_blank'
                  >
                     {t('Открыть подписанный протокол')}
                  </a>
               )}
            </>
         );
      if (planned)
         return (
            <Button
               disabled={!canRecord || !prepared}
               hint={
                  !prepared
                     ? t('Откроется, когда подготовка к заседанию закончена')
                     : canRecord
                       ? t(
                            'Начать заседание: откроется голосование по повестке',
                         )
                       : t('Открыть заседание может его секретарь или директор')
               }
               loading={starting.pending}
               onClick={() =>
                  starting.run(() => committee.startMeeting(meeting.id))
               }
            >
               {t('Открыть заседание')}
            </Button>
         );
      return (
         <>
            <Button
               disabled={!canRecord || forming.pending}
               hint={
                  meeting.status === 'break'
                     ? t('Продолжить заседание после перерыва')
                     : t('Поставить заседание на перерыв')
               }
               loading={pausing.pending}
               variant='ghost'
               onClick={() =>
                  pausing.run(() => committee.toggleBreak(meeting.id))
               }
            >
               {meeting.status === 'break'
                  ? t('Продолжить заседание')
                  : t('Перерыв')}
            </Button>
            <Button
               disabled={!canRecord || !allDecided || !live || pausing.pending}
               hint={
                  allDecided
                     ? t(
                          'Закончить заседание и собрать протокол из повестки и голосов',
                       )
                     : t('Сначала примите решение по каждому вопросу повестки')
               }
               loading={forming.pending}
               onClick={() =>
                  forming.run(() => committee.formProtocol(meeting.id, user.id))
               }
            >
               {t('Сформировать протокол')}
            </Button>
         </>
      );
   })();

   const counts: Partial<Record<MeetingTab, number>> = {
      agenda: meeting.agenda.length,
      members: planned
         ? participants.length
         : attendedMembers(meeting, data.members).length,
   };

   return (
      <>
         <PageHeader
            bare
            section={<Link to={COMMITTEE_PATH}>{t('Инвесткомитет')}</Link>}
            title={title}
         />
         <PageBody className='flex flex-col pt-5'>
            <MeetingHeader
               actions={actions}
               editable={planned && canRecord}
               meeting={meeting}
               removable={
                  canRecord &&
                  !data.decisions.some(
                     ({ meetingId }) => meetingId === meeting.id,
                  )
               }
               onDelete={() => setRemoving(true)}
               onEdit={() => setChanging(true)}
            />
            {(live || meeting.status === 'break') && !allDecided && (
               <Notice className='print-hidden mb-4'>
                  {t(
                     'Протокол формируется, когда по всем вопросам есть решение',
                  )}
               </Notice>
            )}
            <div className='border-line print-hidden mb-4.5 border-b'>
               <Tabs
                  active={tab}
                  items={MEETING_TABS.map((id) => ({
                     id,
                     label: t(MEETING_TAB_LABELS[id]),
                     icon: TAB_ICONS[id],
                     count: counts[id],
                  }))}
                  label={title}
                  onChange={setTab}
               />
            </div>
            {tab === 'overview' && (
               <Overview
                  data={data}
                  editable={canRecord}
                  meeting={meeting}
                  onTab={setTab}
               />
            )}
            {tab === 'agenda' && (
               <Agenda data={data} editable={canRecord} meeting={meeting} />
            )}
            {tab === 'members' && (
               <Participants
                  data={data}
                  editable={canRecord}
                  meeting={meeting}
               />
            )}
            {tab === 'voting' && (
               <Voting
                  data={data}
                  editable={canRecord}
                  meeting={meeting}
                  onSponsor={setSponsorItem}
               />
            )}
            {tab === 'protocol' && (
               <Protocol data={data} editable={canRecord} meeting={meeting} />
            )}
         </PageBody>
         <SignDialog
            meeting={meeting}
            open={signing}
            onClose={() => setSigning(false)}
         />
         <MeetingDialog
            meeting={meeting}
            open={changing}
            onClose={() => setChanging(false)}
         />
         <ConfirmDialog
            open={removing}
            subtitle={`${title} · ${dayjs(meeting.date).format('D MMMM YYYY')}`}
            success={t('Заседание удалено')}
            title={t('Удалить заседание?')}
            onClose={() => setRemoving(false)}
            onConfirm={async () => {
               await committee.deleteMeeting(meeting.id);
               navigate(COMMITTEE_PATH);
            }}
         >
            <p>
               {t(
                  'Заседание удалится вместе с повесткой и списком участников; сделки с повестки снова будут ждать заседания.',
               )}
            </p>
         </ConfirmDialog>
         <SponsorDialog
            item={sponsorItem}
            meetingId={meeting.id}
            sponsorId={
               data.deals.find(({ id }) => id === sponsorItem?.dealId)?.memo
                  ?.sponsorId || directorId()
            }
            onClose={() => setSponsorItem(null)}
         />
      </>
   );
};

export default MeetingPage;

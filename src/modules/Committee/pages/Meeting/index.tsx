import { stageName } from '@modules/Settings/services';
import {
   ATTENDANCE,
   ATTENDANCE_ORDER,
   COMMITTEE_PATH,
   IC_RULES,
   MEMBER_ROLE_LABELS,
   OUTCOMES,
   PROTOCOL_FIELDS,
   VOTES,
} from '@modules/Committee/constants';
import {
   approvedAt,
   hasQuorum,
   isDecided,
   participantsOf,
   materialsReady,
   meetingName,
   preparationOf,
   tallyVotes,
   type VoteTally,
} from '@modules/Committee/helpers';
import { type CommitteeData, useCommittee } from '@modules/Committee/hooks';
import { RECOMMENDATION_NAMES } from '@modules/Deals/constants';
import { industryText, proposalText } from '@modules/Deals/helpers';
import committee from '@modules/Committee/services';
import {
   Avatar,
   Badge,
   BadgeSelect,
   Button,
   buttonClass,
   Card,
   CheckList,
   ConfirmDialog,
   FactList,
   Loading,
   NoData,
   PageBody,
   PageHeader,
   Spinner,
   STACK,
   Tabs,
   type BadgeTone,
} from '@shared/components';
import { directorId, ROLE_LABELS, TEAM } from '@shared/constants';
import { formatDate, formatUsd, personName } from '@shared/helpers';
import { useAction, useCurrentUser, useRequest } from '@shared/hooks';
import type {
   AgendaItem,
   Attendance,
   Meeting,
   VoteChoice,
} from '@shared/types/committee.types';
import type { CheckItem, Deal } from '@shared/types/deals.types';
import clsx from 'clsx';
import dayjs from 'dayjs';
import type { TFunction } from 'i18next';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import Decisions from '@modules/Committee/components/Decisions';
import MeetingDialog from '@modules/Committee/components/MeetingDialog';
import AgendaDialog from './components/AgendaDialog';
import Participants from './components/Participants';
import SignDialog from './components/SignDialog';
import SponsorDialog from './components/SponsorDialog';
import VoteSelect from './components/VoteSelect';

// The meeting page's tabs; the address keeps the open one (?tab=participants).
const MEETING_TABS = ['agenda', 'participants', 'decisions'] as const;
const MEETING_TAB_LABELS = {
   agenda: 'Повестка',
   participants: 'Участники',
   decisions: 'Решения',
} as const;

const BOX_TONES: Record<BadgeTone, string> = {
   accent: 'bg-accent-tint',
   success: 'bg-success-tint',
   warning: 'bg-warning-tint',
   danger: 'bg-danger-tint',
   neutral: 'bg-ground',
};

const TITLE_TONES: Record<BadgeTone, string> = {
   accent: 'text-accent',
   success: 'text-success-ink',
   warning: 'text-warning-ink',
   danger: 'text-danger',
   neutral: 'text-ink',
};

/* A meeting of the committee or the board. While it is open the secretary
   records the votes and drafts the protocol; the fund's rules turn the votes
   into a result, and the meeting closes with the protocol. */
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
                        <Link className='link' to={COMMITTEE_PATH}>
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
   const firstOpen =
      meeting.agenda.find((item) => !isDecided(item)) ?? meeting.agenda[0];
   const [selectedId, setSelectedId] = useState(firstOpen?.id ?? '');
   const [sponsorItem, setSponsorItem] = useState<AgendaItem | null>(null);
   const [addingDeals, setAddingDeals] = useState(false);
   const [signing, setSigning] = useState(false);
   const starting = useRequest({ success: t('Заседание открыто') });
   const pausing = useRequest({
      success:
         meeting.status === 'break'
            ? t('Заседание продолжено')
            : t('Объявлен перерыв'),
   });
   const forming = useRequest({ success: t('Протокол сформирован') });
   const selected =
      meeting.agenda.find((item) => item.id === selectedId) ??
      meeting.agenda[0];
   const planned = meeting.status === 'planned';
   const live = meeting.status === 'live';
   const held = meeting.status === 'held';
   const canRecord =
      user.id === meeting.secretaryId || user.role === 'director';
   const participants = participantsOf(meeting, data.members);
   const decisions = data.decisions.filter(
      ({ meetingId }) => meetingId === meeting.id,
   ).length;
   const [params, setParams] = useSearchParams();
   const tab = MEETING_TABS.find((id) => id === params.get('tab')) ?? 'agenda';
   const navigate = useNavigate();
   // the meeting's day and format being changed; the meeting asked to be deleted
   const [changing, setChanging] = useState(false);
   const [removing, setRemoving] = useState(false);
   const present = participants.filter(
      ({ id }) => meeting.attendance[id] === 'confirmed',
   ).length;
   const chair = data.members.find(({ id }) => id === meeting.chairId);
   const allDecided = meeting.agenda.every(isDecided);
   const prepared = preparationOf(meeting, data.members).ready;
   const name = meetingName(t, meeting);
   const date = dayjs(meeting.date).format('D MMMM YYYY');

   const badge: { label: string; tone: BadgeTone } = {
      planned: {
         label: t('Запланировано · {{time}}', { time: meeting.time }),
         tone: 'accent' as const,
      },
      live: {
         label: t('Идёт заседание · с {{time}}', {
            time: meeting.startedAt ?? '',
         }),
         tone: 'accent' as const,
      },
      break: {
         label: t('Перерыв · с {{time}}', { time: meeting.breakAt ?? '' }),
         tone: 'warning' as const,
      },
      held: {
         label:
            meeting.protocol === 'signed'
               ? t('Проведено · протокол подписан')
               : t('Проведено · протокол на подписи'),
         tone: 'success' as const,
      },
   }[meeting.status];

   const meta = [
      held
         ? t('Решения — в реестре решений и в карточках сделок')
         : meeting.status === 'planned'
           ? t('Подтвердили участие {{present}} из {{total}}', {
                present,
                total: participants.length,
             })
           : hasQuorum(present)
             ? t('Кворум есть: {{present}} из {{total}} членов', {
                  present,
                  total: participants.length,
               })
             : t('Кворума нет: {{present}} из {{total}} членов', {
                  present,
                  total: participants.length,
               }),
      chair && t('председатель {{name}}', { name: chair.name }),
      t('протокол ведёт секретарь'),
   ]
      .filter(Boolean)
      .join(' · ');

   const actions = (() => {
      // the members sign the printed protocol; the secretary marks it here
      if (held)
         return (
            <>
               <Button variant='ghost' onClick={() => window.print()}>
                  {t('Скачать протокол')}
               </Button>
               {meeting.protocol === 'signing' && canRecord && (
                  <Button onClick={() => setSigning(true)}>
                     {t('Отметить протокол подписанным')}
                  </Button>
               )}
               {meeting.protocol === 'signed' && meeting.protocolFile && (
                  <a
                     className={buttonClass('ghost')}
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
            <>
               {canRecord && (
                  <>
                     <Button variant='ghost' onClick={() => setChanging(true)}>
                        {t('Изменить')}
                     </Button>
                     <Button variant='ghost' onClick={() => setRemoving(true)}>
                        {t('Удалить')}
                     </Button>
                  </>
               )}
               <Button
                  disabled={!canRecord || !prepared}
                  title={
                     prepared
                        ? undefined
                        : t('Откроется, когда подготовка к заседанию закончена')
                  }
                  loading={starting.pending}
                  onClick={() =>
                     starting.run(() => committee.startMeeting(meeting.id))
                  }
               >
                  {t('Открыть заседание')}
               </Button>
            </>
         );
      return (
         <>
            <Button
               disabled={!canRecord || forming.pending}
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
               loading={forming.pending}
               title={
                  allDecided
                     ? undefined
                     : t(
                          'Протокол формируется, когда по всем вопросам есть решение',
                       )
               }
               onClick={() =>
                  forming.run(() => committee.formProtocol(meeting.id, user.id))
               }
            >
               {t('Сформировать протокол')}
            </Button>
         </>
      );
   })();

   const section = (
      <>
         <Link className='hover:underline' to={COMMITTEE_PATH}>
            {t('Инвесткомитет')}
         </Link>
         {' · '}
         <Link className='hover:underline' to={COMMITTEE_PATH}>
            {meeting.body === 'board'
               ? t('Наблюдательный совет')
               : t('Заседания')}
         </Link>
      </>
   );

   return (
      <>
         <PageHeader
            actions={actions}
            badge={<Badge tone={badge.tone}>{badge.label}</Badge>}
            meta={meta}
            section={section}
            title={`${name} · ${date}`}
         >
            <Tabs
               active={tab}
               items={MEETING_TABS.map((id) => ({
                  id,
                  label: t(MEETING_TAB_LABELS[id]),
                  count:
                     id === 'participants'
                        ? participants.length
                        : id === 'decisions'
                          ? decisions || undefined
                          : undefined,
               }))}
               label={name}
               onChange={(next) =>
                  setParams(next === 'agenda' ? {} : { tab: next }, {
                     replace: true,
                  })
               }
            />
         </PageHeader>
         {tab === 'participants' && (
            <PageBody className='flex flex-col'>
               <Participants
                  data={data}
                  editable={canRecord}
                  meeting={meeting}
               />
            </PageBody>
         )}
         {tab === 'decisions' && (
            <PageBody className='flex flex-col'>
               <Decisions data={data} meetingId={meeting.id} />
            </PageBody>
         )}
         {tab === 'agenda' && (
            <PageBody className='gap-section grid xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.85fr)_minmax(0,1.05fr)]'>
               <Card className='p-3'>
                  <h2 className='text-ink-soft px-2 py-1.5 text-xs'>
                     {t('Повестка')}
                  </h2>
                  <ol className='mt-1 flex flex-col gap-1'>
                     {meeting.agenda.map((item, index) => {
                        const active = item.id === selected?.id;
                        return (
                           <li key={item.id}>
                              <button
                                 type='button'
                                 aria-current={active || undefined}
                                 className={clsx(
                                    'flex w-full gap-3 rounded-md px-2 py-2 text-left',
                                    active
                                       ? 'bg-accent-tint'
                                       : 'hover:bg-ground',
                                 )}
                                 onClick={() => setSelectedId(item.id)}
                              >
                                 <span
                                    className={clsx(
                                       'w-3 shrink-0 tabular-nums',
                                       active ? 'text-accent' : 'text-ink-soft',
                                    )}
                                 >
                                    {index + 1}
                                 </span>
                                 <span className='min-w-0'>
                                    <span
                                       className={clsx(
                                          'block font-semibold',
                                          active && 'text-accent',
                                       )}
                                    >
                                       {item.title}
                                    </span>
                                    <span className='text-ink-soft mt-0.5 block text-xs'>
                                       {itemState(
                                          t,
                                          item,
                                          item.id === firstOpen?.id && live,
                                       )}
                                    </span>
                                 </span>
                              </button>
                           </li>
                        );
                     })}
                  </ol>
                  {meeting.agenda.length === 0 && (
                     <p className='text-ink-soft px-2 py-1.5'>
                        {t('Повестка пуста')}
                     </p>
                  )}
                  {planned && canRecord && (
                     <button
                        type='button'
                        className='link mt-1 px-2 py-1.5'
                        onClick={() => setAddingDeals(true)}
                     >
                        {t('Добавить сделку')}
                     </button>
                  )}
               </Card>

               <div className={STACK}>
                  {planned && (
                     <Preparation
                        data={data}
                        editable={canRecord}
                        meeting={meeting}
                        onAddDeals={() => setAddingDeals(true)}
                     />
                  )}
                  {!planned && meeting.agenda.length === 0 && (
                     <Card className='grid min-h-48 place-items-center'>
                        <NoData>
                           {t(
                              'На этом заседании не было вопросов — решений по нему нет.',
                           )}
                        </NoData>
                     </Card>
                  )}
                  {selected && (
                     <ItemCard
                        canRemove={!held && canRecord}
                        data={data}
                        editable={live && canRecord}
                        index={meeting.agenda.indexOf(selected) + 1}
                        item={selected}
                        meeting={meeting}
                        onSponsor={setSponsorItem}
                     />
                  )}
               </div>

               {selected && (
                  <ProtocolCard
                     editable={!held && canRecord}
                     item={selected}
                     meeting={meeting}
                  />
               )}
            </PageBody>
         )}
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
            subtitle={`${name} · ${date}`}
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
         <AgendaDialog
            data={data}
            meeting={meeting}
            open={addingDeals}
            onClose={() => setAddingDeals(false)}
         />
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

// "ИК-2 · голосование", "ИК-2 · ожидает", "ИК-2 · одобрено", "информация"
const itemState = (
   t: TFunction<'committee'>,
   item: AgendaItem,
   voting: boolean,
) => {
   if (item.kind === 'info')
      return item.outcome
         ? t(OUTCOMES.noted.label).toLowerCase()
         : t('информация');
   const state = item.outcome
      ? t(OUTCOMES[item.outcome].label).toLowerCase()
      : voting
        ? t('голосование')
        : t('ожидает');
   return [item.stage && stageName(item.stage), state]
      .filter(Boolean)
      .join(' · ');
};

interface PreparationProps {
   data: CommitteeData;
   meeting: Meeting;
   editable: boolean; // the secretary or the director
   onAddDeals: () => void;
}

/* What a planned meeting needs before it opens, each step with where it is
   done: deals on the agenda, enough members for a quorum, who of them will
   come, and the materials sent out. «Открыть заседание» turns on once the
   first three are met; the materials are a reminder of the fund's rule. */
const Preparation = ({
   data,
   meeting,
   editable,
   onAddDeals,
}: PreparationProps) => {
   const { t } = useTranslation('committee');
   const sending = useRequest({
      kind: 'send',
      success: t('Материалы разосланы'),
   });
   const marking = useAction(
      (memberId: string, value: Attendance) =>
         committee.setAttendance(meeting.id, memberId, value),
      { success: t('Участие отмечено') },
   );
   // the member whose answer is being saved
   const [markingId, setMarkingId] = useState('');
   const prep = preparationOf(meeting, data.members);
   const quorum = IC_RULES.quorum;
   const items: CheckItem[] = [
      {
         id: 'agenda',
         text: t('Внести сделки в повестку'),
         note: prep.questions
            ? t('В повестке: {{titles}}', {
                 titles:
                    meeting.summary ||
                    meeting.agenda.map(({ title }) => title).join(', '),
              })
            : t('Повестка пуста'),
         state: prep.questions ? 'done' : 'blocking',
      },
      {
         id: 'members',
         text: t('Участники — не меньше {{quorum}}', { quorum }),
         note: t('Приглашено {{members}}, нужно не меньше {{quorum}}', {
            members: prep.members,
            quorum,
         }),
         state: prep.members >= quorum ? 'done' : 'blocking',
      },
      {
         id: 'attendance',
         text: t('Отметить, кто из них будет'),
         note: t('Подтвердили {{confirmed}}, для кворума нужно {{quorum}}', {
            confirmed: prep.confirmed,
            quorum,
         }),
         state: hasQuorum(prep.confirmed) ? 'done' : 'blocking',
      },
      {
         id: 'materials',
         text: t('Разослать материалы членам ИК'),
         note: meeting.materialsSentAt
            ? t('материалы разосланы {{date}}', {
                 date: formatDate(meeting.materialsSentAt),
              })
            : t('до {{date}}', { date: formatDate(meeting.materialsDue) }),
         state: meeting.materialsSentAt ? 'done' : 'attention',
      },
   ];
   const done = items.filter(({ state }) => state === 'done').length;
   const canSend = prep.questions > 0 && materialsReady(meeting, data.deals);

   const actions = {
      agenda: editable && (
         <button type='button' className='link' onClick={onAddDeals}>
            {t('Добавить сделку')}
         </button>
      ),
      members: prep.members < quorum && (
         <Link className='link' to='?tab=participants'>
            {t('Открыть «Участники»')}
         </Link>
      ),
      attendance: participantsOf(meeting, data.members).length > 0 && (
         <ul className='flex flex-col gap-1'>
            {participantsOf(meeting, data.members).map((member) => {
               const value = meeting.attendance[member.id] ?? 'no_answer';
               return (
                  <li key={member.id} className='flex items-center gap-3'>
                     <span className='min-w-0 flex-1'>
                        {member.name}
                        <span className='text-ink-soft ml-2 text-xs'>
                           {t(MEMBER_ROLE_LABELS[member.role])}
                        </span>
                     </span>
                     {editable ? (
                        <BadgeSelect<Attendance>
                           busy={markingId === member.id}
                           label={t('Участие: {{name}}', { name: member.name })}
                           options={ATTENDANCE_ORDER.map((option) => ({
                              value: option,
                              label: t(ATTENDANCE[option].label),
                              tone: ATTENDANCE[option].tone,
                           }))}
                           value={value}
                           onChange={async (next) => {
                              setMarkingId(member.id);
                              await marking.run(member.id, next);
                              setMarkingId('');
                           }}
                        />
                     ) : (
                        <Badge tone={ATTENDANCE[value].tone}>
                           {t(ATTENDANCE[value].label)}
                        </Badge>
                     )}
                  </li>
               );
            })}
         </ul>
      ),
      materials: editable && !meeting.materialsSentAt && (
         <button
            type='button'
            aria-busy={sending.pending || undefined}
            className='link disabled:text-ink-faint inline-flex items-center gap-1.5 disabled:no-underline'
            disabled={!canSend || sending.pending}
            title={
               canSend
                  ? undefined
                  : t(
                       'Разослать можно, когда у всех вопросов готовы все материалы',
                    )
            }
            onClick={() =>
               sending.run(() => committee.sendMaterials(meeting.id))
            }
         >
            {sending.pending && <Spinner className='size-3.5' />}
            {t('Разослать материалы')}
         </button>
      ),
   };

   return (
      <Card
         hint={t('выполнено {{done}} из {{total}}', {
            done,
            total: items.length,
         })}
         title={t('Подготовка к заседанию')}
      >
         <div className='px-5 py-4'>
            <CheckList actions={actions} items={items} />
            <p className='text-ink-soft border-line mt-4 border-t pt-3 text-xs'>
               {prep.ready
                  ? t(
                       'Всё готово: откройте заседание — секретарь запишет голоса, правила фонда дадут итог, протокол передаст решение в карточку сделки.',
                    )
                  : t(
                       'Кнопка «Открыть заседание» включится, когда первые три пункта выполнены.',
                    )}
            </p>
         </div>
      </Card>
   );
};

interface ItemCardProps {
   data: CommitteeData;
   meeting: Meeting;
   item: AgendaItem;
   index: number;
   editable: boolean;
   canRemove?: boolean; // the secretary may take the question off the agenda
   onSponsor: (item: AgendaItem) => void;
}

// Why a deal no longer waits for a question on a meeting not held yet: it was
// approved at that stage elsewhere, or has left the stage; '' when it waits.
const staleNote = (
   t: TFunction<'committee'>,
   meeting: Meeting,
   item: AgendaItem,
   deal: Deal | undefined,
) => {
   if (!deal || item.kind !== 'decision' || item.outcome) return '';
   if (meeting.status === 'held') return '';
   const stage =
      meeting.body === 'board' ? 'board' : (item.stage ?? meeting.stage);
   if (!stage) return '';
   const label =
      stage === 'board' ? t('Наблюдательный совет') : stageName(stage);
   if (approvedAt(deal, stage))
      return t(
         '{{stage}} уже одобрил эту сделку на другом заседании — вопрос можно убрать из повестки.',
         { stage: label },
      );
   if (deal.status !== 'active' || deal.stage !== stage)
      return t(
         'Сделка уже не на стадии «{{stage}}» — вопрос можно убрать из повестки.',
         { stage: label },
      );
   return '';
};

// The question: what the members are asked, then the vote and its result.
const ItemCard = ({
   data,
   meeting,
   item,
   index,
   editable,
   canRemove,
   onSponsor,
}: ItemCardProps) => {
   const { t, i18n } = useTranslation('committee');
   const { t: tDeals } = useTranslation('deals');
   const { t: tLayout } = useTranslation('layout');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const deal = data.deals.find(({ id }) => id === item.dealId);
   const stale = staleNote(t, meeting, item, deal);
   // the deal's owner presents it, also when assigned after it was scheduled
   const speakerId = item.speakerId || deal?.ownerId || '';
   const speakerRole = TEAM.find(({ id }) => id === speakerId)?.role;
   const memo = deal?.memo;
   const [removing, setRemoving] = useState(false);
   const noting = useRequest({ success: t('Принято к сведению') });
   // what the members are asked: the deal's terms, the sponsor's word and an
   // exception to the mandate; the company itself until the terms are written
   const facts = item.facts?.length
      ? item.facts
      : deal
        ? [
             {
                label: t('Предложение'),
                value: proposalText(tDeals, deal, language),
             },
             ...(deal.terms
                ? []
                : [
                     { label: t('Чем занимается'), value: deal.about },
                     { label: t('Отрасль'), value: industryText(deal) },
                  ]),
             {
                label: t('Рекомендация спонсора'),
                value: memo
                   ? [
                        RECOMMENDATION_NAMES[memo.recommendation],
                        personName(memo.sponsorId),
                     ]
                        .filter(Boolean)
                        .join(' · ')
                   : '',
             },
             {
                label: t('Исключение из мандата'),
                value: deal.terms?.warning ?? '',
             },
             {
                label: t('Докладчик'),
                value: speakerId
                   ? [
                        personName(speakerId),
                        speakerRole &&
                           tLayout(ROLE_LABELS[speakerRole]).toLowerCase(),
                     ]
                        .filter(Boolean)
                        .join(', ')
                   : t('не назначен'),
             },
          ].filter(({ value }) => value)
        : [];
   const memoVersion = item.memoVersion ?? memo?.version;
   const title =
      item.kind === 'info'
         ? t('{{index}}. {{title}} — информация', { index, title: item.title })
         : t('{{index}}. {{title}} — инвестиционное решение', {
              index,
              title: item.title,
           });
   const memoLink = item.dealId && memoVersion && (
      <Link className='link' to={`/deals/${item.dealId}?tab=memo`}>
         {t('Меморандум v{{version}}', { version: memoVersion })}
      </Link>
   );
   const dealLink = item.dealId && !memoVersion && (
      <Link className='link' to={`/deals/${item.dealId}`}>
         {t('Карточка сделки')}
      </Link>
   );

   return (
      <>
         {stale && (
            <div className='bg-warning-tint text-warning-ink text-meta flex flex-wrap items-center justify-between gap-3 rounded-lg px-5 py-3.5'>
               <span>{stale}</span>
               {canRemove && (
                  <Button variant='ghost' onClick={() => setRemoving(true)}>
                     {t('Убрать из повестки')}
                  </Button>
               )}
            </div>
         )}
         <Card action={memoLink || dealLink || undefined} title={title}>
            {facts.length ? (
               <FactList
                  className='px-5 py-1'
                  divided
                  labelWidth='minmax(8rem, 36%)'
                  rows={facts}
               />
            ) : (
               <p className='text-ink-soft px-5 py-4'>
                  {t('Материалы по этому вопросу не внесены.')}
               </p>
            )}
         </Card>
         {meeting.status === 'planned' ? null : item.kind === 'info' ? (
            <Card title={t('Информация')}>
               <div className='flex flex-wrap items-center justify-between gap-3 px-5 py-4'>
                  <p className='text-ink-soft'>
                     {t('Вопрос для информации: по нему не голосуют.')}
                  </p>
                  {item.outcome ? (
                     <Badge tone='neutral'>{t(OUTCOMES.noted.label)}</Badge>
                  ) : (
                     editable && (
                        <Button
                           loading={noting.pending}
                           variant='ghost'
                           onClick={() =>
                              noting.run(() =>
                                 committee.decide(meeting.id, item.id, 'noted'),
                              )
                           }
                        >
                           {t('Принять к сведению')}
                        </Button>
                     )
                  )}
               </div>
            </Card>
         ) : (
            <Voting
               data={data}
               editable={editable}
               item={item}
               meeting={meeting}
               onSponsor={onSponsor}
            />
         )}
         <ConfirmDialog
            confirmLabel={t('Убрать')}
            error={t('Не удалось убрать из повестки')}
            open={removing}
            subtitle={meetingName(t, meeting)}
            success={t('Убрано из повестки')}
            title={t('Убрать «{{title}}» из повестки?', { title: item.title })}
            onClose={() => setRemoving(false)}
            onConfirm={() => committee.removeFromAgenda(meeting.id, item.id)}
         >
            <p>
               {t(
                  'Вопрос уйдёт из повестки вместе с голосами по нему; сделка перестанет ждать это заседание.',
               )}
            </p>
         </ConfirmDialog>
      </>
   );
};

const Voting = ({
   data,
   meeting,
   item,
   editable,
   onSponsor,
}: Omit<ItemCardProps, 'index'>) => {
   const { t } = useTranslation('committee');
   const voting = useAction(
      (memberId: string, choice: VoteChoice | null) =>
         committee.setVote(meeting.id, item.id, memberId, choice),
      { success: t('Голос записан') },
   );
   // the member whose vote is being saved
   const [votingId, setVotingId] = useState('');
   const noting = useAction(
      (memberId: string, text: string) =>
         committee.setVoteNote(meeting.id, item.id, memberId, text),
      { success: t('Комментарий сохранён') },
   );
   const recorded = Object.values(item.votes).some(({ choice }) => choice);
   const tally = tallyVotes(meeting, data.members, item);

   if (meeting.status === 'held' && !recorded)
      return (
         <Card title={t('Голосование')}>
            <div className='flex flex-wrap items-center justify-between gap-3 px-5 py-4'>
               <p className='text-ink-soft'>
                  {t('Голоса этого заседания не записаны.')}
               </p>
               {item.outcome && (
                  <Badge tone={OUTCOMES[item.outcome].tone}>
                     {t(OUTCOMES[item.outcome].label)}
                  </Badge>
               )}
            </div>
         </Card>
      );

   return (
      <Card
         hint={t(
            '{{voted}} из {{present}} присутствующих проголосовали',
            tally,
         )}
         title={t('Голосование')}
      >
         <ul className='divide-line divide-y px-5'>
            {participantsOf(meeting, data.members).map((member) => {
               const vote = item.votes[member.id] ?? { choice: null, note: '' };
               const role = t(MEMBER_ROLE_LABELS[member.role]);
               const note =
                  vote.note ||
                  (vote.choice === 'absent'
                     ? t('Не учитывается в кворуме')
                     : '');
               const changeable = editable && item.outcome === null;
               return (
                  <li key={member.id} className='flex items-start gap-3 py-3'>
                     <Avatar name={member.name} />
                     <div className='min-w-0 flex-1'>
                        <div className='font-medium'>
                           {member.name} · {role}
                        </div>
                        {changeable && vote.choice !== 'absent' ? (
                           <input
                              key={vote.note}
                              aria-label={t('Комментарий к голосу: {{name}}', {
                                 name: member.name,
                              })}
                              className='text-ink-soft hover:placeholder:text-ink-faint focus:placeholder:text-ink-faint mt-0.5 w-full rounded bg-transparent text-xs placeholder:text-transparent'
                              defaultValue={vote.note}
                              placeholder={t('Комментарий к голосу')}
                              onBlur={(event) => {
                                 const text = event.target.value.trim();
                                 if (text !== vote.note)
                                    noting.run(member.id, text);
                              }}
                           />
                        ) : (
                           note && (
                              <div className='text-ink-soft mt-0.5 text-xs'>
                                 {note}
                              </div>
                           )
                        )}
                     </div>
                     {changeable ? (
                        <VoteSelect
                           busy={votingId === member.id}
                           label={t('Голос: {{name}}', { name: member.name })}
                           value={vote.choice}
                           onChange={async (choice) => {
                              setVotingId(member.id);
                              await voting.run(member.id, choice);
                              setVotingId('');
                           }}
                        />
                     ) : vote.choice ? (
                        <Badge tone={VOTES[vote.choice].tone}>
                           {t(VOTES[vote.choice].label)}
                        </Badge>
                     ) : (
                        <Badge tone='neutral'>{t('Не голосовал')}</Badge>
                     )}
                  </li>
               );
            })}
         </ul>
         <ResultBox
            editable={editable}
            item={item}
            meeting={meeting}
            tally={tally}
            onSponsor={onSponsor}
         />
      </Card>
   );
};

interface ResultBoxProps {
   meeting: Meeting;
   item: AgendaItem;
   tally: VoteTally;
   editable: boolean;
   onSponsor: (item: AgendaItem) => void;
}

// What the fund's rules make of the votes, and the buttons that record it.
const ResultBox = ({
   meeting,
   item,
   tally,
   editable,
   onSponsor,
}: ResultBoxProps) => {
   const { t } = useTranslation('committee');
   const deciding = useAction(
      (outcome: AgendaItem['outcome']) =>
         committee.decide(meeting.id, item.id, outcome),
      {
         success: (outcome) =>
            outcome === null
               ? t('Решение снято — можно зафиксировать другое')
               : outcome === 'postponed'
                 ? t('Вопрос отложен')
                 : t('Решение зафиксировано'),
      },
   );
   // the outcome being recorded, for the spinner of its button
   const [target, setTarget] = useState<AgendaItem['outcome'] | undefined>();
   const decide = async (outcome: AgendaItem['outcome']) => {
      setTarget(outcome);
      await deciding.run(outcome);
      setTarget(undefined);
   };
   // a button that records an outcome: off while another is being recorded
   const busy = (outcome: AgendaItem['outcome']) => ({
      disabled: deciding.pending,
      loading: deciding.pending && target === outcome,
   });
   const rule = t(
      'Правило «Чек-лист ИК»: один голос против — обсуждение, решение принимает спонсор. Два и более — отказ. Особое мнение любого члена — вето.',
   );
   const postpone = (
      <Button
         {...busy('postponed')}
         variant='ghost'
         onClick={() => decide('postponed')}
      >
         {t('Отложить вопрос')}
      </Button>
   );

   let tone: BadgeTone;
   let title: string;
   let text: string = rule;
   let buttons: ReactNode = postpone;

   if (item.outcome) {
      tone = OUTCOMES[item.outcome].tone;
      title = t('Решение зафиксировано: {{outcome}}', {
         outcome: t(OUTCOMES[item.outcome].label).toLowerCase(),
      });
      text = item.outcomeNote;
      buttons =
         meeting.status !== 'held' ? (
            <Button {...busy(null)} variant='text' onClick={() => decide(null)}>
               {t('Изменить решение')}
            </Button>
         ) : null;
   } else if (tally.state === 'no_quorum') {
      tone = 'danger';
      title = t('Кворума нет: присутствуют {{present}}, нужно {{quorum}}', {
         present: tally.present,
         quorum: IC_RULES.quorum,
      });
   } else if (tally.state === 'pending') {
      tone = 'neutral';
      title = t('Проголосовали {{voted}} из {{present}} присутствующих', tally);
   } else if (tally.state === 'approved') {
      tone = 'success';
      title = t('Итог по правилам фонда: {{for}} «за» — вопрос одобрен', tally);
      const approval = item.protocol.conditions.trim()
         ? 'approved_conditions'
         : 'approved';
      buttons = (
         <>
            <Button {...busy(approval)} onClick={() => decide(approval)}>
               {t('Зафиксировать одобрение')}
            </Button>
            {postpone}
         </>
      );
   } else if (tally.state === 'discussion') {
      tone = 'warning';
      title = t(
         'Итог по правилам фонда: {{for}} «за», {{against}} «против» — сделка уходит на доп. обсуждение',
         tally,
      );
      buttons = (
         <>
            <Button disabled={deciding.pending} onClick={() => onSponsor(item)}>
               {t('Зафиксировать решение спонсора')}
            </Button>
            {postpone}
         </>
      );
   } else {
      tone = 'danger';
      title =
         tally.state === 'veto'
            ? t(
                 'Итог по правилам фонда: особое мнение ({{names}}) — вето, вопрос не одобрен',
                 {
                    names: tally.dissent.join(', '),
                 },
              )
            : t('Итог по правилам фонда: {{against}} «против» — отказ', tally);
      buttons = (
         <>
            <Button {...busy('rejected')} onClick={() => decide('rejected')}>
               {t('Зафиксировать отказ')}
            </Button>
            {postpone}
         </>
      );
   }

   return (
      <div className={clsx('mx-5 mb-5 rounded-lg p-4', BOX_TONES[tone])}>
         <p className={clsx('font-semibold', TITLE_TONES[tone])}>{title}</p>
         {text && <p className='mt-1'>{text}</p>}
         {editable && buttons && (
            <div className='mt-3 flex flex-wrap gap-2.5'>{buttons}</div>
         )}
      </div>
   );
};

interface ProtocolCardProps {
   meeting: Meeting;
   item: AgendaItem;
   editable: boolean;
}

// The secretary's draft of the protocol for the open question.
const ProtocolCard = ({ meeting, item, editable }: ProtocolCardProps) => {
   const { t } = useTranslation('committee');
   const saving = useAction(
      (key: (typeof PROTOCOL_FIELDS)[number]['key'], value: string) =>
         committee.setProtocol(meeting.id, item.id, key, value),
      { success: t('Протокол сохранён') },
   );

   return (
      <Card
         hint={
            meeting.status !== 'held'
               ? t('черновик')
               : meeting.protocol === 'signed'
                 ? t('подписан')
                 : t('на подписи у членов ИК')
         }
         title={t('В протокол')}
      >
         <div className='flex flex-col gap-4 px-5 py-4'>
            {PROTOCOL_FIELDS.map(({ key, label }) => (
               <label
                  key={`${item.id}-${key}`}
                  className='flex flex-col gap-1.5'
               >
                  <span className='text-meta font-semibold'>{t(label)}</span>
                  {editable ? (
                     <textarea
                        className='field-input text-meta field-sizing-content min-h-16 resize-none'
                        defaultValue={item.protocol[key]}
                        onBlur={(event) => {
                           if (event.target.value !== item.protocol[key])
                              saving.run(key, event.target.value);
                        }}
                     />
                  ) : (
                     <span className='border-line text-meta rounded-lg border px-3 py-2'>
                        {item.protocol[key] || '—'}
                     </span>
                  )}
               </label>
            ))}
            <p className='text-ink-soft text-xs'>
               {t(
                  'После заседания протокол уходит на подпись членам ИК, решение — в реестр и в карточку сделки. Заявитель видит только статус.',
               )}
            </p>
         </div>
      </Card>
   );
};

export default MeetingPage;

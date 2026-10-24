import { stageName } from '@modules/Settings/services';
import {
   ATTENDANCE,
   ATTENDANCE_ORDER,
   COMMITTEE_PATH,
   MEMBER_ROLE_LABELS,
   RESULTS,
} from '@modules/Committee/constants';
import {
   formatName,
   isUpcoming,
   materialsOf,
   materialsReady,
   meetingName,
   participantsOf,
   preparationOf,
   taskDue,
   waitingDeals,
} from '@modules/Committee/helpers';
import type { CommitteeData } from '@modules/Committee/hooks';
import committee from '@modules/Committee/services';
import { instrumentText } from '@modules/Deals/helpers';
import {
   Avatar,
   Badge,
   BadgeSelect,
   Button,
   Card,
   NoData,
   Spinner,
   Table,
   TD,
   TH,
} from '@shared/components';
import {
   downloadCsv,
   formatDate,
   formatUsd,
   personName,
} from '@shared/helpers';
import { useAction, useCurrentUser, useRequest } from '@shared/hooks';
import type { Attendance, Meeting } from '@shared/types/committee.types';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

interface MeetingsProps {
   data: CommitteeData;
   onSchedule: () => void;
}

// The next meeting with its agenda and who confirmed, the register of the
// committee's meetings and the decisions still to be carried out.
const Meetings = ({ data, onSchedule }: MeetingsProps) => {
   const { t } = useTranslation('committee');
   const user = useCurrentUser();
   const navigate = useNavigate();
   const finishing = useAction(
      (taskId: string) => committee.setTaskDone(taskId, true, user.id),
      { success: t('Решение отмечено выполненным') },
   );
   // the task being marked, for its spinner
   const [finishingId, setFinishingId] = useState('');
   // the committee's and the board's meetings, newest first
   const allMeetings = [...data.meetings].sort((a, b) =>
      b.date.localeCompare(a.date),
   );
   const next = allMeetings.filter(isUpcoming).at(-1);
   const typeOf = (meeting: Meeting) =>
      meeting.body === 'board'
         ? t('НС')
         : meeting.stage
           ? stageName(meeting.stage)
           : '';
   const openTasks = data.tasks.filter(({ done }) => !done);

   const protocolLink = (meeting: Meeting) =>
      meeting.protocol === 'none' ? (
         <span className='text-ink-faint'>—</span>
      ) : (
         <Link
            className='link'
            to={`${COMMITTEE_PATH}/${meeting.id}`}
            onClick={(event) => event.stopPropagation()}
         >
            {meeting.protocol === 'signed' ? t('Подписан') : t('На подписи')}
         </Link>
      );

   const exportRegister = () =>
      downloadCsv('zasedaniya-ik.csv', [
         [t('Заседание'), t('Дата'), t('Тип'), t('Вопросы'), t('Решение')],
         ...allMeetings.map((meeting) => [
            meetingName(t, meeting),
            meeting.date,
            typeOf(meeting),
            meeting.summary,
            t(RESULTS[meeting.result].label),
         ]),
      ]);

   return (
      <>
         {next ? (
            <NextMeeting data={data} meeting={next} />
         ) : (
            <NoMeeting data={data} onSchedule={onSchedule} />
         )}

         <div className='mt-section gap-section grid flex-1 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]'>
            <Card
               action={
                  <button
                     type='button'
                     className='link'
                     onClick={exportRegister}
                  >
                     {t('Экспорт')}
                  </button>
               }
               title={t('Реестр заседаний')}
            >
               <Table
                  className='min-w-2xl'
                  head={
                     <>
                        <th className={TH}>{t('Заседание')}</th>
                        <th className={TH}>{t('Тип')}</th>
                        <th className={TH}>{t('Вопросы')}</th>
                        <th className={TH}>{t('Решение')}</th>
                        <th className={TH}>{t('Протокол')}</th>
                     </>
                  }
               >
                  {allMeetings.map((meeting) => (
                     <tr
                        key={meeting.id}
                        className='hover:bg-ground/60 cursor-pointer'
                        onClick={() =>
                           navigate(`${COMMITTEE_PATH}/${meeting.id}`)
                        }
                     >
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           <div className='text-sm font-semibold'>
                              {meetingName(t, meeting)}
                           </div>
                           <div className='text-ink-soft mt-0.5 text-xs'>
                              {formatDate(meeting.date)}
                           </div>
                        </td>
                        <td className={clsx(TD, 'text-ink-soft')}>
                           {typeOf(meeting) || '—'}
                        </td>
                        <td className={TD}>
                           {meeting.summary ||
                              meeting.agenda
                                 .map(({ title }) => title)
                                 .join(', ') || (
                                 <span className='text-ink-faint'>—</span>
                              )}
                        </td>
                        <td className={TD}>
                           <Badge tone={RESULTS[meeting.result].tone}>
                              {t(RESULTS[meeting.result].label)}
                           </Badge>
                        </td>
                        <td className={TD}>{protocolLink(meeting)}</td>
                     </tr>
                  ))}
               </Table>
            </Card>

            <Card
               className='flex flex-col'
               hint={t('{{count}} открытый', { count: openTasks.length })}
               title={t('Исполнение решений')}
            >
               {openTasks.length ? (
                  <ul className='divide-line divide-y px-5'>
                     {openTasks.map((task) => {
                        const due = taskDue(t, task);
                        return (
                           <li key={task.id} className='py-3.5'>
                              <div className='font-semibold'>{task.title}</div>
                              <div className='text-ink-soft mt-0.5 text-xs'>
                                 {[task.basis, personName(task.ownerId)]
                                    .filter(Boolean)
                                    .join(' · ')}
                              </div>
                              <div className='mt-2 flex items-center justify-between gap-3'>
                                 <Badge tone={due.tone}>{due.label}</Badge>
                                 <button
                                    type='button'
                                    aria-busy={
                                       finishingId === task.id || undefined
                                    }
                                    className='text-ink-soft hover:text-accent inline-flex items-center gap-1.5 text-xs disabled:opacity-50'
                                    disabled={finishing.pending}
                                    onClick={async () => {
                                       setFinishingId(task.id);
                                       await finishing.run(task.id);
                                       setFinishingId('');
                                    }}
                                 >
                                    {finishingId === task.id && (
                                       <Spinner className='size-3.5' />
                                    )}
                                    {t('Отметить выполненным')}
                                 </button>
                              </div>
                           </li>
                        );
                     })}
                  </ul>
               ) : (
                  <NoData>{t('Все решения исполнены')}</NoData>
               )}
            </Card>
         </div>
      </>
   );
};

// No meeting is planned: the deals waiting for one, and where to plan it.
const NoMeeting = ({ data, onSchedule }: MeetingsProps) => {
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
      <Card>
         <div className='flex flex-wrap items-center justify-between gap-4 px-5 py-4'>
            <div className='min-w-0'>
               <p className='font-semibold'>{t('Ближайших заседаний нет')}</p>
               {waiting.length ? (
                  <p className='text-meta mt-1'>
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
                  <p className='text-ink-soft text-meta mt-1'>
                     {t(
                        'Сделка попадает на заседание, когда доходит до стадии ИК-1, ИК-2 или «Набсовет».',
                     )}
                  </p>
               )}
            </div>
            <Button onClick={onSchedule}>{t('Назначить заседание')}</Button>
         </div>
      </Card>
   );
};

interface NextMeetingProps {
   data: CommitteeData;
   meeting: Meeting;
}

// The coming meeting: what it decides, whether the materials are ready and who
// confirmed. Materials go out once every question has all of them.
const NextMeeting = ({ data, meeting }: NextMeetingProps) => {
   const { t, i18n } = useTranslation('committee');
   const { t: tDeals } = useTranslation('deals');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const user = useCurrentUser();
   const navigate = useNavigate();
   const starting = useRequest({ success: t('Заседание открыто') });
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
   const dealOf = (dealId?: string) =>
      data.deals.find(({ id }) => id === dealId);
   const participants = participantsOf(meeting, data.members);
   const confirmed = participants.filter(
      ({ id }) => meeting.attendance[id] === 'confirmed',
   ).length;
   const materials = meeting.agenda.map((item) =>
      item.kind === 'decision'
         ? materialsOf(
              item,
              data.deals.find(({ id }) => id === item.dealId),
           )
         : null,
   );
   const ready = materialsReady(meeting, data.deals);
   const started = meeting.status !== 'planned';
   // a meeting that is not ready to open is prepared on its own page
   const prepared = preparationOf(meeting, data.members).ready;
   // the secretary marks who confirmed, until the meeting opens
   const canEdit =
      !started && (user.id === meeting.secretaryId || user.role === 'director');

   const open = async () => {
      if (
         !started &&
         prepared &&
         !(await starting.run(() => committee.startMeeting(meeting.id)))
      )
         return;
      navigate(`${COMMITTEE_PATH}/${meeting.id}`);
   };

   return (
      <section className='border-accent animate-rise overflow-hidden rounded-lg border bg-white'>
         <div className='bg-accent-tint/60 border-accent-faint flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b px-5 py-4'>
            <div className='min-w-0'>
               <p className='text-accent text-xs font-medium'>
                  {started ? t('Идёт заседание') : t('Ближайшее заседание')}
               </p>
               <h2 className='mt-1 text-xl leading-7 font-bold'>
                  {t('{{name}} · {{day}}, {{time}}', {
                     name: meetingName(t, meeting),
                     day: dayjs(meeting.date).format('dddd, D MMMM YYYY'),
                     time: meeting.time,
                  })}
               </h2>
               <p className='text-ink-soft text-meta mt-1'>
                  {[
                     formatName(t, meeting.format),
                     t('секретарь {{name}}', {
                        name: personName(meeting.secretaryId),
                     }),
                     meeting.materialsSentAt
                        ? t('материалы разосланы {{date}}', {
                             date: formatDate(meeting.materialsSentAt),
                          })
                        : t('материалы членам ИК — до {{date}}', {
                             date: formatDate(meeting.materialsDue),
                          }),
                  ].join(' · ')}
               </p>
            </div>
            <div className='flex flex-wrap gap-2.5'>
               {!meeting.materialsSentAt && (
                  <Button
                     disabled={!ready}
                     title={
                        ready
                           ? undefined
                           : t(
                                'Разослать можно, когда у всех вопросов готовы все материалы',
                             )
                     }
                     loading={sending.pending}
                     variant='ghost'
                     onClick={() =>
                        sending.run(() => committee.sendMaterials(meeting.id))
                     }
                  >
                     {t('Разослать материалы')}
                  </Button>
               )}
               <Button loading={starting.pending} onClick={open}>
                  {started
                     ? t('Перейти к заседанию')
                     : prepared
                       ? t('Открыть заседание')
                       : t('Подготовить заседание')}
               </Button>
            </div>
         </div>
         <div className='grid gap-x-10 gap-y-5 px-5 py-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]'>
            <div>
               <h3 className='text-ink-soft text-meta'>{t('Повестка')}</h3>
               <ol className='divide-line mt-1 divide-y'>
                  {meeting.agenda.map((item, index) => {
                     const value = materials[index];
                     const deal = dealOf(item.dealId);
                     // the deal's owner presents it, also when assigned later
                     const speaker = personName(
                        item.speakerId || deal?.ownerId || '',
                     );
                     const instrument =
                        item.instrument ||
                        (deal ? instrumentText(tDeals, deal) : '');
                     return (
                        <li
                           key={item.id}
                           className='flex items-center gap-4 py-3'
                        >
                           <span className='text-ink-soft w-3 shrink-0 tabular-nums'>
                              {index + 1}
                           </span>
                           <div className='min-w-0 flex-1'>
                              <div className='font-semibold'>
                                 {[
                                    item.title,
                                    item.stage && stageName(item.stage),
                                    item.amount &&
                                       [
                                          formatUsd(item.amount, language),
                                          instrument,
                                       ]
                                          .filter(Boolean)
                                          .join(' '),
                                 ]
                                    .filter(Boolean)
                                    .join(' · ')}
                              </div>
                              <div className='text-ink-soft mt-0.5 text-xs'>
                                 {t('Докладчик: {{name}}', {
                                    name: speaker || t('не назначен'),
                                 })}
                              </div>
                           </div>
                           {value ? (
                              <Badge
                                 tone={
                                    value.ready < value.total
                                       ? 'warning'
                                       : 'success'
                                 }
                              >
                                 {t('Материалы {{ready}} из {{total}}', value)}
                              </Badge>
                           ) : (
                              item.kind === 'info' && (
                                 <Badge tone='neutral'>{t('Информация')}</Badge>
                              )
                           )}
                        </li>
                     );
                  })}
               </ol>
               {meeting.agenda.length === 0 && (
                  <p className='text-ink-soft py-3'>{t('Повестка пуста')}</p>
               )}
            </div>
            <div>
               <h3 className='text-ink-soft text-meta'>
                  {t('Кворум: {{confirmed}} из {{total}} подтвердили участие', {
                     confirmed,
                     total: participants.length,
                  })}
               </h3>
               <ul className='mt-1'>
                  {participants.map((member) => {
                     const attendance =
                        ATTENDANCE[
                           meeting.attendance[member.id] ?? 'no_answer'
                        ];
                     return (
                        <li
                           key={member.id}
                           className='flex items-center gap-3 py-2'
                        >
                           <Avatar name={member.name} />
                           <div className='min-w-0 flex-1'>
                              <div className='font-medium'>{member.name}</div>
                              <div className='text-ink-soft text-xs'>
                                 {[
                                    t(MEMBER_ROLE_LABELS[member.role]),
                                    member.remote && t('по видео'),
                                 ]
                                    .filter(Boolean)
                                    .join(' · ')}
                              </div>
                           </div>
                           {canEdit ? (
                              <BadgeSelect<Attendance>
                                 busy={markingId === member.id}
                                 label={t('Участие: {{name}}', {
                                    name: member.name,
                                 })}
                                 options={ATTENDANCE_ORDER.map((value) => ({
                                    value,
                                    label: t(ATTENDANCE[value].label),
                                    tone: ATTENDANCE[value].tone,
                                 }))}
                                 value={
                                    meeting.attendance[member.id] ?? 'no_answer'
                                 }
                                 onChange={async (value) => {
                                    setMarkingId(member.id);
                                    await marking.run(member.id, value);
                                    setMarkingId('');
                                 }}
                              />
                           ) : (
                              <Badge tone={attendance.tone}>
                                 {t(attendance.label)}
                              </Badge>
                           )}
                        </li>
                     );
                  })}
               </ul>
               {participants.length === 0 && (
                  <p className='text-ink-soft py-2'>
                     {t('Участников пока нет.')}{' '}
                     <Link
                        className='link'
                        to={`${COMMITTEE_PATH}/${meeting.id}?tab=participants`}
                     >
                        {t('Добавить участников')}
                     </Link>
                  </p>
               )}
            </div>
         </div>
      </section>
   );
};

export default Meetings;

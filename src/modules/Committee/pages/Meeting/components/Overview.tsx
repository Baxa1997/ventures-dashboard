import { DEALS_PATH } from '@modules/Deals/constants';
import { stageName } from '@modules/Settings/services';
import {
   ATTENDANCE,
   ATTENDANCE_ORDER,
   IC_RULES,
   MEMBER_ROLE_LABELS,
   type MeetingTab,
   PROTOCOL_STATES,
} from '@modules/Committee/constants';
import {
   attendedMembers,
   formatName,
   hasQuorum,
   itemBadge,
   materialsOf,
   materialsReady,
   meetingType,
   participantsOf,
   preparationOf,
   speakerOf,
} from '@modules/Committee/helpers';
import type { CommitteeData } from '@modules/Committee/hooks';
import committee from '@modules/Committee/services';
import { relativeDay } from '@modules/Work/helpers';
import {
   Avatar,
   Badge,
   BadgeSelect,
   Card,
   CheckList,
   CompanyMark,
   FactList,
   NoData,
   Spinner,
} from '@shared/components';
import { SETTINGS_PATH } from '@shared/constants';
import { formatDate, formatUsd, personName } from '@shared/helpers';
import { useAction, useRequest } from '@shared/hooks';
import type { Attendance, Meeting } from '@shared/types/committee.types';
import type { CheckItem } from '@shared/types/deals.types';
import dayjs from 'dayjs';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface OverviewProps {
   data: CommitteeData;
   meeting: Meeting;
   editable: boolean; // the secretary or the director
   onTab: (tab: MeetingTab) => void;
}

const ROW = 'flex items-center gap-3 px-4.5 py-2.75';

/* «Обзор», as the design draws it: the agenda and who sits at the meeting on
   the left, the meeting's facts and the fund's rule on the right. A planned
   meeting shows first what it still needs before it opens. */
const Overview = ({ data, meeting, editable, onTab }: OverviewProps) => {
   const { t, i18n } = useTranslation('committee');
   const { t: tWork } = useTranslation('work');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const marking = useAction(
      (memberId: string, value: Attendance) =>
         committee.setAttendance(meeting.id, memberId, value),
      { success: t('Участие отмечено') },
   );
   // the member whose answer is being saved
   const [markingId, setMarkingId] = useState('');
   const planned = meeting.status === 'planned';
   const participants = participantsOf(meeting, data.members);
   const attended = attendedMembers(meeting, data.members);
   const confirmed = participants.filter(
      ({ id }) => meeting.attendance[id] === 'confirmed',
   ).length;
   const chair = data.members.find(({ id }) => id === meeting.chairId);

   const facts = [
      {
         label: t('Дата и время'),
         value: [
            dayjs(meeting.date).format('D MMMM YYYY'),
            meeting.time,
            planned && relativeDay(tWork, meeting.date),
         ]
            .filter(Boolean)
            .join(' · '),
      },
      { label: t('Формат'), value: formatName(t, meeting.format) },
      { label: t('Вопрос заседания'), value: meetingType(t, meeting) },
      {
         label: t('Кворум'),
         value: t('не менее {{quorum}} из {{total}}', {
            quorum: IC_RULES.quorum,
            total: participants.length,
         }),
      },
      planned
         ? {
              label: t('Подтвердили'),
              value: t('{{confirmed}} из {{total}}', {
                 confirmed,
                 total: participants.length,
              }),
           }
         : {
              label: t('Присутствуют'),
              value: t('{{confirmed}} из {{total}}', {
                 confirmed: attended.length,
                 total: participants.length,
              }),
           },
      { label: t('Председатель'), value: chair?.name ?? '—' },
      {
         label: t('Секретарь'),
         value: personName(meeting.secretaryId) || '—',
      },
      {
         label: t('Материалы'),
         value: meeting.materialsSentAt
            ? t('разосланы {{date}}', {
                 date: formatDate(meeting.materialsSentAt),
              })
            : t('до {{date}}', { date: formatDate(meeting.materialsDue) }),
      },
      {
         label: t('Протокол'),
         value:
            meeting.protocol === 'none' ? (
               t('после заседания')
            ) : meeting.protocol === 'signed' && meeting.protocolFile ? (
               <a
                  className='link'
                  data-hint={t(
                     'Открыть файл подписанного протокола в новой вкладке',
                  )}
                  href={meeting.protocolFile}
                  rel='noreferrer'
                  target='_blank'
               >
                  {t(PROTOCOL_STATES.signed.label)}
               </a>
            ) : (
               t(PROTOCOL_STATES[meeting.protocol].label)
            ),
      },
   ];

   return (
      <div className='gap-section grid flex-1 items-start xl:grid-cols-[minmax(0,1fr)_21.25rem]'>
         <div className='gap-section flex min-w-0 flex-col'>
            {planned && (
               <Preparation
                  data={data}
                  editable={editable}
                  meeting={meeting}
                  onTab={onTab}
               />
            )}
            <Card
               action={
                  planned &&
                  editable && (
                     <button
                        type='button'
                        className='link'
                        data-hint={t(
                           'Перейти на вкладку повестки и изменить её',
                        )}
                        onClick={() => onTab('agenda')}
                     >
                        {t('Изменить повестку')}
                     </button>
                  )
               }
               hint={meeting.agenda.length}
               title={t('Повестка')}
            >
               {meeting.agenda.length ? (
                  <ol className='divide-line divide-y'>
                     {meeting.agenda.map((item, index) => {
                        const deal = data.deals.find(
                           ({ id }) => id === item.dealId,
                        );
                        const badge = itemBadge(t, meeting, item);
                        const speaker = personName(speakerOf(item, deal));
                        const line = (
                           <>
                              <span className='text-ink-faint w-4 shrink-0 tabular-nums'>
                                 {index + 1}.
                              </span>
                              <CompanyMark name={item.title} />
                              <div className='min-w-0 flex-1'>
                                 <div className='font-semibold'>
                                    {item.kind === 'info'
                                       ? item.title
                                       : t('Об инвестировании в {{company}}', {
                                            company: item.title,
                                         })}
                                 </div>
                                 <div className='text-ink-soft text-xs'>
                                    {[
                                       item.stage && stageName(item.stage),
                                       (item.amount || deal?.amount) &&
                                          formatUsd(
                                             item.amount || deal?.amount || 0,
                                             language,
                                          ),
                                       speaker &&
                                          t('докладчик {{name}}', {
                                             name: speaker,
                                          }),
                                    ]
                                       .filter(Boolean)
                                       .join(' · ') ||
                                       t('Вопрос для информации')}
                                 </div>
                              </div>
                              <Badge tone={badge.tone}>{badge.label}</Badge>
                           </>
                        );
                        return (
                           <li key={item.id}>
                              {deal ? (
                                 <Link
                                    className={`${ROW} hover:bg-hover`}
                                    to={`/deals/${deal.id}?tab=decisions`}
                                 >
                                    {line}
                                 </Link>
                              ) : (
                                 <div className={ROW}>{line}</div>
                              )}
                           </li>
                        );
                     })}
                  </ol>
               ) : (
                  <NoData>
                     {t(
                        'В повестке нет вопросов. Добавьте их во вкладке «Участники (стартапы)».',
                     )}
                  </NoData>
               )}
            </Card>
            <Card
               action={
                  <button
                     type='button'
                     className='link'
                     data-hint={t('Перейти на вкладку с составом заседания')}
                     onClick={() => onTab('members')}
                  >
                     {t('Все участники')}
                  </button>
               }
               hint={participants.length}
               title={t('Состав заседания')}
            >
               {participants.length ? (
                  <ul className='divide-line divide-y'>
                     {participants.map((member) => {
                        const attendance =
                           meeting.attendance[member.id] ?? 'no_answer';
                        const present = attended.includes(member);
                        return (
                           <li key={member.id} className={ROW}>
                              <Avatar name={member.name} size='md' />
                              <div className='min-w-0 flex-1'>
                                 <div className='flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold'>
                                    {member.name}
                                    {member.id === meeting.chairId && (
                                       <Badge tone='indigo'>
                                          {t('Председатель')}
                                       </Badge>
                                    )}
                                 </div>
                                 <div className='text-ink-soft text-xs'>
                                    {[
                                       t(MEMBER_ROLE_LABELS[member.role]),
                                       member.remote && t('по видео'),
                                       member.contract,
                                    ]
                                       .filter(Boolean)
                                       .join(' · ')}
                                 </div>
                              </div>
                              {!planned ? (
                                 <Badge tone={present ? 'success' : 'neutral'}>
                                    {present
                                       ? t('Присутствовал')
                                       : t('Отсутствовал')}
                                 </Badge>
                              ) : editable ? (
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
                                    value={attendance}
                                    onChange={async (value) => {
                                       setMarkingId(member.id);
                                       await marking.run(member.id, value);
                                       setMarkingId('');
                                    }}
                                 />
                              ) : (
                                 <Badge tone={ATTENDANCE[attendance].tone}>
                                    {t(ATTENDANCE[attendance].label)}
                                 </Badge>
                              )}
                           </li>
                        );
                     })}
                  </ul>
               ) : (
                  <NoData>{t('Участников пока нет.')}</NoData>
               )}
            </Card>
         </div>
         <div className='gap-section flex min-w-0 flex-col'>
            <Card title={t('Заседание')}>
               <FactList
                  className='px-4.5 py-2'
                  labelWidth='7.5rem'
                  rows={facts}
               />
            </Card>
            <Card>
               <p className='text-ink-soft px-4.5 py-3.5 text-xs leading-relaxed'>
                  {t(
                     'Решение принимается при кворуме: один голос «против» — дополнительное обсуждение, решение принимает спонсор; два и более — отказ; особое мнение любого члена — вето. Сделки от $1M дополнительно одобряет Наблюдательный совет.',
                  )}{' '}
                  <Link
                     className='link'
                     data-hint={t(
                        'Открыть правила ИК: кворум, материалы, голоса',
                     )}
                     to={`${SETTINGS_PATH}/committee`}
                  >
                     {t('Положение об ИК')}
                  </Link>
               </p>
            </Card>
         </div>
      </div>
   );
};

interface PreparationProps {
   data: CommitteeData;
   meeting: Meeting;
   editable: boolean;
   onTab: (tab: MeetingTab) => void;
}

/* What a planned meeting needs before it opens, each step with where it is
   done: deals on the agenda, enough members for a quorum, who of them will
   come (in «Состав заседания» below), and the materials sent out.
   «Открыть заседание» turns on once the first three are met; the materials
   are a reminder of the fund's rule. */
const Preparation = ({ data, meeting, editable, onTab }: PreparationProps) => {
   const { t } = useTranslation('committee');
   const sending = useRequest({
      kind: 'send',
      success: t('Материалы разосланы'),
   });
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
   // the questions still short of materials, each leading to its deal's list
   const unready = meeting.agenda.flatMap((item) => {
      if (item.kind !== 'decision') return [];
      const value = materialsOf(
         item,
         data.deals.find(({ id }) => id === item.dealId),
      );
      return value && value.ready < value.total ? [{ item, value }] : [];
   });

   const actions = {
      agenda: editable && (
         <button
            type='button'
            className='link'
            data-hint={t('Перейти на вкладку повестки и добавить сделку')}
            onClick={() => onTab('agenda')}
         >
            {t('Добавить сделку')}
         </button>
      ),
      members: prep.members < quorum && (
         <button
            type='button'
            className='link'
            data-hint={t(
               'Перейти на вкладку состава и добрать участников до кворума',
            )}
            onClick={() => onTab('members')}
         >
            {t('Открыть «Участники ИК»')}
         </button>
      ),
      materials: editable && !meeting.materialsSentAt && (
         <span>
            <button
               type='button'
               aria-busy={sending.pending || undefined}
               className='link disabled:text-ink-faint inline-flex items-center gap-1.5 disabled:no-underline'
               data-hint={
                  canSend
                     ? t('Разослать участникам материалы заседания')
                     : t(
                          'Разослать можно, когда в повестке есть вопросы и их материалы готовы',
                       )
               }
               disabled={!canSend || sending.pending}
               onClick={() =>
                  sending.run(() => committee.sendMaterials(meeting.id))
               }
            >
               {sending.pending && <Spinner className='size-3.5' />}
               {t('Разослать материалы')}
            </button>
            {unready.length > 0 && (
               <span className='text-ink-soft mt-1 block text-xs'>
                  {t('Ещё не готово:')}{' '}
                  {unready.map(({ item, value }, index) => (
                     <Fragment key={item.id}>
                        {index > 0 && ', '}
                        <Link
                           className='link'
                           data-hint={t(
                              'Открыть сделку и подготовить её материалы',
                           )}
                           to={`${DEALS_PATH}/${item.dealId}`}
                        >
                           {item.title} · {value.ready} / {value.total}
                        </Link>
                     </Fragment>
                  ))}
               </span>
            )}
         </span>
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
         <div className='px-4.5 py-3.5'>
            <CheckList actions={actions} items={items} />
            <p className='text-ink-soft border-line mt-3.5 border-t pt-3 text-xs'>
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

export default Overview;

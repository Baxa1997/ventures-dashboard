import {
   COMMITTEE_PATH,
   IC_RULES,
   MEMBER_ROLE_LABELS,
   OUTCOMES,
   PROTOCOL_FIELDS,
   STAGE_LABELS,
   VOTES,
} from '@modules/Committee/constants';
import {
   hasQuorum,
   isDecided,
   meetingName,
   tallyVotes,
   type VoteTally,
} from '@modules/Committee/helpers';
import { type CommitteeData, useCommittee } from '@modules/Committee/hooks';
import committee from '@modules/Committee/services';
import {
   Avatar,
   Badge,
   Button,
   Card,
   FactList,
   Loading,
   NoData,
   PageBody,
   PageHeader,
   STACK,
   type BadgeTone,
} from '@shared/components';
import { DIRECTOR_ID } from '@shared/constants';
import { useCurrentUser } from '@shared/hooks';
import type { AgendaItem, Meeting } from '@shared/types/committee.types';
import clsx from 'clsx';
import dayjs from 'dayjs';
import type { TFunction } from 'i18next';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import SponsorDialog from './components/SponsorDialog';
import VoteSelect from './components/VoteSelect';

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
   const selected =
      meeting.agenda.find((item) => item.id === selectedId) ??
      meeting.agenda[0];
   const live = meeting.status === 'live';
   const held = meeting.status === 'held';
   const canRecord = user.id === meeting.secretaryId || user.id === DIRECTOR_ID;
   const present = data.members.filter(
      ({ id }) => meeting.attendance[id] === 'confirmed',
   ).length;
   const chair = data.members.find(({ id }) => id === meeting.chairId);
   const allDecided = meeting.agenda.every(isDecided);
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
                total: data.members.length,
             })
           : hasQuorum(present)
             ? t('Кворум есть: {{present}} из {{total}} членов', {
                  present,
                  total: data.members.length,
               })
             : t('Кворума нет: {{present}} из {{total}} членов', {
                  present,
                  total: data.members.length,
               }),
      chair && t('председатель {{name}}', { name: chair.name }),
      t('протокол ведёт секретарь'),
   ]
      .filter(Boolean)
      .join(' · ');

   const actions = (() => {
      if (held)
         return (
            <Button variant='ghost' onClick={() => window.print()}>
               {t('Скачать протокол')}
            </Button>
         );
      if (meeting.status === 'planned')
         return (
            <Button
               disabled={!canRecord}
               onClick={() => committee.startMeeting(meeting.id)}
            >
               {t('Открыть заседание')}
            </Button>
         );
      return (
         <>
            <Button
               disabled={!canRecord}
               variant='ghost'
               onClick={() => committee.toggleBreak(meeting.id)}
            >
               {meeting.status === 'break'
                  ? t('Продолжить заседание')
                  : t('Перерыв')}
            </Button>
            <Button
               disabled={!canRecord || !allDecided || !live}
               title={
                  allDecided
                     ? undefined
                     : t(
                          'Протокол формируется, когда по всем вопросам есть решение',
                       )
               }
               onClick={() =>
                  committee.formProtocol(meeting.id, {
                     date,
                     outcome: (outcome) => t(OUTCOMES[outcome].label),
                  })
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
         <Link
            className='hover:underline'
            to={
               meeting.body === 'board'
                  ? `${COMMITTEE_PATH}?tab=board`
                  : COMMITTEE_PATH
            }
         >
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
         />
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
                                 active ? 'bg-accent-tint' : 'hover:bg-ground',
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
            </Card>

            <div className={STACK}>
               {selected && (
                  <ItemCard
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
         <SponsorDialog
            item={sponsorItem}
            meetingId={meeting.id}
            sponsorId={
               data.deals.find(({ id }) => id === sponsorItem?.dealId)?.memo
                  ?.sponsorId ?? DIRECTOR_ID
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
   return [item.stage && t(STAGE_LABELS[item.stage]), state]
      .filter(Boolean)
      .join(' · ');
};

interface ItemCardProps {
   data: CommitteeData;
   meeting: Meeting;
   item: AgendaItem;
   index: number;
   editable: boolean;
   onSponsor: (item: AgendaItem) => void;
}

// The question: what the members are asked, then the vote and its result.
const ItemCard = ({
   data,
   meeting,
   item,
   index,
   editable,
   onSponsor,
}: ItemCardProps) => {
   const { t } = useTranslation('committee');
   const title =
      item.kind === 'info'
         ? t('{{index}}. {{title}} — информация', { index, title: item.title })
         : t('{{index}}. {{title}} — инвестиционное решение', {
              index,
              title: item.title,
           });
   const memoLink = item.dealId && item.memoVersion && (
      <Link className='link' to={`/deals/${item.dealId}?tab=memo`}>
         {t('Меморандум v{{version}}', { version: item.memoVersion })}
      </Link>
   );
   const dealLink = item.dealId && !item.memoVersion && (
      <Link className='link' to={`/deals/${item.dealId}`}>
         {t('Карточка сделки')}
      </Link>
   );

   return (
      <>
         <Card action={memoLink || dealLink || undefined} title={title}>
            {item.facts?.length ? (
               <FactList
                  className='px-5 py-1'
                  divided
                  labelWidth='minmax(8rem, 36%)'
                  rows={item.facts.map(({ label, value }) => ({
                     label,
                     value,
                  }))}
               />
            ) : (
               <p className='text-ink-soft px-5 py-4'>
                  {t('Материалы этого вопроса не перенесены из Notion.')}
               </p>
            )}
         </Card>
         {item.kind === 'info' ? (
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
                           variant='ghost'
                           onClick={() =>
                              committee.decide(meeting.id, item.id, 'noted')
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
   const planned = meeting.status === 'planned';
   const recorded = Object.values(item.votes).some(({ choice }) => choice);
   const tally = tallyVotes(meeting, data.members, item);

   if (meeting.status === 'held' && !recorded)
      return (
         <Card title={t('Голосование')}>
            <div className='flex flex-wrap items-center justify-between gap-3 px-5 py-4'>
               <p className='text-ink-soft'>
                  {t('Голоса этого заседания не перенесены из Notion.')}
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
         hint={
            planned
               ? t('откроется вместе с заседанием')
               : t(
                    '{{voted}} из {{present}} присутствующих проголосовали',
                    tally,
                 )
         }
         title={t('Голосование')}
      >
         <ul className='divide-line divide-y px-5'>
            {data.members.map((member) => {
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
                                    committee.setVoteNote(
                                       meeting.id,
                                       item.id,
                                       member.id,
                                       text,
                                    );
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
                           label={t('Голос: {{name}}', { name: member.name })}
                           value={vote.choice}
                           onChange={(choice) =>
                              committee.setVote(
                                 meeting.id,
                                 item.id,
                                 member.id,
                                 choice,
                              )
                           }
                        />
                     ) : planned ? (
                        <Badge
                           tone={
                              meeting.attendance[member.id] === 'confirmed'
                                 ? 'success'
                                 : 'warning'
                           }
                        >
                           {meeting.attendance[member.id] === 'confirmed'
                              ? t('Будет')
                              : t('Не ответил')}
                        </Badge>
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
         {!planned && (
            <ResultBox
               editable={editable}
               item={item}
               meeting={meeting}
               tally={tally}
               onSponsor={onSponsor}
            />
         )}
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
   const decide = (outcome: AgendaItem['outcome']) =>
      committee.decide(meeting.id, item.id, outcome);
   const rule = t(
      'Правило «Чек-лист ИК»: один голос против — обсуждение, решение принимает спонсор. Два и более — отказ. Особое мнение любого члена — вето.',
   );
   const postpone = (
      <Button variant='ghost' onClick={() => decide('postponed')}>
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
            <Button variant='text' onClick={() => decide(null)}>
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
      buttons = (
         <>
            <Button
               onClick={() =>
                  decide(
                     item.protocol.conditions.trim()
                        ? 'approved_conditions'
                        : 'approved',
                  )
               }
            >
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
            <Button onClick={() => onSponsor(item)}>
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
            <Button onClick={() => decide('rejected')}>
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

   return (
      <Card
         hint={
            meeting.status === 'held'
               ? t('на подписи у членов ИК')
               : t('черновик')
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
                              committee.setProtocol(
                                 meeting.id,
                                 item.id,
                                 key,
                                 event.target.value,
                              );
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

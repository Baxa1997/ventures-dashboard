import { stageName } from '@modules/Settings/services';
import {
   IC_RULES,
   MEMBER_ROLE_LABELS,
   OUTCOMES,
   VOTES,
} from '@modules/Committee/constants';
import {
   itemBadge,
   participantsOf,
   tallyVotes,
   type VoteTally,
} from '@modules/Committee/helpers';
import type { CommitteeData } from '@modules/Committee/hooks';
import committee from '@modules/Committee/services';
import {
   Attachments,
   Avatar,
   Badge,
   type BadgeTone,
   Button,
   Card,
   CompanyMark,
   NoData,
   Notice,
   TD,
   TH,
} from '@shared/components';
import { formatUsd } from '@shared/helpers';
import { useAction, useAttachments, useRequest } from '@shared/hooks';
import type {
   AgendaItem,
   Meeting,
   VoteChoice,
} from '@shared/types/committee.types';
import clsx from 'clsx';
import {
   Lock,
   type LucideIcon,
   MessageSquare,
   Mic,
   Paperclip,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import VoteButtons from './VoteButtons';

interface VotingProps {
   data: CommitteeData;
   meeting: Meeting;
   editable: boolean; // the secretary or the director
   onSponsor: (item: AgendaItem) => void;
}

// The first and the last column stay in place while the members scroll.
const STICKY_START =
   'sticky left-0 z-[1] bg-white shadow-[8px_0_8px_-8px_rgba(38,47,112,0.18)]';
const STICKY_END =
   'bg-ground sticky right-0 z-[1] shadow-[-8px_0_8px_-8px_rgba(38,47,112,0.18)]';
const CELL = 'border-line border-b';

/* «Голосование», as the design draws it: a table of the questions by the
   members, where the secretary records each vote while the meeting is open,
   and its result by the fund's rules on the right. Under it each question
   has the decision to record, the members' comments, its files and the
   recordings of the discussion; files may be added after the meeting too. */
const Voting = ({ data, meeting, editable, onSponsor }: VotingProps) => {
   const { t, i18n } = useTranslation('committee');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const voting = useAction(
      (itemId: string, memberId: string, choice: VoteChoice | null) =>
         committee.setVote(meeting.id, itemId, memberId, choice),
      { success: t('Голос записан') },
   );
   // the vote being saved: the question's and the member's ids
   const [votingId, setVotingId] = useState('');
   const participants = participantsOf(meeting, data.members);
   const questions = meeting.agenda.filter(({ kind }) => kind === 'decision');
   const live = meeting.status === 'live';

   const notice =
      meeting.status === 'planned'
         ? t(
              'Голосование начнётся, когда заседание откроют. До этого здесь собирают материалы по вопросам.',
           )
         : meeting.status === 'held'
           ? t(
                'Голосование заседания завершено. Файлы и записи можно добавлять и после заседания.',
             )
           : t(
                'Секретарь отмечает голос каждого члена ИК. Итог по правилам фонда — справа; решение фиксируется под таблицей.',
             );

   return (
      <>
         <Notice
            className='mb-4'
            icon={meeting.status === 'held' ? Lock : undefined}
         >
            {notice}
         </Notice>
         <Card className='mb-section'>
            {questions.length ? (
               <div className='overflow-x-auto'>
                  <table className='w-full border-separate border-spacing-0 text-left text-sm'>
                     <thead>
                        <tr>
                           <th
                              className={clsx(
                                 TH,
                                 CELL,
                                 STICKY_START,
                                 'min-w-56',
                              )}
                           >
                              {t('Вопрос')}
                           </th>
                           {participants.map((member) => (
                              <th
                                 key={member.id}
                                 className={clsx(
                                    TH,
                                    CELL,
                                    'min-w-44 align-top',
                                 )}
                              >
                                 <div className='flex items-start gap-2'>
                                    <Avatar name={member.name} />
                                    <div className='min-w-0 whitespace-normal'>
                                       <div className='text-ink text-xs'>
                                          {member.name}
                                       </div>
                                       <div className='font-normal'>
                                          {member.id === meeting.chairId
                                             ? t('председатель')
                                             : t(
                                                  MEMBER_ROLE_LABELS[
                                                     member.role
                                                  ],
                                               )}
                                       </div>
                                    </div>
                                 </div>
                              </th>
                           ))}
                           <th
                              className={clsx(
                                 TH,
                                 CELL,
                                 STICKY_END,
                                 'min-w-40',
                              )}
                           >
                              {t('Итог')}
                           </th>
                        </tr>
                     </thead>
                     <tbody>
                        {questions.map((item) => {
                           const tally = tallyVotes(
                              meeting,
                              data.members,
                              item,
                           );
                           const result = itemBadge(t, meeting, item);
                           const changeable =
                              editable && live && item.outcome === null;
                           return (
                              <tr key={item.id}>
                                 <td className={clsx(TD, CELL, STICKY_START)}>
                                    <div className='flex items-center gap-2.5'>
                                       <CompanyMark name={item.title} />
                                       <div className='min-w-0'>
                                          <div className='truncate font-semibold'>
                                             {item.title}
                                          </div>
                                          <div className='text-ink-soft truncate text-xs'>
                                             {[
                                                item.stage &&
                                                   stageName(item.stage),
                                                item.amount &&
                                                   formatUsd(
                                                      item.amount,
                                                      language,
                                                   ),
                                             ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                          </div>
                                       </div>
                                    </div>
                                 </td>
                                 {participants.map((member) => {
                                    const choice =
                                       item.votes[member.id]?.choice ?? null;
                                    const key = `${item.id}/${member.id}`;
                                    return (
                                       <td
                                          key={member.id}
                                          className={clsx(
                                             TD,
                                             CELL,
                                             'whitespace-nowrap',
                                          )}
                                       >
                                          {changeable ? (
                                             <VoteButtons
                                                busy={votingId === key}
                                                label={t(
                                                   'Голос: {{name}}, {{title}}',
                                                   {
                                                      name: member.name,
                                                      title: item.title,
                                                   },
                                                )}
                                                value={choice}
                                                onChange={async (next) => {
                                                   setVotingId(key);
                                                   await voting.run(
                                                      item.id,
                                                      member.id,
                                                      next,
                                                   );
                                                   setVotingId('');
                                                }}
                                             />
                                          ) : choice ? (
                                             <Badge tone={VOTES[choice].tone}>
                                                {t(VOTES[choice].label)}
                                             </Badge>
                                          ) : (
                                             <span className='text-ink-faint'>
                                                —
                                             </span>
                                          )}
                                       </td>
                                    );
                                 })}
                                 <td className={clsx(TD, CELL, STICKY_END)}>
                                    <div className='grid justify-items-start gap-1'>
                                       <Badge tone={result.tone}>
                                          {result.label}
                                       </Badge>
                                       {meeting.status !== 'planned' && (
                                          <span className='text-ink-soft text-xs whitespace-nowrap tabular-nums'>
                                             {t(
                                                '{{for}} за · {{against}} против · {{dissent}} особ.',
                                                {
                                                   for: tally.for,
                                                   against: tally.against,
                                                   dissent:
                                                      tally.dissent.length,
                                                },
                                             )}
                                          </span>
                                       )}
                                    </div>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            ) : (
               <NoData>{t('В повестке нет вопросов для голосования.')}</NoData>
            )}
            <footer className='text-ink-soft px-4.5 py-2.5 text-xs'>
               {t(
                  'Кворум — не меньше {{quorum}} присутствующих членов ИК. Один голос «против» — решение за спонсором, два — отказ, особое мнение — вето.',
                  { quorum: IC_RULES.quorum },
               )}
            </footer>
         </Card>
         <div className='gap-section grid items-start xl:grid-cols-2'>
            {meeting.agenda.map((item) => (
               <ItemPanel
                  key={item.id}
                  data={data}
                  editable={editable}
                  item={item}
                  meeting={meeting}
                  onSponsor={onSponsor}
               />
            ))}
         </div>
      </>
   );
};

interface ItemPanelProps {
   data: CommitteeData;
   meeting: Meeting;
   item: AgendaItem;
   editable: boolean;
   onSponsor: (item: AgendaItem) => void;
}

// A part of a question's card: its icon, its name and count, then its body.
const Section = ({
   icon: Icon,
   title,
   count,
   children,
}: {
   icon: LucideIcon;
   title: string;
   count?: number;
   children: ReactNode;
}) => (
   <section className='border-line border-t px-4.5 py-3'>
      <h4 className='text-meta mb-2 flex items-center gap-1.5 font-semibold'>
         <Icon aria-hidden className='text-ink-faint size-3.75' />
         {title}
         {count !== undefined && (
            <span className='bg-hover text-ink-soft rounded-full px-2 text-[11px] font-bold'>
               {count}
            </span>
         )}
      </h4>
      {children}
   </section>
);

/* A question's card under the table: the decision the votes lead to, the
   members' comments on their votes, the files and the recordings. */
const ItemPanel = ({
   data,
   meeting,
   item,
   editable,
   onSponsor,
}: ItemPanelProps) => {
   const { t } = useTranslation('committee');
   const noting = useAction(
      (memberId: string, text: string) =>
         committee.setVoteNote(meeting.id, item.id, memberId, text),
      { success: t('Комментарий сохранён') },
   );
   const decide = useRequest({ success: t('Принято к сведению') });
   const files = { section: 'committee', itemId: item.id, dealId: item.dealId };
   const records = { ...files, section: 'committee_record' };
   const fileCount = useAttachments(files).length;
   const recordCount = useAttachments(records).length;
   const result = itemBadge(t, meeting, item);
   const participants = participantsOf(meeting, data.members);
   const notes = participants.filter(({ id }) => item.votes[id]?.note);
   // the comments are written while the vote is open
   const writing =
      editable && meeting.status === 'live' && item.outcome === null;

   return (
      <Card>
         <header className='flex items-center gap-2.5 px-4.5 py-3'>
            <CompanyMark name={item.title} />
            <h3 className='text-meta min-w-0 flex-1 font-bold'>
               {t('По вопросу: {{title}}', { title: item.title })}
            </h3>
            <Badge tone={result.tone}>{result.label}</Badge>
         </header>
         {meeting.status !== 'planned' &&
            (item.kind === 'info' ? (
               <div className='border-line flex flex-wrap items-center justify-between gap-3 border-t px-4.5 py-3'>
                  <p className='text-ink-soft'>
                     {t('Вопрос для информации: по нему не голосуют.')}
                  </p>
                  {!item.outcome &&
                     editable &&
                     meeting.status !== 'held' && (
                        <Button
                           loading={decide.pending}
                           size='sm'
                           variant='ghost'
                           onClick={() =>
                              decide.run(() =>
                                 committee.decide(meeting.id, item.id, 'noted'),
                              )
                           }
                        >
                           {t('Принять к сведению')}
                        </Button>
                     )}
               </div>
            ) : (
               <ResultBox
                  editable={editable && meeting.status === 'live'}
                  item={item}
                  meeting={meeting}
                  tally={tallyVotes(meeting, data.members, item)}
                  onSponsor={onSponsor}
               />
            ))}
         {item.kind === 'decision' && (
            <Section
               count={notes.length}
               icon={MessageSquare}
               title={t('Комментарии к голосам')}
            >
               {writing ? (
                  <div className='grid gap-2'>
                     {participants
                        .filter(
                           ({ id }) => item.votes[id]?.choice !== 'absent',
                        )
                        .map((member) => {
                           const note = item.votes[member.id]?.note ?? '';
                           return (
                              <label
                                 key={member.id}
                                 className='flex items-center gap-2.5'
                              >
                                 <Avatar name={member.name} />
                                 <span className='text-meta w-32 shrink-0 truncate'>
                                    {member.name}
                                 </span>
                                 <input
                                    key={note}
                                    className='field-input text-meta h-8 min-w-0 flex-1'
                                    defaultValue={note}
                                    placeholder={t(
                                       'Комментарий или особое мнение',
                                    )}
                                    onBlur={(event) => {
                                       const text = event.target.value.trim();
                                       if (text !== note)
                                          noting.run(member.id, text);
                                    }}
                                 />
                              </label>
                           );
                        })}
                  </div>
               ) : notes.length ? (
                  <ul className='grid gap-2'>
                     {notes.map((member) => (
                        <li key={member.id} className='flex gap-2.5'>
                           <Avatar name={member.name} />
                           <div className='text-meta min-w-0'>
                              <b>{member.name}</b>
                              <div className='bg-ground mt-1 rounded-lg px-3 py-1.5'>
                                 {item.votes[member.id].note}
                              </div>
                           </div>
                        </li>
                     ))}
                  </ul>
               ) : (
                  <p className='text-ink-soft text-meta'>
                     {meeting.status === 'planned'
                        ? t('Комментарии записывают во время голосования.')
                        : t('Комментариев нет.')}
                  </p>
               )}
            </Section>
         )}
         <Section count={fileCount} icon={Paperclip} title={t('Файлы')}>
            <Attachments
               editable={editable}
               empty={t('Файлов нет.')}
               place={files}
            />
         </Section>
         <Section
            count={recordCount}
            icon={Mic}
            title={t('Записи заседания')}
         >
            <Attachments
               editable={editable}
               empty={t('Аудио или видео обсуждения: MP3, M4A, MP4.')}
               place={records}
            />
         </Section>
      </Card>
   );
};

const BOX_TONES: Record<BadgeTone, string> = {
   accent: 'bg-accent-tint',
   success: 'bg-success-tint',
   warning: 'bg-warning-tint',
   danger: 'bg-danger-tint',
   neutral: 'bg-ground',
   indigo: 'bg-indigo-tint',
   info: 'bg-info-tint',
};

const TITLE_TONES: Record<BadgeTone, string> = {
   accent: 'text-accent',
   success: 'text-success-ink',
   warning: 'text-warning-ink',
   danger: 'text-danger',
   neutral: 'text-ink',
   indigo: 'text-indigo-ink',
   info: 'text-info-ink',
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
         size='sm'
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
            <Button
               {...busy(null)}
               size='sm'
               variant='text'
               onClick={() => decide(null)}
            >
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
      text =
         approval === 'approved_conditions'
            ? t('Условия одобрения: {{conditions}}', {
                 conditions: item.protocol.conditions.trim(),
              })
            : t(
                 'Одобрение с условиями? Впишите их во вкладке «Протокол» до того, как зафиксировать.',
              );
      buttons = (
         <>
            <Button
               {...busy(approval)}
               size='sm'
               onClick={() => decide(approval)}
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
            <Button
               disabled={deciding.pending}
               size='sm'
               onClick={() => onSponsor(item)}
            >
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
                 { names: tally.dissent.join(', ') },
              )
            : t('Итог по правилам фонда: {{against}} «против» — отказ', tally);
      buttons = (
         <>
            <Button
               {...busy('rejected')}
               size='sm'
               onClick={() => decide('rejected')}
            >
               {t('Зафиксировать отказ')}
            </Button>
            {postpone}
         </>
      );
   }

   return (
      <div className={clsx('mx-4.5 mb-3.5 rounded-lg p-3.5', BOX_TONES[tone])}>
         <p className={clsx('font-semibold', TITLE_TONES[tone])}>{title}</p>
         {text && <p className='text-meta mt-1'>{text}</p>}
         {editable && buttons && (
            <div className='mt-3 flex flex-wrap gap-2'>{buttons}</div>
         )}
      </div>
   );
};

export default Voting;

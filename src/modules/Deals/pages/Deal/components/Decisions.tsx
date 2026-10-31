import { COMMITTEE_PATH, OUTCOMES } from '@modules/Committee/constants';
import {
   meetingName,
   meetingTitle,
   tallyVotes,
} from '@modules/Committee/helpers';
import committee from '@modules/Committee/services';
import {
   committeeStateOf,
   isOpen,
   nextStageOf,
   nextStepOf,
   stageKeys,
} from '@modules/Deals/helpers';
import { stageName } from '@modules/Settings/services';
import {
   Badge,
   type BadgeTone,
   Button,
   buttonClass,
   Card,
   Notice,
} from '@shared/components';
import { formatDate, formatUsd, todayISO } from '@shared/helpers';
import { useAction, useCurrentUser, useServiceData } from '@shared/hooks';
import type { CommitteeMember, Meeting } from '@shared/types/committee.types';
import type { Deal, Decision } from '@shared/types/deals.types';
import { BadgeCheck, CalendarClock, CalendarPlus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface DecisionsProps {
   deal: Deal;
   onTransfer: () => void; // the deal moves on from its stage
   onReject: () => void; // the deal is turned down with a reason
}

const IC_STAGES = ['ic1', 'ic2'];
const NOTE = 'text-ink-soft text-meta';
const VERDICT_TONES: Record<Decision['verdict'], BadgeTone> = {
   approved: 'success',
   rejected: 'danger',
   other: 'warning',
};

const loadCommittee = () => committee.getState();
const onCommittee = (listener: () => void) => committee.subscribe(listener);

const meetingLink = (id: string, tab: 'voting' | 'protocol') =>
   `${COMMITTEE_PATH}/${id}?tab=${tab}`;

type StageState =
   | 'approved'
   | 'rejected'
   | 'postponed'
   | 'scheduled'
   | 'none' // the deal is on the stage and on no meeting
   | 'ahead' // the deal has not come to the stage
   | 'past'; // the deal left it, or closed, with no decision

const isOnStage = (deal: Deal, stage: string) =>
   deal.status === 'active' && deal.stage === stage;

const stateAt = (
   deal: Deal,
   stage: string,
   decisions: Decision[],
): StageState => {
   if (isOnStage(deal, stage)) {
      const state = committeeStateOf(deal);
      // put off at a meeting, and on no other yet
      return state === 'none' && decisions.length ? 'postponed' : state;
   }
   if (decisions.some(({ verdict }) => verdict === 'approved'))
      return 'approved';
   if (decisions.some(({ verdict }) => verdict === 'rejected'))
      return 'rejected';
   if (decisions.length) return 'postponed';
   const stages = stageKeys();
   return isOpen(deal) && stages.indexOf(stage) > stages.indexOf(deal.stage)
      ? 'ahead'
      : 'past';
};

interface StageView {
   stage: string;
   state: StageState;
   main?: Decision; // the decision the stage stands on; none while it waits
   others: Decision[];
   meeting?: Meeting; // of that decision, or the one the deal waits for
}

const viewOf = (deal: Deal, stage: string, meetings: Meeting[]): StageView => {
   const decisions = (deal.decisions ?? [])
      .filter((decision) => decision.stage === stage)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
   const state = stateAt(deal, stage, decisions);
   const main =
      state === 'scheduled'
         ? undefined
         : (decisions.find(({ verdict }) => verdict === 'approved') ??
           decisions.find(({ verdict }) => verdict === 'rejected') ??
           decisions[0]);
   const meetingId = state === 'scheduled' ? deal.committee?.id : main?.meetingId;
   return {
      stage,
      state,
      main,
      others: decisions.filter((decision) => decision !== main),
      meeting: meetings.find(({ id }) => id === meetingId),
   };
};

// What was decided, in the interface language where the panel knows it.
const useOutcome = () => {
   const { t } = useTranslation('committee');
   return ({ result, outcome }: Decision) =>
      result ? t(OUTCOMES[result].label) : outcome;
};

// Where a stage stands, in a word.
const StatePill = ({ view }: { view: StageView }) => {
   const { t } = useTranslation('deals');
   const outcome = useOutcome();
   const { state, main, meeting } = view;

   if (main)
      return (
         <Badge tone={VERDICT_TONES[main.verdict]}>{outcome(main)}</Badge>
      );
   if (state === 'scheduled') {
      if (meeting?.status === 'held')
         return <Badge tone='warning'>{t('Ждём протокол')}</Badge>;
      return (
         <Badge tone='accent'>
            {meeting?.status === 'live' || meeting?.status === 'break'
               ? t('Идёт заседание')
               : t('В повестке')}
         </Badge>
      );
   }
   if (state === 'none')
      return <Badge tone='warning'>{t('Нужно вынести')}</Badge>;
   return (
      <Badge tone='neutral'>
         {state === 'ahead' ? t('Впереди') : t('Без решения')}
      </Badge>
   );
};

interface FactProps {
   label: string;
   children: ReactNode;
}

const Fact = ({ label, children }: FactProps) => (
   <>
      <dt className='text-ink-soft'>{label}</dt>
      <dd className='font-medium whitespace-pre-line'>{children}</dd>
   </>
);

interface ToAgendaProps {
   deal: Deal;
   stage: string;
   meetings: Meeting[];
}

// How a deal gets to its stage's meeting: the next one planned, if the person
// runs it, or a new one.
const ToAgenda = ({ deal, stage, meetings }: ToAgendaProps) => {
   const { t } = useTranslation('deals');
   const { t: tc } = useTranslation('committee');
   const user = useCurrentUser();
   const adding = useAction(
      (meetingId: string) => committee.addToAgenda(meetingId, [deal.id]),
      { success: t('Сделка включена в повестку') },
   );
   const today = todayISO();
   const next = meetings
      .filter(
         (meeting) =>
            meeting.status === 'planned' &&
            meeting.date >= today &&
            (stage === 'board'
               ? meeting.body === 'board'
               : meeting.body === 'ic' && meeting.stage === stage),
      )
      .sort((a, b) => a.date.localeCompare(b.date))[0];
   const schedule = `${COMMITTEE_PATH}?schedule=${deal.id}`;

   if (!next)
      return (
         <>
            <p className={NOTE}>{t('Заседаний пока не назначено.')}</p>
            <Link
               className={buttonClass('primary', 'justify-self-start')}
               data-hint={t('Выбрать дату и создать заседание для этой сделки')}
               to={schedule}
            >
               <CalendarPlus aria-hidden />
               {t('Назначить заседание')}
            </Link>
         </>
      );
   const allowed = user.id === next.secretaryId || user.role === 'director';
   return (
      <>
         <p className={NOTE}>
            {t('Ближайшее заседание: {{meeting}} · {{date}}.', {
               meeting: meetingName(tc, next),
               date: formatDate(next.date),
            })}
            {!allowed &&
               ` ${t('Включить сделку в повестку может его секретарь или директор.')}`}
         </p>
         <div className='flex flex-wrap items-center gap-x-3.5 gap-y-2'>
            {allowed && (
               <Button
                  hint={t('Добавить сделку в повестку этого заседания')}
                  loading={adding.pending}
                  onClick={() => adding.run(next.id)}
               >
                  <CalendarPlus aria-hidden />
                  {t('Включить в повестку')}
               </Button>
            )}
            <Link
               className='link text-meta'
               data-hint={t(
                  'Выбрать дату и создать другое заседание для этой сделки',
               )}
               to={schedule}
            >
               {t('Назначить другое заседание')}
            </Link>
         </div>
      </>
   );
};

interface StageProps {
   deal: Deal;
   view: StageView;
   meetings: Meeting[];
   members: CommitteeMember[];
   title?: string; // with its word beside it; the board's are in its card's head
   onTransfer: () => void;
   onReject: () => void;
}

// What the person does at a stage, or why nothing can be done yet.
const StageStep = ({
   deal,
   view: { stage, state, meeting },
   meetings,
   onTransfer,
   onReject,
}: Omit<StageProps, 'members' | 'title'>) => {
   const { t } = useTranslation('deals');
   const { t: tc } = useTranslation('committee');
   const next = nextStageOf(deal.stage);

   if (state === 'ahead')
      return (
         <p className={NOTE}>
            {t(
               'Сделка ещё не дошла до этой стадии: сейчас она на стадии «{{stage}}».',
               { stage: stageName(deal.stage) },
            )}
         </p>
      );
   if (state === 'past')
      return <p className={NOTE}>{t('Решения по этой стадии нет.')}</p>;
   if (!isOnStage(deal, stage)) return null;

   if (state === 'approved')
      return (
         <>
            <Notice icon={BadgeCheck}>{nextStepOf(t, deal).text}</Notice>
            <Button
               className='justify-self-start'
               hint={t('Проверить условия и перевести сделку дальше')}
               onClick={onTransfer}
            >
               {next
                  ? t('Перевести в «{{stage}}»', { stage: stageName(next) })
                  : t('Перевести в портфель')}
            </Button>
         </>
      );
   if (state === 'rejected')
      return (
         <>
            <Notice warning>
               {t(
                  'Решение комитета не закрывает сделку само: нажмите «Отказать с причиной».',
               )}
            </Notice>
            <Button
               className='justify-self-start'
               hint={t('Указать причину и закрыть сделку отказом')}
               onClick={onReject}
            >
               {t('Отказать с причиной')}
            </Button>
         </>
      );
   if (state === 'scheduled' && deal.committee) {
      const held = meeting?.status === 'held';
      const live = meeting?.status === 'live' || meeting?.status === 'break';
      const values = {
         meeting: meetingTitle(tc, {
            body: stage === 'board' ? 'board' : 'ic',
            number: String(deal.committee.number),
         }),
         date: formatDate(deal.committee.date),
      };
      return (
         <>
            <Notice icon={CalendarClock}>
               {held
                  ? t(
                       'Заседание прошло: {{meeting}}, {{date}}. Решение появится, когда секретарь сформирует протокол.',
                       values,
                    )
                  : live
                    ? t(
                         'Заседание идёт: {{meeting}}. Решение появится после голосования.',
                         values,
                      )
                    : t(
                         'Сделка в повестке: {{meeting}}, {{date}}. Решение появится после голосования.',
                         values,
                      )}
            </Notice>
            <Link
               className={buttonClass('primary', 'justify-self-start')}
               data-hint={
                  held
                     ? t('Открыть протокол этого заседания')
                     : t('Открыть голосование этого заседания')
               }
               to={meetingLink(
                  deal.committee.id,
                  held ? 'protocol' : 'voting',
               )}
            >
               {held ? t('Открыть протокол') : t('Открыть голосование')}
            </Link>
         </>
      );
   }
   return (
      <>
         {state === 'postponed' ? (
            <Notice warning>
               {t(
                  'Когда будет готово то, чего ждал комитет, вынесите сделку на следующее заседание.',
               )}
            </Notice>
         ) : (
            <p className={NOTE}>
               {t('Сделка ещё не выносилась на «{{stage}}».', {
                  stage: stageName(stage),
               })}
            </p>
         )}
         <ToAgenda deal={deal} meetings={meetings} stage={stage} />
      </>
   );
};

/* A stage a committee or the board decides on: where it stands, the vote, the
   decision with its meeting, amount and conditions, what to do next, and any
   other decision taken on the same stage. */
const Stage = ({
   deal,
   view,
   meetings,
   members,
   title,
   onTransfer,
   onReject,
}: StageProps) => {
   const { t, i18n } = useTranslation('deals');
   const outcome = useOutcome();
   const { main, others, meeting } = view;
   const item = meeting?.agenda.find(({ dealId }) => dealId === deal.id);
   const tally = meeting && item ? tallyVotes(meeting, members, item) : null;
   const note = main?.note !== main?.conditions ? main?.note : '';

   return (
      <section className='grid gap-3.5 p-5'>
         {title && (
            <div className='flex flex-wrap items-center justify-between gap-2'>
               <h4 className='text-meta font-bold'>{title}</h4>
               <StatePill view={view} />
            </div>
         )}
         {tally && (
            <div className='text-ink-soft text-meta flex flex-wrap gap-x-3.5 tabular-nums'>
               <span>
                  {t('За')}: <b className='text-ink'>{tally.for}</b>
               </span>
               <span>
                  {t('Против')}: <b className='text-ink'>{tally.against}</b>
               </span>
               <span>
                  {t('Особое мнение')}:{' '}
                  <b className='text-ink'>{tally.dissent.length}</b>
               </span>
               <span>
                  {t('Не голосовали')}:{' '}
                  <b className='text-ink'>{tally.present - tally.voted}</b>
               </span>
            </div>
         )}
         {main && (
            <dl className='text-meta grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3.5 gap-y-2'>
               {main.date && (
                  <Fact label={t('Дата')}>{formatDate(main.date)}</Fact>
               )}
               {main.meetingLabel && (
                  <Fact label={t('Заседание')}>
                     {main.meetingId ? (
                        <Link
                           className='link'
                           data-hint={t('Открыть протокол этого заседания')}
                           to={meetingLink(main.meetingId, 'protocol')}
                        >
                           {main.meetingLabel}
                        </Link>
                     ) : (
                        main.meetingLabel
                     )}
                  </Fact>
               )}
               {item?.amount !== undefined && item.amount > 0 && (
                  <Fact label={t('Сумма')}>
                     {formatUsd(item.amount, i18n.language)}
                  </Fact>
               )}
               {main.conditions && (
                  <Fact label={t('Условия')}>{main.conditions}</Fact>
               )}
               {note && <Fact label={t('Комментарий')}>{note}</Fact>}
            </dl>
         )}
         <StageStep
            deal={deal}
            meetings={meetings}
            view={view}
            onReject={onReject}
            onTransfer={onTransfer}
         />
         {others.length > 0 && (
            <div className='border-line border-t pt-3'>
               <h5 className='text-ink-soft text-xs font-medium'>
                  {t('Другие решения')}
               </h5>
               <ul className='mt-2 grid gap-1.5'>
                  {others.map((decision) => (
                     <li
                        key={decision.id}
                        className='text-meta flex flex-wrap items-center gap-x-2.5 gap-y-1'
                     >
                        <Badge tone={VERDICT_TONES[decision.verdict]}>
                           {outcome(decision)}
                        </Badge>
                        {decision.meetingId ? (
                           <Link
                              className='link'
                              data-hint={t('Открыть протокол этого заседания')}
                              to={meetingLink(decision.meetingId, 'protocol')}
                           >
                              {decision.detail}
                           </Link>
                        ) : (
                           decision.detail
                        )}
                     </li>
                  ))}
               </ul>
            </div>
         )}
      </section>
   );
};

/* «Решение ИК и НС», as the design draws it, and able to act: the investment
   committee, stage by stage, and the supervisory board beside it, each saying
   where it stands and offering what comes next (to the agenda, to the vote, on
   to the next stage, or the rejection); on the last stage, the step to the
   portfolio. */
const Decisions = ({ deal, onTransfer, onReject }: DecisionsProps) => {
   const { t } = useTranslation('deals');
   const { t: tc } = useTranslation('committee');
   const data = useServiceData(loadCommittee, onCommittee);
   const meetings = data?.meetings ?? [];
   const stages = stageKeys();
   const inUse = (stage: string) =>
      stages.includes(stage) ||
      (deal.decisions ?? []).some((decision) => decision.stage === stage);
   const shared = {
      deal,
      meetings,
      members: data?.members ?? [],
      onTransfer,
      onReject,
   };
   const board = viewOf(deal, 'board', meetings);
   const boardInUse = inUse('board');
   // the newest meeting of the committee that had the deal
   const lastMeeting = meetings
      .filter(
         ({ body, agenda }) =>
            body === 'ic' && agenda.some(({ dealId }) => dealId === deal.id),
      )
      .sort((a, b) => b.date.localeCompare(a.date))[0];
   const committeeStages = IC_STAGES.filter(inUse);

   return (
      <div className='gap-section flex flex-1 flex-col'>
         <div className='gap-section grid items-start lg:grid-cols-2'>
            <Card
               action={
                  lastMeeting && (
                     <Link
                        className='link text-xs'
                        data-hint={t('Открыть голосование этого заседания')}
                        to={meetingLink(lastMeeting.id, 'voting')}
                     >
                        {t('{{meeting}} · {{date}}', {
                           meeting: meetingTitle(tc, lastMeeting),
                           date: formatDate(lastMeeting.date),
                        })}
                     </Link>
                  )
               }
               title={t('Инвестиционный комитет')}
            >
               {committeeStages.length ? (
                  <div className='divide-line divide-y'>
                     {committeeStages.map((stage) => (
                        <Stage
                           key={stage}
                           {...shared}
                           title={stageName(stage)}
                           view={viewOf(deal, stage, meetings)}
                        />
                     ))}
                  </div>
               ) : (
                  <p className={`${NOTE} p-5`}>
                     {t('Сделка ещё не выносилась на ИК.')}
                  </p>
               )}
            </Card>

            <Card
               action={
                  boardInUse ? (
                     <StatePill view={board} />
                  ) : (
                     <Badge tone='neutral'>{t('Не требуется')}</Badge>
                  )
               }
               title={t('Наблюдательный совет')}
            >
               <p className={`${NOTE} px-5 pt-5`}>
                  {boardInUse
                     ? t(
                          'После ИК-2 сделку одобряет Наблюдательный совет SQB Ventures; его заседания ведутся в «Инвесткомитете».',
                       )
                     : t(
                          'Набсовет убран из этапов сделки в Настройках, поэтому его решение не требуется.',
                       )}
               </p>
               {boardInUse && <Stage {...shared} view={board} />}
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
                  <Button
                     hint={t(
                        'Проверить условия и перевести компанию в портфель',
                     )}
                     onClick={onTransfer}
                  >
                     {t('Перевести в портфель')}
                  </Button>
               </div>
            </Card>
         )}
      </div>
   );
};

export default Decisions;

import { readinessOf } from '@modules/Deals/helpers';
import { stageName } from '@modules/Settings/services';
import type { BadgeTone } from '@shared/components';
import { daysUntil, formatDate } from '@shared/helpers';
import type {
   AgendaItem,
   CommitteeBody,
   CommitteeMember,
   CommitteeStage,
   DecisionTask,
   ItemOutcome,
   Meeting,
   MeetingResult,
} from '@shared/types/committee.types';
import type { Deal } from '@shared/types/deals.types';
import type { TFunction } from 'i18next';
import {
   BODY_LABELS,
   FORMAT_OPTIONS,
   IC_RULES,
   MEETING_STATUS,
   OUTCOMES,
} from '../constants';

type T = TFunction<'committee'>;

// ИК № 7, НС № 2
export const meetingName = (t: T, meeting: Pick<Meeting, 'body' | 'number'>) =>
   t('{{body}} № {{number}}', {
      body: t(BODY_LABELS[meeting.body]),
      number: meeting.number,
   });

// Заседание ИК № 7
export const meetingTitle = (
   t: T,
   meeting: Pick<Meeting, 'body' | 'number'>,
) => t('Заседание {{name}}', { name: meetingName(t, meeting) });

// What the meeting decides on: ИК-1, ИК-2, or the board.
export const meetingType = (t: T, meeting: Meeting) =>
   meeting.body === 'board'
      ? t('Наблюдательный совет')
      : meeting.stage
        ? stageName(meeting.stage)
        : t('ИК');

// The meeting's status as its head shows it: with the time it opened or
// broke off, and where its protocol is once it is held.
export const statusBadge = (
   t: T,
   meeting: Meeting,
): { label: string; tone: BadgeTone } => {
   const { label, tone } = MEETING_STATUS[meeting.status];
   if (meeting.status === 'live')
      return {
         tone,
         label: t('Идёт заседание · с {{time}}', {
            time: meeting.startedAt ?? '',
         }),
      };
   if (meeting.status === 'break')
      return {
         tone,
         label: t('Перерыв · с {{time}}', { time: meeting.breakAt ?? '' }),
      };
   if (meeting.status === 'held')
      return {
         tone,
         label:
            meeting.protocol === 'signed'
               ? t('Проведено · протокол подписан')
               : t('Проведено · протокол на подписи'),
      };
   return { label: t(label), tone };
};

export const isUpcoming = ({ status }: Meeting) => status !== 'held';

// "Очно и по видео" in the interface language; a format typed in ucode as it is.
export const formatName = (t: T, format: string) => {
   const known = FORMAT_OPTIONS.find((option) => option === format);
   return known ? t(known) : format;
};

// The people who can be asked to a meeting: those who have not left.
export const activeMembers = (members: CommitteeMember[]) =>
   members.filter(({ retired }) => !retired);

// The people asked to the meeting (its attendance rows), those who left
// since too; every member for a meeting from before participants were picked
// per meeting.
export const participantsOf = (meeting: Meeting, members: CommitteeMember[]) =>
   Object.keys(meeting.attendance).length
      ? members.filter(({ id }) => id in meeting.attendance)
      : activeMembers(members);

// The participants who take part: those who confirmed, before the meeting
// opens; those not marked absent, once it is open.
export const presentMembers = (
   meeting: Meeting,
   members: CommitteeMember[],
   item?: AgendaItem,
) =>
   participantsOf(meeting, members).filter((member) =>
      meeting.status === 'planned' || !item
         ? meeting.attendance[member.id] === 'confirmed'
         : item.votes[member.id]?.choice !== 'absent',
   );

// Who took part once the meeting opened: those not marked absent in its votes.
export const attendedMembers = (
   meeting: Meeting,
   members: CommitteeMember[],
) =>
   participantsOf(meeting, members).filter(
      (member) =>
         !meeting.agenda.some(
            (item) => item.votes[member.id]?.choice === 'absent',
         ),
   );

export const hasQuorum = (present: number) => present >= IC_RULES.quorum;

// What a planned meeting needs before it opens: questions on its agenda, and
// enough members confirmed for a quorum.
export const preparationOf = (meeting: Meeting, members: CommitteeMember[]) => {
   const confirmed = presentMembers(meeting, members).length;
   return {
      questions: meeting.agenda.length,
      members: participantsOf(meeting, members).length,
      confirmed,
      ready: meeting.agenda.length > 0 && hasQuorum(confirmed),
   };
};

// Whether a committee has already approved the deal at this stage: its owner
// then moves it on, and it waits for no other meeting.
export const approvedAt = (deal: Deal, stage: string) =>
   (deal.decisions ?? []).some(
      (decision) => decision.stage === stage && decision.verdict === 'approved',
   );

// The active deals waiting for a meeting of this body and stage: not on the
// agenda of a meeting that has not been held yet, and not approved at that
// stage already.
export const waitingDeals = (
   meetings: Meeting[],
   deals: Deal[],
   body: CommitteeBody,
   stage: CommitteeStage | null,
) => {
   const target = body === 'board' ? 'board' : stage;
   const planned = new Set(
      meetings
         .filter(({ status }) => status !== 'held')
         .flatMap(({ agenda }) => agenda.map(({ dealId }) => dealId)),
   );
   return deals.filter(
      (deal) =>
         deal.status === 'active' &&
         !planned.has(deal.id) &&
         deal.stage === target &&
         !approvedAt(deal, deal.stage),
   );
};

export type VoteState =
   'pending' | 'no_quorum' | 'approved' | 'discussion' | 'rejected' | 'veto';

export type VoteTally = {
   state: VoteState;
   present: number;
   voted: number;
   for: number;
   against: number;
   dissent: string[]; // names of the members with a dissenting opinion
};

// The result of a vote by the fund's rules: one vote against sends the
// question to the sponsor, two turn it down, a dissenting opinion is a veto.
export const tallyVotes = (
   meeting: Meeting,
   members: CommitteeMember[],
   item: AgendaItem,
): VoteTally => {
   const present = presentMembers(meeting, members, item);
   const choices = present.map(
      (member) => item.votes[member.id]?.choice ?? null,
   );
   const count = (choice: string) =>
      choices.filter((value) => value === choice).length;
   const tally = {
      present: present.length,
      voted: choices.filter(Boolean).length,
      for: count('for'),
      against: count('against'),
      dissent: present
         .filter((member) => item.votes[member.id]?.choice === 'dissent')
         .map(({ name }) => name),
   };
   const state: VoteState = !hasQuorum(tally.present)
      ? 'no_quorum'
      : tally.voted < tally.present
        ? 'pending'
        : tally.dissent.length
          ? 'veto'
          : tally.against >= IC_RULES.rejectAt
            ? 'rejected'
            : tally.against >= IC_RULES.discussionAt
              ? 'discussion'
              : 'approved';
   return { ...tally, state };
};

// Only the states of the readiness items are counted here, so their wording
// is left as the keys.
const COUNT_ONLY = ((key: string) => key) as unknown as TFunction<'deals'>;

// How many of an item's materials are ready: from the deal's readiness for
// its committee (readinessOf) while the deal waits for it, otherwise as the
// item was recorded.
export const materialsOf = (item: AgendaItem, deal?: Deal) => {
   const items = deal ? readinessOf(COUNT_ONLY, deal) : [];
   if (items.length)
      return {
         ready: items.filter(({ state }) => state === 'done').length,
         total: items.length,
      };
   return item.materials ?? null;
};

// Whether every question of a meeting has all its materials, so they can go
// out to the members.
export const materialsReady = (meeting: Meeting, deals: Deal[]) =>
   meeting.agenda.every((item) => {
      const value =
         item.kind === 'decision'
            ? materialsOf(
                 item,
                 deals.find(({ id }) => id === item.dealId),
              )
            : null;
      return value === null || value.ready === value.total;
   });

// The deal's owner presents it, also when assigned after it was scheduled.
export const speakerOf = (item: AgendaItem, deal?: Deal) =>
   item.speakerId || deal?.ownerId || '';

// A question as a pill: its outcome, «Ожидается» before the meeting,
// «Голосование» while the meeting is open.
export const itemBadge = (
   t: T,
   meeting: Meeting,
   item: AgendaItem,
): { label: string; tone: BadgeTone } => {
   if (item.outcome)
      return {
         label: t(OUTCOMES[item.outcome].label),
         tone: OUTCOMES[item.outcome].tone,
      };
   if (item.kind === 'info') return { label: t('Информация'), tone: 'neutral' };
   return meeting.status === 'planned'
      ? { label: t('Ожидается'), tone: 'accent' }
      : { label: t('Голосование'), tone: 'accent' };
};

// Why a deal no longer waits for a question on a meeting not held yet: it was
// approved at that stage elsewhere, or has left the stage; '' when it waits.
export const staleNote = (
   t: T,
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

export const isDecided = (item: AgendaItem) =>
   item.kind === 'info' || item.outcome !== null;

// The register's line for a meeting once its protocol is formed.
export const resultOf = (outcomes: ItemOutcome[]): MeetingResult => {
   const decided = outcomes.filter((outcome) => outcome !== 'noted');
   if (!decided.length) return 'approved';
   const all = (...values: ItemOutcome[]) =>
      decided.every((outcome) => values.includes(outcome));
   if (all('approved', 'sponsor_approved')) return 'approved';
   if (all('approved', 'sponsor_approved', 'approved_conditions'))
      return 'approved_conditions';
   if (all('postponed')) return 'postponed';
   if (all('rejected')) return 'rejected';
   return 'mixed';
};

// "до 6 октября", "до ИК-2", "просрочено 4 дня"
export const taskDue = (
   t: T,
   task: DecisionTask,
): { label: string; tone: BadgeTone } => {
   if ('label' in task.due) return { label: task.due.label, tone: 'warning' };
   const left = daysUntil(task.due.date);
   if (left < 0)
      return {
         label: t('просрочено {{count}} день', { count: -left }),
         tone: 'danger',
      };
   return {
      label: t('до {{date}}', { date: formatDate(task.due.date) }),
      tone: 'accent',
   };
};

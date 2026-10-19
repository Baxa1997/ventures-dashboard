import type { BadgeTone } from '@shared/components';
import { daysUntil, formatDate } from '@shared/helpers';
import type {
   AgendaItem,
   CommitteeMember,
   DecisionTask,
   ItemOutcome,
   Meeting,
   MeetingResult,
} from '@shared/types/committee.types';
import type { Deal } from '@shared/types/deals.types';
import type { TFunction } from 'i18next';
import { BODY_LABELS, FORMAT_OPTIONS, IC_RULES } from '../constants';

type T = TFunction<'committee'>;

// ИК № 7, НС № 2
export const meetingName = (t: T, meeting: Pick<Meeting, 'body' | 'number'>) =>
   t('{{body}} № {{number}}', {
      body: t(BODY_LABELS[meeting.body]),
      number: meeting.number,
   });

export const isUpcoming = ({ status }: Meeting) => status !== 'held';

// "Очно и по видео" in the interface language; a format typed in ucode as it is.
export const formatName = (t: T, format: string) => {
   const known = FORMAT_OPTIONS.find((option) => option === format);
   return known ? t(known) : format;
};

// The members who take part: those who confirmed, before the meeting opens;
// those not marked absent, once it is open.
export const presentMembers = (
   meeting: Meeting,
   members: CommitteeMember[],
   item?: AgendaItem,
) =>
   members.filter((member) =>
      meeting.status === 'planned' || !item
         ? meeting.attendance[member.id] === 'confirmed'
         : item.votes[member.id]?.choice !== 'absent',
   );

export const hasQuorum = (present: number) => present >= IC_RULES.quorum;

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

// How many of an item's materials are ready: from the deal's readiness list
// when it has one.
export const materialsOf = (item: AgendaItem, deal?: Deal) => {
   const items = deal?.readiness?.items;
   if (items?.length)
      return {
         ready: items.filter(({ state }) => state === 'done').length,
         total: items.length,
      };
   return item.materials ?? null;
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

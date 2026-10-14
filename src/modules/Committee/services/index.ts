import deals from '@modules/Deals/services';
import { DIRECTOR_ID } from '@shared/constants';
import { addWorkingDays, createStore, newId, todayISO } from '@shared/helpers';
import type {
   AgendaItem,
   Attendance,
   CommitteeDecision,
   CommitteeMember,
   DecisionTask,
   ItemOutcome,
   Meeting,
   MemberVote,
   NewMeetingInput,
   Protocol,
   VoteChoice,
} from '@shared/types/committee.types';
import dayjs from 'dayjs';
import { IC_RULES } from '../constants';
import { resultOf } from '../helpers';
import {
   SAMPLE_DECISIONS,
   SAMPLE_MEETINGS,
   SAMPLE_MEMBERS,
   SAMPLE_TASKS,
   SAMPLE_TOTALS,
} from './sample';

export interface CommitteeState {
   members: CommitteeMember[];
   meetings: Meeting[];
   decisions: CommitteeDecision[];
   tasks: DecisionTask[];
   totals: typeof SAMPLE_TOTALS;
}

const store = createStore<CommitteeState>(
   'sqbv_dashboard_committee_v1',
   () => ({
      members: SAMPLE_MEMBERS,
      meetings: SAMPLE_MEETINGS,
      decisions: SAMPLE_DECISIONS,
      tasks: SAMPLE_TASKS,
      totals: SAMPLE_TOTALS,
   }),
);

const nowTime = () => dayjs().format('HH:mm');

const changeMeeting = (id: string, apply: (meeting: Meeting) => Meeting) =>
   store.update((state) => ({
      ...state,
      meetings: state.meetings.map((meeting) =>
         meeting.id === id ? apply(meeting) : meeting,
      ),
   }));

const changeItem = (
   meetingId: string,
   itemId: string,
   apply: (item: AgendaItem) => AgendaItem,
) =>
   changeMeeting(meetingId, (meeting) => ({
      ...meeting,
      agenda: meeting.agenda.map((item) =>
         item.id === itemId ? apply(item) : item,
      ),
   }));

const setVoteField = (
   meetingId: string,
   itemId: string,
   memberId: string,
   patch: Partial<MemberVote>,
) =>
   changeItem(meetingId, itemId, (item) => ({
      ...item,
      votes: {
         ...item.votes,
         [memberId]: {
            ...(item.votes[memberId] ?? { choice: null, note: '' }),
            ...patch,
         },
      },
   }));

const BODY_NAMES = { ic: 'ИК', board: 'НС' };

class Committee {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   async getState(): Promise<CommitteeState> {
      return store.read();
   }

   async scheduleMeeting(input: NewMeetingInput): Promise<Meeting> {
      const state = store.read();
      const all = await deals.getDeals();
      const last = Math.max(
         0,
         ...state.meetings
            .filter(({ body }) => body === input.body)
            .map(({ number }) => Math.floor(Number(number)) || 0),
      );
      const agenda: AgendaItem[] = input.dealIds.flatMap((dealId) => {
         const deal = all.find(({ id }) => id === dealId);
         if (!deal) return [];
         return [
            {
               id: newId(),
               kind: 'decision',
               title: deal.company,
               dealId,
               stage: input.stage ?? undefined,
               amount: deal.amount,
               speakerId: deal.ownerId,
               votes: {},
               protocol: { pros: '', cons: '', conditions: '', next: '' },
               outcome: null,
               outcomeNote: '',
            },
         ];
      });
      const meeting: Meeting = {
         id: `${input.body}-${last + 1}`,
         body: input.body,
         number: String(last + 1),
         stage: input.stage,
         date: input.date,
         time: input.time,
         format: input.format,
         secretaryId: state.meetings[0]?.secretaryId ?? DIRECTOR_ID,
         materialsDue: addWorkingDays(input.date, -IC_RULES.materialsDays),
         materialsSentAt: null,
         status: 'planned',
         startedAt: null,
         breakAt: null,
         chairId:
            input.body === 'ic'
               ? (state.members.find(({ role }) => role === 'chair')?.id ??
                 null)
               : null,
         attendance: Object.fromEntries(
            state.members.map(({ id }) => [id, 'no_answer' as const]),
         ),
         agenda,
         summary: agenda.map(({ title }) => title).join(', '),
         result: 'planned',
         protocol: 'none',
      };
      store.update((current) => ({
         ...current,
         meetings: [meeting, ...current.meetings],
         totals: {
            ...current.totals,
            meetings: current.totals.meetings + (input.body === 'ic' ? 1 : 0),
         },
      }));
      return meeting;
   }

   // Whether a member confirmed, before the meeting opens.
   async setAttendance(id: string, memberId: string, attendance: Attendance) {
      changeMeeting(id, (meeting) => ({
         ...meeting,
         attendance: { ...meeting.attendance, [memberId]: attendance },
      }));
   }

   async sendMaterials(id: string) {
      changeMeeting(id, (meeting) => ({
         ...meeting,
         materialsSentAt: todayISO(),
      }));
   }

   // Opens the meeting: those who did not confirm are marked absent.
   async startMeeting(id: string) {
      changeMeeting(id, (meeting) => ({
         ...meeting,
         status: 'live',
         startedAt: meeting.startedAt ?? nowTime(),
         result: 'live',
         agenda: meeting.agenda.map((item) =>
            item.kind === 'info'
               ? item
               : {
                    ...item,
                    votes: Object.fromEntries(
                       Object.entries(meeting.attendance).map(
                          ([memberId, attendance]) => [
                             memberId,
                             item.votes[memberId]?.choice
                                ? item.votes[memberId]
                                : {
                                     choice:
                                        attendance === 'confirmed'
                                           ? null
                                           : 'absent',
                                     note: item.votes[memberId]?.note ?? '',
                                  },
                          ],
                       ),
                    ),
                 },
         ),
      }));
   }

   async toggleBreak(id: string) {
      changeMeeting(id, (meeting) =>
         meeting.status === 'break'
            ? { ...meeting, status: 'live', breakAt: null }
            : { ...meeting, status: 'break', breakAt: nowTime() },
      );
   }

   async setVote(
      meetingId: string,
      itemId: string,
      memberId: string,
      choice: VoteChoice | null,
   ) {
      setVoteField(meetingId, itemId, memberId, { choice });
   }

   async setVoteNote(
      meetingId: string,
      itemId: string,
      memberId: string,
      note: string,
   ) {
      setVoteField(meetingId, itemId, memberId, { note });
   }

   async setProtocol(
      meetingId: string,
      itemId: string,
      field: keyof Protocol,
      text: string,
   ) {
      changeItem(meetingId, itemId, (item) => ({
         ...item,
         protocol: { ...item.protocol, [field]: text },
      }));
   }

   // outcome null takes a decision back while the meeting is still open
   async decide(
      meetingId: string,
      itemId: string,
      outcome: ItemOutcome | null,
      note = '',
   ) {
      changeItem(meetingId, itemId, (item) => ({
         ...item,
         outcome,
         outcomeNote: note,
      }));
   }

   /* Closes the meeting: the protocol goes to the members for signing, the
      decisions go to the register and to the deals' cards, and the conditions
      of an approval become tasks for the deal's owner. */
   async formProtocol(
      id: string,
      // the wording of the deal's card, in the language of the person forming it
      labels: { date: string; outcome: (outcome: ItemOutcome) => string },
   ) {
      const state = store.read();
      const meeting = state.meetings.find((item) => item.id === id);
      if (!meeting) return;
      const all = await deals.getDeals();
      const decided = meeting.agenda.filter(
         (item) => item.kind === 'decision' && item.outcome,
      );
      const meetingLabel = `${BODY_NAMES[meeting.body]} № ${meeting.number}`;
      const decisions: CommitteeDecision[] = decided.map((item) => ({
         id: newId(),
         meetingId: meeting.id,
         body: meeting.body,
         meetingLabel,
         date: meeting.date,
         subject: [
            item.title,
            item.amount && `$${item.amount.toLocaleString('ru-RU')}`,
         ]
            .filter(Boolean)
            .join(' · '),
         outcome: item.outcome as ItemOutcome,
         note: item.outcomeNote || item.protocol.conditions,
         dealId: item.dealId,
      }));
      const tasks: DecisionTask[] = decided
         .filter(
            (item) =>
               item.protocol.conditions.trim() &&
               item.outcome !== 'rejected' &&
               item.outcome !== 'postponed',
         )
         .map((item) => ({
            id: newId(),
            title: `${item.title}: ${item.protocol.conditions.trim()}`,
            basis: `Условие ${meetingLabel}`,
            ownerId:
               all.find(({ id: dealId }) => dealId === item.dealId)?.ownerId ||
               DIRECTOR_ID,
            due: { label: item.stage === 'ic1' ? 'до ИК-2' : 'до подписания' },
            done: false,
         }));

      store.update((current) => ({
         ...current,
         meetings: current.meetings.map((item) =>
            item.id === id
               ? {
                    ...item,
                    status: 'held',
                    breakAt: null,
                    protocol: 'signing',
                    result: resultOf(
                       decided.map(({ outcome }) => outcome as ItemOutcome),
                    ),
                    agenda: item.agenda.map((agendaItem) =>
                       agendaItem.kind === 'info'
                          ? { ...agendaItem, outcome: 'noted' }
                          : agendaItem,
                    ),
                 }
               : item,
         ),
         decisions: [...decisions, ...current.decisions],
         tasks: [...tasks, ...current.tasks],
         totals: {
            ...current.totals,
            decisions: current.totals.decisions + decisions.length,
         },
      }));

      await Promise.all(
         decided
            .filter((item) => item.dealId)
            .map((item) =>
               deals.addDecision(item.dealId as string, {
                  body:
                     meeting.body === 'board'
                        ? 'Набсовет'
                        : item.stage === 'ic1'
                          ? 'ИК-1'
                          : 'ИК-2',
                  detail: `${meetingLabel} · ${labels.date}`,
                  outcome: [
                     labels.outcome(item.outcome as ItemOutcome),
                     item.outcomeNote,
                  ]
                     .filter(Boolean)
                     .join(' · '),
               }),
            ),
      );
   }

   async setTaskDone(id: string, done: boolean) {
      store.update((state) => ({
         ...state,
         tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, done } : task,
         ),
      }));
   }
}

export default new Committee();

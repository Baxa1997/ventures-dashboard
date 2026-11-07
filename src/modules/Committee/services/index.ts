import { CONDITION_DUE, CONDITION_ORIGIN } from '@modules/Deals/constants';
import deals from '@modules/Deals/services';
import { memoRowOf } from '@modules/Deals/services/ucode';
import { isDone } from '@modules/Work/helpers';
import work from '@modules/Work/services';
import {
   createRow,
   day,
   deleteRow,
   fromJson,
   groupBy,
   listRows,
   num,
   type Row,
   str,
   updateRow,
} from '@shared/api/ucode';
import { directorId } from '@shared/constants';
import { addWorkingDays, createStore, newId, todayISO } from '@shared/helpers';
import type {
   AgendaItem,
   Attendance,
   CommitteeBody,
   CommitteeDecision,
   CommitteeMember,
   CommitteeStage,
   DecisionTask,
   ItemOutcome,
   Meeting,
   MemberInput,
   MemberVote,
   NewMeetingInput,
   Protocol,
   VoteChoice,
} from '@shared/types/committee.types';
import type { Deal } from '@shared/types/deals.types';
import type { Task } from '@shared/types/work.types';
import dayjs from 'dayjs';
import { IC_RULES } from '../constants';
import {
   activeMembers,
   participantsOf,
   resultOf,
   waitingDeals,
} from '../helpers';

/* Инвесткомитет in ucode (docs/ucode-migration.md, batch 3): committee
   members, meetings with their attendance, agenda items with their votes, and
   the register of decisions. The conditions of an approval are tasks
   (origin ic_condition) for the deal's owner, so they also show in Задачи and
   Мой день. Each change is shown at once and written to ucode; if ucode
   refuses it, everything is read again and the error goes to the page. */

export interface CommitteeState {
   members: CommitteeMember[];
   meetings: Meeting[];
   decisions: CommitteeDecision[];
   tasks: DecisionTask[];
   totals: { meetings: number; decisions: number }; // the register's counts
}

const BODY_NAMES = { ic: 'ИК', board: 'НС' };

// The rows behind attendance marks and votes, by meeting or item and member.
let rowIds = {
   attendance: new Map<string, string>(),
   votes: new Map<string, string>(),
};
const pair = (a: string, b: string) => `${a}/${b}`;

// The chair first, then the bank's representatives, then the others.
const ROLE_ORDER: CommitteeMember['role'][] = [
   'chair',
   'bank',
   'international',
   'independent',
];
const byRole = (a: CommitteeMember, b: CommitteeMember) =>
   ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
   a.name.localeCompare(b.name);

const toMember = (row: Row): CommitteeMember => ({
   id: row.guid,
   name: str(row.name),
   role: (str(row.role) || 'independent') as CommitteeMember['role'],
   remote: !!row.remote,
   contract: str(row.contract),
   ...(row.employee_id ? { employeeId: str(row.employee_id) } : {}),
   ...(row.is_active === false ? { retired: true } : {}),
});

const toItem = (
   row: Row,
   votes: Row[],
   memoVersions: Map<string, number>,
): AgendaItem => {
   const materialsTotal = num(row.materials_total);
   const facts = fromJson<{ label: string; value: string }[]>(
      row.questions,
      [],
   );
   const memoVersion = memoVersions.get(str(row.memos_id));
   return {
      id: row.guid,
      kind: str(row.kind) === 'info' ? 'info' : 'decision',
      title: str(row.title),
      ...(row.deals_id ? { dealId: str(row.deals_id) } : {}),
      ...(row.stage === 'ic1' || row.stage === 'ic2'
         ? { stage: row.stage }
         : {}),
      ...(row.amount ? { amount: num(row.amount) } : {}),
      ...(row.instrument ? { instrument: str(row.instrument) } : {}),
      speakerId: str(row.speaker_id),
      ...(materialsTotal
         ? {
              materials: {
                 ready: num(row.materials_ready),
                 total: materialsTotal,
              },
           }
         : {}),
      ...(facts.length ? { facts } : {}),
      ...(memoVersion ? { memoVersion } : {}),
      votes: Object.fromEntries(
         votes.map((vote) => [
            str(vote.committee_members_id),
            {
               choice: (str(vote.choice) || null) as VoteChoice | null,
               note: str(vote.note),
            },
         ]),
      ),
      protocol: {
         pros: str(row.protocol_pros),
         cons: str(row.protocol_cons),
         conditions: str(row.protocol_conditions),
         next: str(row.protocol_next),
      },
      outcome: (str(row.outcome) || null) as ItemOutcome | null,
      outcomeNote: str(row.outcome_note),
   };
};

const toMeeting = (
   row: Row,
   attendance: Row[],
   items: AgendaItem[],
): Meeting => ({
   id: row.guid,
   body: str(row.body) === 'board' ? 'board' : 'ic',
   number: str(row.number),
   stage: row.stage === 'ic1' || row.stage === 'ic2' ? row.stage : null,
   date: day(row.date),
   time: str(row.time),
   format: str(row.format),
   secretaryId: str(row.secretary_id),
   materialsDue: day(row.materials_due),
   materialsSentAt: day(row.materials_sent_at) || null,
   status: (str(row.status) || 'planned') as Meeting['status'],
   startedAt: str(row.started_at) || null,
   breakAt: str(row.break_at) || null,
   chairId: str(row.committee_members_id) || null,
   attendance: Object.fromEntries(
      attendance.map((mark) => [
         str(mark.committee_members_id),
         (str(mark.attendance) || 'no_answer') as Attendance,
      ]),
   ),
   agenda: items,
   summary: str(row.summary),
   result: (str(row.result) || 'planned') as Meeting['result'],
   protocol: (str(row.protocol_state) || 'none') as Meeting['protocol'],
   protocolFile: str(row.protocol_file),
});

const toDecision = (row: Row): CommitteeDecision => ({
   id: row.guid,
   meetingId: str(row.meetings_id) || null,
   body: str(row.body) === 'board' ? 'board' : 'ic',
   meetingLabel: str(row.meeting_label),
   date: day(row.date) || null,
   subject: str(row.subject),
   outcome: (str(row.outcome) || 'noted') as ItemOutcome,
   note: str(row.note),
   ...(row.deals_id ? { dealId: str(row.deals_id) } : {}),
});

// A condition of an approval, as the register's sidebar lists it.
const toDecisionTask = (task: Task): DecisionTask => ({
   id: task.id,
   title: task.title,
   basis: task.basis,
   ownerId: task.assigneeId,
   due: task.dueDate ? { date: task.dueDate } : { label: task.dueLabel },
   done: isDone(task),
});

const store = createStore<Omit<CommitteeState, 'tasks'>>(async () => {
   const [members, meetings, attendance, items, votes, decisions, memos] =
      await Promise.all(
         [
            'committee_members',
            'meetings',
            'meeting_attendance',
            'agenda_items',
            'votes',
            'decisions',
            'memos',
         ].map((table) => listRows(table)),
      );
   const votesByItem = groupBy(votes, 'agenda_items_id');
   const itemsByMeeting = groupBy(items, 'meetings_id');
   const marksByMeeting = groupBy(attendance, 'meetings_id');
   const memoVersions = new Map(
      memos.map((row) => [row.guid, num(row.version)]),
   );
   rowIds = {
      attendance: new Map(
         attendance.map((row) => [
            pair(str(row.meetings_id), str(row.committee_members_id)),
            row.guid,
         ]),
      ),
      votes: new Map(
         votes.map((row) => [
            pair(str(row.agenda_items_id), str(row.committee_members_id)),
            row.guid,
         ]),
      ),
   };
   const allMeetings = meetings
      .map((row) =>
         toMeeting(
            row,
            marksByMeeting.get(row.guid) ?? [],
            [...(itemsByMeeting.get(row.guid) ?? [])]
               .sort((a, b) => num(a.sort_order) - num(b.sort_order))
               .map((item) =>
                  toItem(item, votesByItem.get(item.guid) ?? [], memoVersions),
               ),
         ),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
   const register = decisions
      .map(toDecision)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
   return {
      // those who left too: the meetings they sat at show them
      members: members.map(toMember).sort(byRole),
      meetings: allMeetings,
      decisions: register,
      totals: {
         meetings: allMeetings.filter(({ body }) => body === 'ic').length,
         decisions: register.length,
      },
   };
});

const nowTime = () => dayjs().format('HH:mm');

// Shows a change at once, then writes it; if ucode refuses, reads everything
// again and passes the error on.
type Stored = Omit<CommitteeState, 'tasks'>;

const apply = async (
   change: (state: Stored) => Stored,
   write: (before: Stored, after: Stored) => Promise<unknown>,
) => {
   const before = await store.get();
   const after = store.set(change);
   try {
      await write(before, after);
   } catch (error) {
      await store.reload();
      throw error;
   }
   return after;
};

const withMeeting =
   (id: string, change: (meeting: Meeting) => Meeting) => (state: Stored) => ({
      ...state,
      meetings: state.meetings.map((meeting) =>
         meeting.id === id ? change(meeting) : meeting,
      ),
   });

const meetingOf = (state: Stored, id: string) => {
   const meeting = state.meetings.find((item) => item.id === id);
   if (!meeting) throw new Error(`Meeting ${id} does not exist`);
   return meeting;
};

const changeItem = (
   meetingId: string,
   itemId: string,
   change: (item: AgendaItem) => AgendaItem,
) =>
   withMeeting(meetingId, (meeting) => ({
      ...meeting,
      agenda: meeting.agenda.map((item) =>
         item.id === itemId ? change(item) : item,
      ),
   }));

// Creates a member's vote row, or changes it.
const saveVote = (itemId: string, memberId: string, vote: MemberVote) => {
   const key = pair(itemId, memberId);
   const guid = rowIds.votes.get(key);
   const fields = { choice: vote.choice ?? '', note: vote.note };
   if (guid) return updateRow('votes', { guid, ...fields });
   const id = newId();
   rowIds.votes.set(key, id);
   return createRow('votes', {
      guid: id,
      ...fields,
      agenda_items_id: itemId,
      committee_members_id: memberId,
   });
};

const meetingFields = (meeting: Meeting) => ({
   status: meeting.status,
   started_at: meeting.startedAt ?? '',
   break_at: meeting.breakAt ?? '',
   result: meeting.result,
   protocol_state: meeting.protocol,
   protocol_file: meeting.protocolFile,
   materials_sent_at: meeting.materialsSentAt,
});

// The questions for the deals put on a meeting's agenda; the deal's owner
// presents it.
const agendaFor = (
   all: Deal[],
   dealIds: string[],
   stage: CommitteeStage | null,
): AgendaItem[] =>
   dealIds.flatMap((dealId) => {
      const deal = all.find(({ id }) => id === dealId);
      if (!deal) return [];
      return [
         {
            id: newId(),
            kind: 'decision',
            title: deal.company,
            dealId,
            stage: stage ?? undefined,
            amount: deal.amount,
            speakerId: deal.ownerId,
            votes: {},
            protocol: { pros: '', cons: '', conditions: '', next: '' },
            outcome: null,
            outcomeNote: '',
         },
      ];
   });

// Of the deals asked for, those still waiting for a meeting of this body and
// stage: a deal already on another meeting's agenda, or already approved at
// that stage, is not put on a second one.
const onlyWaiting = (
   state: Stored,
   all: Deal[],
   body: CommitteeBody,
   stage: CommitteeStage | null,
   dealIds: string[],
) => {
   const waiting = new Set(
      waitingDeals(state.meetings, all, body, stage).map(({ id }) => id),
   );
   return dealIds.filter((id) => waiting.has(id));
};

const summaryOf = (agenda: AgendaItem[]) =>
   agenda.map(({ title }) => title).join(', ');

// Writes a meeting's new questions, after the `from` it already has, and
// links each deal to the meeting.
const writeAgenda = (
   meetingId: string,
   items: AgendaItem[],
   all: Deal[],
   from: number,
) =>
   Promise.all(
      items.flatMap((item, index) => {
         const memo = all.find(({ id }) => id === item.dealId)?.memo;
         return [
            // the memorandum's current version is the one put to the vote
            createRow('agenda_items', {
               guid: item.id,
               sort_order: from + index + 1,
               kind: item.kind,
               title: item.title,
               stage: item.stage ?? '',
               amount: item.amount ?? null,
               speaker_id: item.speakerId,
               meetings_id: meetingId,
               deals_id: item.dealId ?? null,
               memos_id:
                  (memo &&
                     item.dealId &&
                     memoRowOf(item.dealId, memo.version)) ||
                  null,
            }),
            ...(item.dealId
               ? [
                    updateRow('deals', {
                       guid: item.dealId,
                       meetings_id: meetingId,
                    }),
                 ]
               : []),
         ];
      }),
   );

const memberFields = (input: MemberInput) => ({
   name: input.name,
   role: input.role,
   remote: input.remote,
   contract: input.contract,
   employee_id: input.employeeId ?? '',
});

const itemOf = (state: Stored, meetingId: string, itemId: string) => {
   const item = meetingOf(state, meetingId).agenda.find(
      ({ id }) => id === itemId,
   );
   if (!item) throw new Error(`Agenda item ${itemId} does not exist`);
   return item;
};

// A decision's line in the register: the question and the sum asked.
const subjectOf = (item: AgendaItem) =>
   [item.title, item.amount && `$${item.amount.toLocaleString('ru-RU')}`]
      .filter(Boolean)
      .join(' · ');

// The register's decision on a question of a held meeting: by its deal, or
// by its title for a question without one.
const decisionOf = (state: Stored, meeting: Meeting, item: AgendaItem) =>
   state.decisions.find(
      (decision) =>
         decision.meetingId === meeting.id &&
         (item.dealId
            ? decision.dealId === item.dealId
            : !decision.dealId &&
              decision.subject.split(' · ')[0] === item.title),
   );

// The register's row of a decision on a question.
const decisionRow = (
   decision: CommitteeDecision,
   meeting: Meeting,
   item: AgendaItem,
) => ({
   guid: decision.id,
   body: decision.body,
   meeting_label: decision.meetingLabel,
   date: decision.date,
   stage: meeting.body === 'board' ? 'board' : (item.stage ?? 'ic2'),
   subject: decision.subject,
   outcome: decision.outcome,
   note: decision.note,
   conditions: item.protocol.conditions,
   meetings_id: meeting.id,
   deals_id: item.dealId ?? null,
});

// A held meeting's result, from the decisions on its questions.
const withResult = (meeting: Meeting): Meeting =>
   meeting.status === 'held'
      ? {
           ...meeting,
           result: resultOf(
              meeting.agenda.flatMap(({ kind, outcome }) =>
                 kind === 'decision' && outcome ? [outcome] : [],
              ),
           ),
        }
      : meeting;

class Committee {
   // The conditions are tasks, so the register follows the task list too.
   subscribe(listener: () => void) {
      const offStore = store.subscribe(listener);
      const offTasks = work.subscribeTasks(listener);
      return () => {
         offStore();
         offTasks();
      };
   }

   // Reads the meetings again, after another section deleted their rows.
   async reload() {
      await store.reload();
   }

   async getState(): Promise<CommitteeState> {
      const [state, tasks] = await Promise.all([store.get(), work.getTasks()]);
      return {
         ...state,
         tasks: tasks
            .filter(({ origin }) => origin === CONDITION_ORIGIN)
            .map(toDecisionTask),
      };
   }

   async scheduleMeeting(input: NewMeetingInput): Promise<Meeting> {
      const state = await store.get();
      const all = await deals.getDeals();
      const last = Math.max(
         0,
         ...state.meetings
            .filter(({ body }) => body === input.body)
            .map(({ number }) => Math.floor(Number(number)) || 0),
      );
      const agenda = agendaFor(
         all,
         onlyWaiting(state, all, input.body, input.stage, input.dealIds),
         input.stage,
      );
      // the people asked to take part; everyone, when none were picked
      const active = activeMembers(state.members);
      const invited = input.participantIds.length
         ? active.filter(({ id }) => input.participantIds.includes(id))
         : active;
      const meeting: Meeting = {
         id: newId(),
         body: input.body,
         number: String(last + 1),
         stage: input.stage,
         date: input.date,
         time: input.time,
         format: input.format,
         secretaryId: state.meetings[0]?.secretaryId || directorId(),
         materialsDue: addWorkingDays(input.date, -IC_RULES.materialsDays),
         materialsSentAt: null,
         status: 'planned',
         startedAt: null,
         breakAt: null,
         chairId:
            input.body === 'ic'
               ? (invited.find(({ role }) => role === 'chair')?.id ?? null)
               : null,
         attendance: Object.fromEntries(
            invited.map(({ id }) => [id, 'no_answer' as const]),
         ),
         agenda,
         summary: summaryOf(agenda),
         result: 'planned',
         protocol: 'none',
         protocolFile: '',
      };
      await apply(
         (current) => ({
            ...current,
            meetings: [meeting, ...current.meetings],
            totals: {
               ...current.totals,
               meetings:
                  current.totals.meetings + (input.body === 'ic' ? 1 : 0),
            },
         }),
         async () => {
            await createRow('meetings', {
               guid: meeting.id,
               body: meeting.body,
               number: meeting.number,
               stage: meeting.stage ?? '',
               date: meeting.date,
               time: meeting.time,
               format: meeting.format,
               secretary_id: meeting.secretaryId,
               materials_due: meeting.materialsDue,
               summary: meeting.summary,
               committee_members_id: meeting.chairId,
               ...meetingFields(meeting),
            });
            await Promise.all([
               ...invited.map(({ id: memberId }) => {
                  const guid = newId();
                  rowIds.attendance.set(pair(meeting.id, memberId), guid);
                  return createRow('meeting_attendance', {
                     guid,
                     attendance: 'no_answer',
                     meetings_id: meeting.id,
                     committee_members_id: memberId,
                  });
               }),
               writeAgenda(meeting.id, agenda, all, 0),
            ]);
            await Promise.all([deals.reload(), work.reloadMeetings()]);
         },
      );
      return meeting;
   }

   // The day, time and format of a meeting, whatever its state; the
   // materials' deadline follows the day, and so do the dates of a held
   // meeting's decisions in the register.
   async updateMeeting(
      id: string,
      input: Pick<Meeting, 'date' | 'time' | 'format'>,
   ) {
      const materialsDue = addWorkingDays(input.date, -IC_RULES.materialsDays);
      const decided = (await store.get()).decisions.filter(
         ({ meetingId, date }) => meetingId === id && date !== input.date,
      );
      await apply(
         (state) => ({
            ...withMeeting(id, (meeting) => ({
               ...meeting,
               ...input,
               materialsDue,
            }))(state),
            decisions: state.decisions.map((decision) =>
               decision.meetingId === id
                  ? { ...decision, date: input.date }
                  : decision,
            ),
         }),
         async () => {
            await Promise.all([
               updateRow('meetings', {
                  guid: id,
                  date: input.date,
                  time: input.time,
                  format: input.format,
                  materials_due: materialsDue,
               }),
               ...decided.map((decision) =>
                  updateRow('decisions', {
                     guid: decision.id,
                     date: input.date,
                  }),
               ),
            ]);
            await Promise.all([deals.reload(), work.reloadMeetings()]);
         },
      );
   }

   /* Deletes a meeting, whatever its state, with its agenda, the people asked
      to it and the votes; a held meeting's decisions leave the register (the
      tasks of their conditions stay in Задачи). Its deals no longer wait for
      it. */
   async deleteMeeting(id: string) {
      const before = await store.get();
      const meeting = meetingOf(before, id);
      const decided = before.decisions.filter(
         ({ meetingId }) => meetingId === id,
      );
      const waiting = (await deals.getDeals()).filter(
         (deal) => deal.committee?.id === id,
      );
      await apply(
         (state) => ({
            ...state,
            meetings: state.meetings.filter((item) => item.id !== id),
            decisions: state.decisions.filter(
               ({ meetingId }) => meetingId !== id,
            ),
            totals: {
               meetings:
                  state.totals.meetings - (meeting.body === 'ic' ? 1 : 0),
               decisions: state.totals.decisions - decided.length,
            },
         }),
         async () => {
            const own = <T>(map: Map<string, T>, prefixes: string[]) =>
               [...map].filter(([key]) =>
                  prefixes.some((prefix) => key.startsWith(`${prefix}/`)),
               );
            const votes = own(
               rowIds.votes,
               meeting.agenda.map((item) => item.id),
            );
            const attendance = own(rowIds.attendance, [id]);
            await Promise.all([
               ...votes.map(([key, guid]) => {
                  rowIds.votes.delete(key);
                  return deleteRow('votes', guid);
               }),
               ...attendance.map(([key, guid]) => {
                  rowIds.attendance.delete(key);
                  return deleteRow('meeting_attendance', guid);
               }),
               ...meeting.agenda.map((item) =>
                  deleteRow('agenda_items', item.id),
               ),
               ...decided.map((decision) =>
                  deleteRow('decisions', decision.id),
               ),
               ...waiting.map((deal) =>
                  updateRow('deals', { guid: deal.id, meetings_id: null }),
               ),
            ]);
            await deleteRow('meetings', id);
            await Promise.all([deals.reload(), work.reloadMeetings()]);
         },
      );
   }

   // Puts deals on the agenda of a meeting, whatever its state.
   async addToAgenda(meetingId: string, dealIds: string[]) {
      const [state, all] = await Promise.all([store.get(), deals.getDeals()]);
      const meeting = meetingOf(state, meetingId);
      const from = meeting.agenda.length;
      const items = agendaFor(
         all,
         onlyWaiting(state, all, meeting.body, meeting.stage, dealIds),
         meeting.stage,
      );
      await apply(
         withMeeting(meetingId, (meeting) => {
            const agenda = [...meeting.agenda, ...items];
            return { ...meeting, agenda, summary: summaryOf(agenda) };
         }),
         async (_, after) => {
            await Promise.all([
               writeAgenda(meetingId, items, all, from),
               updateRow('meetings', {
                  guid: meetingId,
                  summary: meetingOf(after, meetingId).summary,
               }),
            ]);
            await Promise.all([deals.reload(), work.reloadMeetings()]);
         },
      );
   }

   /* Puts one question on a meeting, whatever its state, as «Добавить» at
      the foot of an opened meeting does: a deal — one waiting for it, or any
      other deal in work, whose stage stays as it is — or a question for
      information under its own title; then its sum, speaker and decision,
      which on a held meeting reach the register as any changed decision does.
      Returns the question's id. */
   async addQuestion(
      meetingId: string,
      input: {
         dealId?: string;
         title?: string;
      } & Pick<AgendaItem, 'speakerId' | 'amount' | 'outcome'>,
   ) {
      const [state, all] = await Promise.all([store.get(), deals.getDeals()]);
      const meeting = meetingOf(state, meetingId);
      const from = meeting.agenda.length;
      const [item] = input.dealId
         ? agendaFor(all, [input.dealId], meeting.stage)
         : [
              {
                 id: newId(),
                 kind: 'info',
                 title: (input.title ?? '').trim(),
                 stage: meeting.stage ?? undefined,
                 speakerId: input.speakerId,
                 votes: {},
                 protocol: { pros: '', cons: '', conditions: '', next: '' },
                 outcome: null,
                 outcomeNote: '',
              } satisfies AgendaItem,
           ];
      if (!item || !item.title) throw new Error('Nothing to put on the agenda');
      await apply(
         withMeeting(meetingId, (one) => {
            const agenda = [...one.agenda, item];
            return { ...one, agenda, summary: summaryOf(agenda) };
         }),
         async (_, after) => {
            await Promise.all([
               writeAgenda(meetingId, [item], all, from),
               updateRow('meetings', {
                  guid: meetingId,
                  summary: meetingOf(after, meetingId).summary,
               }),
            ]);
            await Promise.all([deals.reload(), work.reloadMeetings()]);
         },
      );
      const amount = input.amount ?? item.amount;
      if (
         input.outcome ||
         input.speakerId !== item.speakerId ||
         amount !== item.amount
      )
         await this.updateItem(meetingId, item.id, {
            speakerId: input.speakerId,
            amount,
            outcome: input.outcome,
         });
      return item.id;
   }

   /* Takes a question off the agenda of a meeting, whatever its state, with
      the votes recorded on it: a deal decided at another meeting, or put on
      this one by mistake. A held meeting's decision on it leaves the
      register and the meeting's result follows. The deal no longer waits
      for this meeting. */
   async removeFromAgenda(meetingId: string, itemId: string) {
      const state = await store.get();
      const meeting = meetingOf(state, meetingId);
      const item = meeting.agenda.find(({ id }) => id === itemId);
      if (!item) return;
      const decided =
         meeting.status === 'held'
            ? decisionOf(state, meeting, item)
            : undefined;
      const all = await deals.getDeals();
      const deal = all.find(({ id }) => id === item.dealId);
      await apply(
         (current) => {
            const next = withMeeting(meetingId, (one) => {
               const agenda = one.agenda.filter(({ id }) => id !== itemId);
               return withResult({
                  ...one,
                  agenda,
                  summary: summaryOf(agenda),
               });
            })(current);
            return decided
               ? {
                    ...next,
                    decisions: next.decisions.filter(
                       ({ id }) => id !== decided.id,
                    ),
                    totals: {
                       ...next.totals,
                       decisions: next.totals.decisions - 1,
                    },
                 }
               : next;
         },
         async (_, after) => {
            const votes = [...rowIds.votes].filter(([key]) =>
               key.startsWith(`${itemId}/`),
            );
            await Promise.all(
               votes.map(([key, guid]) => {
                  rowIds.votes.delete(key);
                  return deleteRow('votes', guid);
               }),
            );
            await Promise.all([
               deleteRow('agenda_items', itemId),
               updateRow('meetings', {
                  guid: meetingId,
                  summary: meetingOf(after, meetingId).summary,
                  result: meetingOf(after, meetingId).result,
               }),
               ...(decided ? [deleteRow('decisions', decided.id)] : []),
               ...(deal?.committee?.id === meetingId
                  ? [updateRow('deals', { guid: deal.id, meetings_id: null })]
                  : []),
            ]);
            await Promise.all([deals.reload(), work.reloadMeetings()]);
         },
      );
   }

   /* A question changed from the table of meetings, whatever the meeting's
      state: who presents it, the sum asked, and its decision, set or taken
      back without the vote. A held meeting's decisions are in the register,
      so there the decision is written, changed or deleted too, and the
      meeting's result follows; the deals' cards read it from there. */
   async updateItem(
      meetingId: string,
      itemId: string,
      input: Pick<AgendaItem, 'speakerId' | 'amount' | 'outcome'>,
   ) {
      const state = await store.get();
      const meeting = meetingOf(state, meetingId);
      const item = itemOf(state, meetingId, itemId);
      const changed: AgendaItem = {
         ...item,
         ...input,
         // the sponsor's word or the reason belongs to the decision it was given for
         outcomeNote: input.outcome === item.outcome ? item.outcomeNote : '',
      };
      const held = meeting.status === 'held';
      const found = held ? decisionOf(state, meeting, item) : undefined;
      const decision: CommitteeDecision | null =
         held && changed.kind === 'decision' && changed.outcome
            ? {
                 id: found?.id ?? newId(),
                 meetingId,
                 body: meeting.body,
                 meetingLabel:
                    found?.meetingLabel ??
                    `${BODY_NAMES[meeting.body]} № ${meeting.number}`,
                 date: found?.date ?? meeting.date,
                 subject: subjectOf(changed),
                 outcome: changed.outcome,
                 note: changed.outcomeNote || changed.protocol.conditions,
                 dealId: changed.dealId,
              }
            : null;
      await apply(
         (current) => {
            const next = withMeeting(meetingId, (one) =>
               withResult({
                  ...one,
                  agenda: one.agenda.map((each) =>
                     each.id === itemId ? changed : each,
                  ),
               }),
            )(current);
            const decisions = found
               ? decision
                  ? next.decisions.map((each) =>
                       each.id === found.id ? decision : each,
                    )
                  : next.decisions.filter(({ id }) => id !== found.id)
               : decision
                 ? [decision, ...next.decisions]
                 : next.decisions;
            return {
               ...next,
               decisions,
               totals: {
                  ...next.totals,
                  decisions:
                     next.totals.decisions +
                     decisions.length -
                     next.decisions.length,
               },
            };
         },
         async (_, after) => {
            await Promise.all([
               updateRow('agenda_items', {
                  guid: itemId,
                  speaker_id: changed.speakerId,
                  amount: changed.amount ?? null,
                  outcome: changed.outcome ?? '',
                  outcome_note: changed.outcomeNote,
               }),
               ...(held
                  ? [
                       updateRow('meetings', {
                          guid: meetingId,
                          result: meetingOf(after, meetingId).result,
                       }),
                       decision
                          ? found
                             ? updateRow('decisions', {
                                  guid: found.id,
                                  subject: decision.subject,
                                  outcome: decision.outcome,
                                  note: decision.note,
                               })
                             : createRow(
                                  'decisions',
                                  decisionRow(decision, meeting, changed),
                               )
                          : found
                            ? deleteRow('decisions', found.id)
                            : Promise.resolve(),
                    ]
                  : []),
            ]);
            await Promise.all([deals.reload(), work.reloadMeetings()]);
         },
      );
   }

   // Adds a person to the committee's people; returns their id.
   async addMember(input: MemberInput) {
      const id = newId();
      await apply(
         (state) => ({
            ...state,
            members: [...state.members, { id, ...input }].sort(byRole),
         }),
         () =>
            createRow('committee_members', {
               guid: id,
               ...memberFields(input),
               is_active: true,
            }),
      );
      return id;
   }

   // Asks a person to a meeting that has not opened yet.
   async addParticipant(id: string, memberId: string) {
      const meeting = meetingOf(await store.get(), id);
      if (memberId in meeting.attendance) return;
      await this.setAttendance(id, memberId, 'no_answer');
   }

   // Takes a person off a meeting that has not opened yet.
   async removeParticipant(id: string, memberId: string) {
      await apply(
         withMeeting(id, (meeting) => {
            const { [memberId]: _, ...attendance } = meeting.attendance;
            return { ...meeting, attendance };
         }),
         async () => {
            const key = pair(id, memberId);
            const guid = rowIds.attendance.get(key);
            if (guid) await deleteRow('meeting_attendance', guid);
            rowIds.attendance.delete(key);
         },
      );
   }

   async updateMember(id: string, input: MemberInput) {
      await apply(
         (state) => ({
            ...state,
            members: state.members
               .map((member) => (member.id === id ? { id, ...input } : member))
               .sort(byRole),
         }),
         () =>
            updateRow('committee_members', {
               guid: id,
               ...memberFields(input),
            }),
      );
   }

   /* A member who leaves the committee: no longer offered for meetings and
      taken off those not opened yet, kept in the meetings they sat at and in
      their protocols. */
   async retireMember(id: string) {
      const planned = (await store.get()).meetings.filter(
         (meeting) => meeting.status === 'planned' && id in meeting.attendance,
      );
      for (const meeting of planned)
         await this.removeParticipant(meeting.id, id);
      await apply(
         (state) => ({
            ...state,
            members: state.members.map((member) =>
               member.id === id ? { ...member, retired: true } : member,
            ),
         }),
         () => updateRow('committee_members', { guid: id, is_active: false }),
      );
   }

   // Who chairs a meeting that has not opened yet.
   async setChair(id: string, memberId: string) {
      await apply(
         withMeeting(id, (meeting) => ({ ...meeting, chairId: memberId })),
         () =>
            updateRow('meetings', { guid: id, committee_members_id: memberId }),
      );
   }

   // Whether a member confirmed, before the meeting opens.
   async setAttendance(id: string, memberId: string, attendance: Attendance) {
      await apply(
         withMeeting(id, (meeting) => ({
            ...meeting,
            attendance: { ...meeting.attendance, [memberId]: attendance },
         })),
         () => {
            const key = pair(id, memberId);
            const guid = rowIds.attendance.get(key);
            if (guid)
               return updateRow('meeting_attendance', { guid, attendance });
            const created = newId();
            rowIds.attendance.set(key, created);
            return createRow('meeting_attendance', {
               guid: created,
               attendance,
               meetings_id: id,
               committee_members_id: memberId,
            });
         },
      );
   }

   async sendMaterials(id: string) {
      await apply(
         withMeeting(id, (meeting) => ({
            ...meeting,
            materialsSentAt: todayISO(),
         })),
         (_, after) =>
            updateRow('meetings', {
               guid: id,
               ...meetingFields(meetingOf(after, id)),
            }),
      );
   }

   // Opens the meeting, today, whatever day it was planned for: its decisions
   // and protocol carry the day it met. The members who did not confirm are
   // marked absent.
   async startMeeting(id: string) {
      await apply(
         (state) =>
            withMeeting(id, (meeting) => ({
               ...meeting,
               status: 'live',
               date: todayISO(),
               startedAt: meeting.startedAt ?? nowTime(),
               result: 'live',
               agenda: meeting.agenda.map((item) =>
                  item.kind === 'info'
                     ? item
                     : {
                          ...item,
                          votes: Object.fromEntries(
                             participantsOf(meeting, state.members).map(
                                ({ id: memberId }) => [
                                   memberId,
                                   item.votes[memberId]?.choice
                                      ? item.votes[memberId]
                                      : {
                                           choice:
                                              meeting.attendance[memberId] ===
                                              'confirmed'
                                                 ? null
                                                 : ('absent' as const),
                                           note:
                                              item.votes[memberId]?.note ?? '',
                                        },
                                ],
                             ),
                          ),
                       },
               ),
            }))(state),
         async (before, after) => {
            const meeting = meetingOf(after, id);
            const previous = meetingOf(before, id);
            await Promise.all([
               updateRow('meetings', {
                  guid: id,
                  date: meeting.date,
                  ...meetingFields(meeting),
               }),
               ...meeting.agenda.flatMap((item) => {
                  const old = previous.agenda.find(
                     ({ id: itemId }) => itemId === item.id,
                  );
                  return Object.entries(item.votes)
                     .filter(
                        ([memberId, vote]) =>
                           old?.votes[memberId]?.choice !== vote.choice,
                     )
                     .map(([memberId, vote]) =>
                        saveVote(item.id, memberId, vote),
                     );
               }),
            ]);
            await work.reloadMeetings();
         },
      );
   }

   async toggleBreak(id: string) {
      await apply(
         withMeeting(id, (meeting) =>
            meeting.status === 'break'
               ? { ...meeting, status: 'live', breakAt: null }
               : { ...meeting, status: 'break', breakAt: nowTime() },
         ),
         (_, after) =>
            updateRow('meetings', {
               guid: id,
               ...meetingFields(meetingOf(after, id)),
            }),
      );
   }

   private async setVoteField(
      meetingId: string,
      itemId: string,
      memberId: string,
      patch: Partial<MemberVote>,
   ) {
      await apply(
         changeItem(meetingId, itemId, (item) => ({
            ...item,
            votes: {
               ...item.votes,
               [memberId]: {
                  ...(item.votes[memberId] ?? { choice: null, note: '' }),
                  ...patch,
               },
            },
         })),
         (_, after) =>
            saveVote(
               itemId,
               memberId,
               itemOf(after, meetingId, itemId).votes[memberId],
            ),
      );
   }

   async setVote(
      meetingId: string,
      itemId: string,
      memberId: string,
      choice: VoteChoice | null,
   ) {
      await this.setVoteField(meetingId, itemId, memberId, { choice });
   }

   async setVoteNote(
      meetingId: string,
      itemId: string,
      memberId: string,
      note: string,
   ) {
      await this.setVoteField(meetingId, itemId, memberId, { note });
   }

   async setProtocol(
      meetingId: string,
      itemId: string,
      field: keyof Protocol,
      text: string,
   ) {
      await apply(
         changeItem(meetingId, itemId, (item) => ({
            ...item,
            protocol: { ...item.protocol, [field]: text },
         })),
         () =>
            updateRow('agenda_items', {
               guid: itemId,
               [`protocol_${field}`]: text,
            }),
      );
   }

   // outcome null takes a decision back while the meeting is still open
   async decide(
      meetingId: string,
      itemId: string,
      outcome: ItemOutcome | null,
      note = '',
   ) {
      await apply(
         changeItem(meetingId, itemId, (item) => ({
            ...item,
            outcome,
            outcomeNote: note,
         })),
         () =>
            updateRow('agenda_items', {
               guid: itemId,
               outcome: outcome ?? '',
               outcome_note: note,
            }),
      );
   }

   /* Closes the meeting: the protocol goes to the members for signing, the
      decisions go to the register and to the deals' cards, and the conditions
      of an approval become tasks for the deal's owner. */
   async formProtocol(id: string, userId: string) {
      const state = await store.get();
      const meeting = meetingOf(state, id);
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
         subject: subjectOf(item),
         outcome: item.outcome as ItemOutcome,
         note: item.outcomeNote || item.protocol.conditions,
         dealId: item.dealId,
      }));
      const closed = (current: Meeting): Meeting => ({
         ...current,
         status: 'held',
         breakAt: null,
         protocol: 'signing',
         result: resultOf(decided.map(({ outcome }) => outcome as ItemOutcome)),
         agenda: current.agenda.map((item) =>
            item.kind === 'info' ? { ...item, outcome: 'noted' } : item,
         ),
      });
      await apply(
         (current) => ({
            ...withMeeting(id, closed)(current),
            decisions: [...decisions, ...current.decisions],
            totals: {
               ...current.totals,
               decisions: current.totals.decisions + decisions.length,
            },
         }),
         async (_, after) => {
            const held = meetingOf(after, id);
            await Promise.all([
               updateRow('meetings', { guid: id, ...meetingFields(held) }),
               ...held.agenda
                  .filter((item) => item.kind === 'info')
                  .map((item) =>
                     updateRow('agenda_items', {
                        guid: item.id,
                        outcome: 'noted',
                     }),
                  ),
               ...decisions.map((decision, index) =>
                  createRow(
                     'decisions',
                     decisionRow(decision, meeting, decided[index]),
                  ),
               ),
            ]);
            // the conditions of an approval: a task for the deal's owner
            for (const [index, item] of decided.entries()) {
               const conditions = item.protocol.conditions.trim();
               if (
                  !conditions ||
                  item.outcome === 'rejected' ||
                  item.outcome === 'postponed'
               )
                  continue;
               const owner = all.find(
                  ({ id: dealId }) => dealId === item.dealId,
               )?.ownerId;
               await work.createTask(
                  {
                     title: `${item.title}: ${conditions}`,
                     type: 'other',
                     context: item.title,
                     details: '',
                     relation: item.dealId ? 'deal' : 'none',
                     relationId: item.dealId ?? '',
                     assigneeId: owner || directorId(),
                     reviewerId: '',
                     startDate: '',
                     dueDate: '',
                     priority: 'high',
                     status: 'assigned',
                     recurrence: 'none',
                     checklist: [],
                  },
                  userId,
                  {
                     basis: `Условие ${meetingLabel}`,
                     dueLabel:
                        item.stage === 'ic1'
                           ? CONDITION_DUE.ic2
                           : CONDITION_DUE.signing,
                     origin: CONDITION_ORIGIN,
                     decisionId: decisions[index].id,
                  },
               );
            }
            // the deals' cards read their decisions from the register
            await Promise.all([deals.reload(), work.reloadMeetings()]);
         },
      );
   }

   /* The members signed the protocol, on paper or with their e-signatures;
      the secretary marks it with a link to the signed copy, kept where the
      fund keeps its files (ucode Files would be open to anyone with the
      link). */
   async signProtocol(id: string, link: string) {
      await apply(
         withMeeting(id, (meeting) => ({
            ...meeting,
            protocol: 'signed',
            protocolFile: link,
         })),
         (_, after) =>
            updateRow('meetings', {
               guid: id,
               ...meetingFields(meetingOf(after, id)),
            }),
      );
   }

   async setTaskDone(id: string, done: boolean, userId: string) {
      await work.updateTask(
         id,
         { status: done ? 'done' : 'in_progress' },
         userId,
      );
   }
}

export default new Committee();

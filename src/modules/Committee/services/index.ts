import deals from '@modules/Deals/services';
import { memoRowOf } from '@modules/Deals/services/ucode';
import work from '@modules/Work/services';
import {
   createRow,
   day,
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
import type { Task } from '@shared/types/work.types';
import dayjs from 'dayjs';
import { IC_RULES } from '../constants';
import { resultOf } from '../helpers';

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
const CONDITION = 'ic_condition';

// The rows behind attendance marks and votes, by meeting or item and member.
let rowIds = {
   attendance: new Map<string, string>(),
   votes: new Map<string, string>(),
};
const pair = (a: string, b: string) => `${a}/${b}`;

const toMember = (row: Row): CommitteeMember => ({
   id: row.guid,
   name: str(row.name),
   role: (str(row.role) || 'independent') as CommitteeMember['role'],
   remote: !!row.remote,
   contract: str(row.contract),
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
   done: task.status === 'done',
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
      members: members.filter((row) => row.is_active !== false).map(toMember),
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
   materials_sent_at: meeting.materialsSentAt,
});

const itemOf = (state: Stored, meetingId: string, itemId: string) => {
   const item = meetingOf(state, meetingId).agenda.find(
      ({ id }) => id === itemId,
   );
   if (!item) throw new Error(`Agenda item ${itemId} does not exist`);
   return item;
};

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

   async getState(): Promise<CommitteeState> {
      const [state, tasks] = await Promise.all([store.get(), work.getTasks()]);
      return {
         ...state,
         tasks: tasks
            .filter(({ origin }) => origin === CONDITION)
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
               ...state.members.map(({ id: memberId }) => {
                  const guid = newId();
                  rowIds.attendance.set(pair(meeting.id, memberId), guid);
                  return createRow('meeting_attendance', {
                     guid,
                     attendance: 'no_answer',
                     meetings_id: meeting.id,
                     committee_members_id: memberId,
                  });
               }),
               ...agenda.map((item, index) => {
                  const memo = all.find(({ id }) => id === item.dealId)?.memo;
                  // the memorandum's current version is the one put to the vote
                  return createRow('agenda_items', {
                     guid: item.id,
                     sort_order: index + 1,
                     kind: item.kind,
                     title: item.title,
                     stage: item.stage ?? '',
                     amount: item.amount ?? null,
                     speaker_id: item.speakerId,
                     meetings_id: meeting.id,
                     deals_id: item.dealId ?? null,
                     memos_id:
                        (memo &&
                           item.dealId &&
                           memoRowOf(item.dealId, memo.version)) ||
                        null,
                  });
               }),
            ]);
            await work.reloadMeetings();
         },
      );
      return meeting;
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

   // Opens the meeting: those who did not confirm are marked absent.
   async startMeeting(id: string) {
      await apply(
         withMeeting(id, (meeting) => ({
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
                                              : ('absent' as const),
                                        note: item.votes[memberId]?.note ?? '',
                                     },
                             ],
                          ),
                       ),
                    },
            ),
         })),
         async (before, after) => {
            const meeting = meetingOf(after, id);
            const previous = meetingOf(before, id);
            await Promise.all([
               updateRow('meetings', { guid: id, ...meetingFields(meeting) }),
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
               ...decisions.map((decision, index) => {
                  const item = decided[index];
                  return createRow('decisions', {
                     guid: decision.id,
                     body: decision.body,
                     meeting_label: decision.meetingLabel,
                     date: decision.date,
                     stage:
                        meeting.body === 'board'
                           ? 'board'
                           : (item.stage ?? 'ic2'),
                     subject: decision.subject,
                     outcome: decision.outcome,
                     note: decision.note,
                     conditions: item.protocol.conditions,
                     meetings_id: meeting.id,
                     deals_id: item.dealId ?? null,
                  });
               }),
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
                     relation: item.dealId ? 'deal' : 'none',
                     relationId: item.dealId ?? '',
                     assigneeId: owner || directorId(),
                     reviewerId: '',
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
                        item.stage === 'ic1' ? 'до ИК-2' : 'до подписания',
                     origin: CONDITION,
                     decisionId: decisions[index].id,
                  },
               );
            }
            // the deals' cards read their decisions from the register
            await Promise.all([deals.reload(), work.reloadMeetings()]);
         },
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

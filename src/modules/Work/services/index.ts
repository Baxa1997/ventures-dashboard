import {
   COMMITTEE_STAGES,
   committeeStateOf,
   getDeadline,
   isLate,
   stageKeys,
   triageDue,
} from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { hasAllDocs } from '@modules/Portfolio/helpers';
import portfolio from '@modules/Portfolio/services';
import settings, { listIdOf, listKeyOf } from '@modules/Settings/services';
import {
   createRow,
   day,
   deleteRow,
   groupBy,
   listRows,
   num,
   type Row,
   str,
   updateRow,
} from '@shared/api/ucode';
import { TEAM } from '@shared/constants';
import { addWorkingDays, createStore, daysUntil, newId } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import type {
   AttentionItem,
   ChecklistItem,
   Dashboard,
   Employee,
   FunnelGroup,
   MyDeal,
   NextMeeting,
   Notice,
   QueueItem,
   SectionCounters,
   Task,
   TaskEvent,
   TaskInput,
   TaskTargets,
   WaitingItem,
   WeekDeadline,
} from '@shared/types/work.types';
import dayjs from 'dayjs';
import { DATE_FORMAT, RECURRENCE_MONTHS } from '../constants';
import {
   getAssigneeId,
   isDone,
   isMine,
   needsAction,
   shiftMonths,
   statusGroup,
   todayISO,
} from '../helpers';

/* Работа in ucode (docs/ucode-migration.md, batch 5): tasks with their
   task_checklist and task_events rows. Мой день, the week's deadlines, the
   dashboard and the sidebar counters have no tables of their own: they are
   counted from the deals, the portfolio, the meetings and the tasks
   (docs/ERP.md §5.7). */

const QUEUE_DONE_KEY = 'sqbv_dashboard_queue_done';
const NEXT_STEP_DAYS = 5; // a deal's next step this close comes to Мой день
const RECENT_ACTIONS = 7; // the dashboard's latest actions
// How far back or ahead the bell looks, in days: tasks given to the person,
// new applications, the committee's next meeting.
const NOTICE_TASK_DAYS = 7;
const NOTICE_APPLICATION_DAYS = 14;
const NOTICE_MEETING_DAYS = 7;

// The dashboard's funnel, in its order.
const FUNNEL_GROUPS: FunnelGroup[] = [
   'new',
   'work',
   'committee',
   'invested',
   'rejected',
   'exit',
];

// The order of «Требует внимания»: what the fund is late with first.
const ATTENTION_ORDER: AttentionItem['kind'][] = [
   'stage',
   'requests',
   'inbox',
   'report',
   'agenda',
];

// Journal entries of different deals in the order they were made; an entry
// made here and not read back yet has no moment and is the newest of its day.
const momentOf = ({ date, at }: { date: string; at?: string }) =>
   `${date}|${at || '~'}`;

// What on a deal needs somebody's attention, the stage's lateness first.
const attentionOf = (deal: Deal, today: string): AttentionItem[] => {
   const base = { subject: deal.company, dealId: deal.id };
   if (deal.status === 'review')
      return isLate(deal, today)
         ? [
              {
                 ...base,
                 id: `inbox-${deal.id}`,
                 kind: 'inbox',
                 days: -daysUntil(deal.receivedAt.slice(0, 10), today),
              },
           ]
         : [];
   if (deal.status !== 'active') return [];
   const items: AttentionItem[] = [];
   const deadline = getDeadline(deal);
   if (deadline.kind === 'overdue')
      items.push({
         ...base,
         id: `stage-${deal.id}`,
         kind: 'stage',
         stage: deal.stage,
         days: deadline.days,
      });
   const late = (deal.requests ?? []).filter(
      ({ status, dueDate }) =>
         status === 'waiting' && dueDate && dueDate < today,
   ).length;
   if (late)
      items.push({
         ...base,
         id: `requests-${deal.id}`,
         kind: 'requests',
         count: late,
      });
   // a committee stage waits for a meeting nobody has put the deal on
   if (
      COMMITTEE_STAGES.includes(deal.stage) &&
      committeeStateOf(deal) === 'none'
   )
      items.push({
         ...base,
         id: `agenda-${deal.id}`,
         kind: 'agenda',
         stage: deal.stage,
      });
   return items;
};

const toEvent = (row: Row): TaskEvent => {
   const base = { id: row.guid, date: day(row.date) };
   const kind = str(row.kind);
   if (kind === 'status')
      return {
         ...base,
         kind: 'status',
         status: (str(row.status) || 'assigned') as Task['status'],
         userId: str(row.employee_id),
      };
   if (kind === 'recurred') return { ...base, kind: 'recurred' };
   if (kind === 'comment')
      return {
         ...base,
         kind: 'comment',
         text: str(row.text),
         userId: str(row.employee_id),
      };
   return { ...base, kind: 'note', text: str(row.text) };
};

const newest = (a: Row, b: Row) =>
   str(b.date).localeCompare(str(a.date)) ||
   str(b.created_at).localeCompare(str(a.created_at));

const toTask = (row: Row, checklist: Row[], events: Row[]): Task => ({
   id: row.guid,
   title: str(row.title),
   type:
      listKeyOf('taskTypes', row.task_types_id) ?? (str(row.type) || 'other'),
   context: str(row.context),
   details: str(row.details),
   relation: row.deals_id
      ? 'deal'
      : row.portfolio_companies_id
        ? 'portfolio'
        : 'none',
   relationId: str(row.deals_id || row.portfolio_companies_id),
   assigneeId: str(row.assignee_id),
   reviewerId: str(row.reviewer_id),
   dueDate: day(row.due_date),
   priority: (str(row.priority) || 'medium') as Task['priority'],
   status: (str(row.status) || 'assigned') as Task['status'],
   recurrence: (str(row.recurrence) || 'none') as Task['recurrence'],
   checklist: [...checklist]
      .sort((a, b) => num(a.sort_order) - num(b.sort_order))
      .map((item) => ({
         id: item.guid,
         text: str(item.text),
         done: !!item.done,
      })),
   basis: str(row.basis),
   dueLabel: str(row.due_label),
   origin: str(row.origin) || 'manual',
   createdById: str(row.created_by_id),
   decisionId: str(row.decisions_id),
   createdAt: row.created_at
      ? dayjs(str(row.created_at)).format('YYYY-MM-DD')
      : '',
   completedAt: day(row.completed_at) || null,
   history: [...events].sort(newest).map(toEvent),
});

// The fields of a task's row that the form and the actions change.
const taskFields = (task: Task) => ({
   title: task.title,
   type: task.type,
   task_types_id: listIdOf('taskTypes', task.type),
   context: task.context,
   details: task.details,
   basis: task.basis,
   assignee_id: task.assigneeId,
   reviewer_id: task.reviewerId,
   created_by_id: task.createdById,
   due_date: task.dueDate || null,
   due_label: task.dueLabel,
   priority: task.priority,
   status: task.status,
   recurrence: task.recurrence,
   origin: task.origin,
   completed_at: task.completedAt,
   deals_id: task.relation === 'deal' ? task.relationId || null : null,
   portfolio_companies_id:
      task.relation === 'portfolio' ? task.relationId || null : null,
   decisions_id: task.decisionId || null,
});

const checklistRow =
   (taskId: string) => (item: ChecklistItem, index: number) => ({
      guid: item.id,
      text: item.text,
      done: item.done,
      sort_order: index + 1,
      tasks_id: taskId,
   });

const eventRow = (taskId: string, event: TaskEvent) => ({
   guid: event.id,
   date: event.date,
   kind: event.kind,
   status: event.kind === 'status' ? event.status : '',
   text: event.kind === 'comment' || event.kind === 'note' ? event.text : '',
   employee_id:
      event.kind === 'status' || event.kind === 'comment' ? event.userId : '',
   tasks_id: taskId,
});

const store = createStore(async () => {
   // the types are rows of Настройки's list
   await settings.getSettings();
   const [tasks, checklist, events] = await Promise.all(
      ['tasks', 'task_checklist', 'task_events'].map((table) =>
         listRows(table),
      ),
   );
   const checks = groupBy(checklist, 'tasks_id');
   const history = groupBy(events, 'tasks_id');
   return tasks
      .map((row) =>
         toTask(row, checks.get(row.guid) ?? [], history.get(row.guid) ?? []),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
});

// The meetings, for the week's deadlines, the dashboard and the bell.
const meetings = createStore(() => listRows('meetings'));

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
// The pages of this module also show deals and companies.
[store, meetings].forEach((item) => item.subscribe(notify));
deals.subscribe(notify);
portfolio.subscribe(notify);

// What was ticked in Мой день, kept in this browser: queue item id → the day.
const readQueueDone = (): Record<string, string> => {
   try {
      return JSON.parse(localStorage.getItem(QUEUE_DONE_KEY) ?? '{}') as Record<
         string,
         string
      >;
   } catch {
      return {};
   }
};

const findTask = (tasks: Task[], id: string) => {
   const task = tasks.find((item) => item.id === id);
   if (!task) throw new Error(`Task ${id} does not exist`);
   return task;
};

// A recurring task is not reopened: closing it creates the next one.
const nextOccurrence = (task: Task, today: string): Task => ({
   ...task,
   id: newId(),
   status: 'assigned',
   dueDate:
      task.dueDate && task.recurrence !== 'none'
         ? shiftMonths(task.dueDate, RECURRENCE_MONTHS[task.recurrence])
         : '',
   checklist: task.checklist.map((item) => ({
      ...item,
      id: newId(),
      done: false,
   })),
   createdAt: today,
   completedAt: null,
   history: [{ id: newId(), date: today, kind: 'recurred' }],
});

const insertTask = async (task: Task) => {
   await createRow('tasks', { guid: task.id, ...taskFields(task) });
   await Promise.all([
      ...task.checklist.map((item, index) =>
         createRow('task_checklist', checklistRow(task.id)(item, index)),
      ),
      ...task.history.map((event) =>
         createRow('task_events', eventRow(task.id, event)),
      ),
   ]);
};

// Writes what changed between two versions of a task.
const saveTask = async (before: Task, after: Task) => {
   const old = new Map(before.checklist.map((item) => [item.id, item]));
   const kept = new Set(after.checklist.map(({ id }) => id));
   const known = new Set(before.history.map(({ id }) => id));
   await Promise.all([
      updateRow('tasks', { guid: after.id, ...taskFields(after) }),
      ...after.checklist.map((item, index) => {
         const row = checklistRow(after.id)(item, index);
         const previous = old.get(item.id);
         if (!previous) return createRow('task_checklist', row);
         return previous.text !== item.text ||
            previous.done !== item.done ||
            before.checklist.indexOf(previous) !== index
            ? updateRow('task_checklist', row)
            : Promise.resolve();
      }),
      ...before.checklist
         .filter(({ id }) => !kept.has(id))
         .map(({ id }) => deleteRow('task_checklist', id)),
      ...after.history
         .filter(({ id }) => !known.has(id))
         .map((event) => createRow('task_events', eventRow(after.id, event))),
   ]);
};

// Applies a change to one task (and any tasks it adds), writes it, and undoes
// it if ucode refuses.
const change = async (
   id: string,
   apply: (task: Task) => Task,
   added: (task: Task) => Task[] = () => [],
) => {
   const tasks = await store.get();
   const before = findTask(tasks, id);
   const after = apply(before);
   const extra = added(after);
   store.set((current) => [
      ...extra,
      ...current.map((task) => (task.id === id ? after : task)),
   ]);
   try {
      await saveTask(before, after);
      await Promise.all(extra.map(insertTask));
   } catch (error) {
      await store.reload();
      throw error;
   }
   return after;
};

const queueOf = (all: Deal[], userId: string, today: string): QueueItem[] => {
   const soon = addWorkingDays(today, NEXT_STEP_DAYS);
   return all.flatMap((deal): QueueItem[] => {
      const base = {
         ownerId: userId,
         subject: deal.company,
         section: 'deals' as const,
         completedAt: null,
         dealId: deal.id,
      };
      const items: QueueItem[] = [];
      if (
         deal.status === 'review' &&
         !deal.ownerId &&
         deal.proposedOwnerId === userId
      )
         items.push({
            ...base,
            id: `inbox-${deal.id}`,
            kind: 'inbox',
            title: '',
            note: deal.number,
            dueDate: triageDue(deal),
         });
      if (deal.status !== 'active') return items;
      if (
         deal.ownerId === userId &&
         deal.next?.dueDate &&
         deal.next.dueDate <= soon
      )
         items.push({
            ...base,
            id: `next-${deal.id}-${deal.stage}`,
            kind: 'next',
            title: deal.next.title,
            note: deal.number,
            stage: deal.stage,
            dueDate: deal.next.dueDate,
         });
      if (deal.memo && !deal.memo.approvedAt && deal.memo.sponsorId === userId)
         items.push({
            ...base,
            id: `memo-${deal.id}-${deal.memo.version}`,
            kind: 'memo',
            title: '',
            note: String(deal.memo.version),
            dueDate: deal.next?.dueDate ?? '',
            decision: { preparedById: deal.memo.authorId, action: 'memo' },
         });
      if (
         deal.stage === 'screening' &&
         deal.screening &&
         !deal.screening.completedAt &&
         deal.screening.secondId === userId
      )
         items.push({
            ...base,
            id: `screening-${deal.id}`,
            kind: 'screening',
            title: '',
            note: deal.number,
            dueDate: deal.next?.dueDate ?? '',
            decision: { preparedById: deal.ownerId, action: 'decide' },
         });
      // what the founder sent from the startup cabinet waits for the owner's check
      if (deal.ownerId === userId) {
         const answered = (deal.requests ?? []).filter(
            ({ status }) => status === 'answered',
         );
         for (const request of answered)
            items.push({
               ...base,
               id: `answer-${request.id}`,
               kind: 'answer',
               title: request.title,
               note: deal.number,
               dueDate: '',
            });
         // the files of an answer come with it; the others on their own
         const covered = new Set(answered.map(({ id }) => id));
         for (const document of deal.documents ?? [])
            if (
               document.status === 'review' &&
               document.uploadedBy === 'applicant' &&
               !document.uploadedById &&
               !covered.has(document.requestId)
            )
               items.push({
                  ...base,
                  id: `document-${document.id}`,
                  kind: 'document',
                  title: document.title,
                  note: `v${document.version}`,
                  dueDate: '',
               });
      }
      return items;
   });
};

const BODY_NAMES: Record<string, string> = { ic: 'ИК', board: 'НС' };

class Work {
   // Calls the listener after every change to the data the pages show.
   subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
         listeners.delete(listener);
      };
   }

   async getEmployees(): Promise<Employee[]> {
      return TEAM;
   }

   async getTasks(): Promise<Task[]> {
      return store.get();
   }

   // Calls the listener after every change to the tasks only.
   subscribeTasks(listener: () => void) {
      return store.subscribe(listener);
   }

   // The deals and the companies a task can be attached to.
   async getTargets(): Promise<TaskTargets> {
      const [all, holdings] = await Promise.all([
         deals.getDeals(),
         portfolio.getState(),
      ]);
      return {
         deal: all.map(({ id, company }) => ({ id, name: company })),
         portfolio: holdings.companies.map(({ id, name }) => ({ id, name })),
      };
   }

   async createTask(
      input: TaskInput,
      userId: string,
      extra: Partial<
         Pick<Task, 'basis' | 'dueLabel' | 'origin' | 'decisionId'>
      > = {},
   ): Promise<Task> {
      await store.get();
      const today = todayISO();
      const task: Task = {
         ...input,
         id: newId(),
         basis: '',
         dueLabel: '',
         origin: 'manual',
         decisionId: '',
         ...extra,
         createdById: userId,
         createdAt: today,
         completedAt: statusGroup(input.status) === 'complete' ? today : null,
         history: [],
      };
      store.set((current) => [task, ...current]);
      try {
         await insertTask(task);
      } catch (error) {
         store.set((current) => current.filter(({ id }) => id !== task.id));
         throw error;
      }
      return task;
   }

   async updateTask(
      id: string,
      patch: Partial<TaskInput>,
      userId: string,
   ): Promise<Task> {
      const today = todayISO();
      let closedRecurring = false;
      return change(
         id,
         (current) => {
            const next: Task = { ...current, ...patch };
            if (next.relation === 'none') next.relationId = '';
            if (next.status === current.status) return next;
            closedRecurring = isDone(next) && next.recurrence !== 'none';
            const event: TaskEvent = {
               id: newId(),
               date: today,
               kind: 'status',
               status: next.status,
               userId,
            };
            return {
               ...next,
               history: [event, ...current.history],
               completedAt: isDone(next) ? today : null,
            };
         },
         (next) => (closedRecurring ? [nextOccurrence(next, today)] : []),
      );
   }

   async deleteTask(id: string): Promise<void> {
      const tasks = await store.get();
      const task = findTask(tasks, id);
      store.set((current) => current.filter((item) => item.id !== id));
      try {
         await Promise.all([
            ...task.checklist.map((item) =>
               deleteRow('task_checklist', item.id),
            ),
            ...task.history.map((event) => deleteRow('task_events', event.id)),
         ]);
         await deleteRow('tasks', id);
      } catch (error) {
         await store.reload();
         throw error;
      }
   }

   async toggleChecklistItem(taskId: string, itemId: string): Promise<void> {
      await change(taskId, (task) => ({
         ...task,
         checklist: task.checklist.map((item) =>
            item.id === itemId ? { ...item, done: !item.done } : item,
         ),
      }));
   }

   async addComment(taskId: string, text: string, userId: string) {
      const event: TaskEvent = {
         id: newId(),
         date: todayISO(),
         kind: 'comment',
         text,
         userId,
      };
      await change(taskId, (task) => ({
         ...task,
         history: [event, ...task.history],
      }));
   }

   // Reads the tasks again, after another section wrote to them.
   async reloadTasks() {
      await store.reload();
   }

   // Reads the meetings again, after Инвесткомитет changed them.
   async reloadMeetings() {
      await meetings.reload();
   }

   // What a person has to do that comes from the deals rather than the task list.
   async getQueue(userId: string): Promise<QueueItem[]> {
      const today = todayISO();
      const done = readQueueDone();
      const [all, holdings] = await Promise.all([
         deals.getDeals(),
         portfolio.getState(),
      ]);
      // a company's answer from the startup cabinet, for its owner to check
      const companyAnswers = holdings.dataRequests.flatMap(
         (request): QueueItem[] => {
            const company = holdings.companies.find(
               ({ id }) => id === request.companyId,
            );
            return request.status === 'answered' && company?.ownerId === userId
               ? [
                    {
                       id: `company-answer-${request.id}`,
                       kind: 'company_answer',
                       ownerId: userId,
                       subject: company.name,
                       section: 'portfolio',
                       title: request.title,
                       note: request.answeredBy,
                       dueDate: '',
                       completedAt: null,
                    },
                 ]
               : [];
         },
      );
      return [...queueOf(all, userId, today), ...companyAnswers].map((item) => ({
         ...item,
         completedAt: done[item.id] ?? null,
      }));
   }

   async setQueueItemDone(id: string, done: boolean): Promise<void> {
      const next = readQueueDone();
      if (done) next[id] = todayISO();
      else delete next[id];
      try {
         localStorage.setItem(QUEUE_DONE_KEY, JSON.stringify(next));
      } catch {
         // storage unavailable: the tick lasts until the page is reloaded
      }
      notify();
   }

   // Answers the person waits for: from applicants on their deals, from their
   // companies after the reporting deadline, from colleagues on tasks they check.
   async getWaiting(userId: string): Promise<WaitingItem[]> {
      const [all, holdings, tasks] = await Promise.all([
         deals.getDeals(),
         portfolio.getState(),
         store.get(),
      ]);
      const today = todayISO();
      const fromApplicants = all
         .filter((deal) => deal.ownerId === userId && deal.status === 'active')
         .flatMap((deal) =>
            (deal.requests ?? [])
               .filter(({ status }) => status === 'waiting')
               .map((request): WaitingItem => ({
                  id: `request-${request.id}`,
                  ownerId: userId,
                  from: deal.company,
                  source: 'applicant',
                  title: request.title,
                  when: 'until',
                  date: request.dueDate,
               })),
         );
      const { cycle } = holdings;
      const fromCompanies =
         cycle && cycle.due && cycle.due < today
            ? holdings.companies
                 .filter(
                    (company) =>
                       company.ownerId === userId &&
                       !hasAllDocs(company, cycle.quarter),
                 )
                 .map((company): WaitingItem => ({
                    id: `report-${company.id}-${cycle.quarter}`,
                    ownerId: userId,
                    from: company.name,
                    source: 'company',
                    title: cycle.quarter,
                    when: 'after',
                    date: cycle.due,
                 }))
            : [];
      // the fund's requests for data the companies have not answered yet
      const fromCompanyRequests = holdings.dataRequests.flatMap(
         (request): WaitingItem[] => {
            const company = holdings.companies.find(
               ({ id }) => id === request.companyId,
            );
            return request.status === 'waiting' && company?.ownerId === userId
               ? [
                    {
                       id: `data-${request.id}`,
                       ownerId: userId,
                       from: company.name,
                       source: 'company',
                       title: request.title,
                       when: 'until',
                       date: request.dueDate,
                    },
                 ]
               : [];
         },
      );
      const fromColleagues = tasks
         .filter(
            (task) =>
               task.status === 'waiting' &&
               (task.reviewerId === userId || task.createdById === userId) &&
               getAssigneeId(task) !== userId,
         )
         .map((task): WaitingItem => ({
            id: `task-${task.id}`,
            ownerId: userId,
            from: TEAM.find(({ id }) => id === getAssigneeId(task))?.name ?? '',
            source: 'colleague',
            title: task.title,
            when: 'since',
            date:
               task.history.find(
                  (event) =>
                     event.kind === 'status' && event.status === 'waiting',
               )?.date ?? task.createdAt,
         }));
      return [
         ...fromApplicants,
         ...fromCompanies,
         ...fromCompanyRequests,
         ...fromColleagues,
      ];
   }

   // The deals a person runs, the furthest along first.
   async getMyDeals(userId: string): Promise<MyDeal[]> {
      const all = await deals.getDeals();
      const keys = stageKeys();
      return all
         .filter((deal) => deal.status === 'active' && deal.ownerId === userId)
         .sort((a, b) => keys.indexOf(b.stage) - keys.indexOf(a.stage))
         .map((deal) => ({
            id: deal.id,
            company: deal.company,
            stage: deal.stage,
            stageDate: deal.committee?.date ?? '',
         }));
   }

   // The fund's deadlines: meetings, the deals' next steps, open tasks and the
   // quarterly reports. The page keeps the ones of its week.
   async getDeadlines(): Promise<WeekDeadline[]> {
      const [rows, all, tasks, holdings] = await Promise.all([
         meetings.get(),
         deals.getDeals(),
         store.get(),
         portfolio.getState(),
      ]);
      const fromMeetings = rows
         .filter((row) => row.date && str(row.status) !== 'held')
         .map((row): WeekDeadline => ({
            id: `meeting-${row.guid}`,
            kind: 'meeting',
            date: day(row.date),
            title: `${BODY_NAMES[str(row.body)] ?? 'ИК'} № ${str(row.number)}`,
            section: 'committee',
            note: [str(row.time), str(row.summary)].filter(Boolean).join(' · '),
            keyEvent: true,
         }));
      const fromDeals = all
         .filter((deal) => deal.status === 'active' && deal.next?.dueDate)
         .map((deal): WeekDeadline => ({
            id: `deal-${deal.id}`,
            kind: 'deal',
            date: deal.next?.dueDate ?? '',
            title: deal.company,
            section: 'deals',
            note: deal.next?.title ?? '',
            stage: deal.stage,
            keyEvent: false,
         }));
      const fromTasks = tasks
         .filter((task) => !isDone(task) && task.dueDate)
         .map((task): WeekDeadline => ({
            id: `task-${task.id}`,
            kind: 'task',
            date: task.dueDate,
            title: task.title,
            section: 'tasks',
            note: TEAM.find(({ id }) => id === getAssigneeId(task))?.name ?? '',
            keyEvent: false,
         }));
      const { cycle } = holdings;
      const fromReports: WeekDeadline[] =
         cycle?.due && holdings.companies.length
            ? [
                 {
                    id: `reports-${cycle.quarter}`,
                    kind: 'reports',
                    date: cycle.due,
                    title: cycle.quarter,
                    section: 'portfolio',
                    note: '',
                    keyEvent: false,
                 },
              ]
            : [];
      return [...fromMeetings, ...fromDeals, ...fromTasks, ...fromReports];
   }

   async getDashboard(): Promise<Dashboard> {
      const [all, holdings, meetingRows] = await Promise.all([
         deals.getDeals(),
         portfolio.getState(),
         meetings.get(),
      ]);
      const today = todayISO();
      const { cycle, companies } = holdings;
      const held = companies.filter(({ status }) => status === 'active');
      const exits = companies.filter(({ status }) => status === 'exit');

      const sectors = new Map<string, number>();
      for (const company of companies)
         if (company.invested > 0)
            sectors.set(
               company.industryKey,
               (sectors.get(company.industryKey) ?? 0) + company.invested,
            );

      // the committee's earliest meeting from today on that has not been held
      const next = meetingRows
         .filter(
            (item) =>
               str(item.body) !== 'board' &&
               item.date &&
               day(item.date) >= today &&
               str(item.status) !== 'held',
         )
         .sort((a, b) =>
            `${day(a.date)} ${str(a.time)}`.localeCompare(
               `${day(b.date)} ${str(b.time)}`,
            ),
         )[0];
      const nextMeeting: NextMeeting | null = next
         ? {
              id: next.guid,
              number: str(next.number),
              date: day(next.date),
              deals: all.filter(({ committee }) => committee?.id === next.guid)
                 .length,
           }
         : null;

      // a company's documents for the quarter count once its due date has passed
      const missingReports: AttentionItem[] =
         cycle?.due && cycle.due < today
            ? held
                 .filter((company) => !hasAllDocs(company, cycle.quarter))
                 .map((company) => ({
                    id: `report-${company.id}-${cycle.quarter}`,
                    kind: 'report',
                    subject: company.name,
                    companyId: company.id,
                    quarter: cycle.quarter,
                 }))
            : [];

      const active = all.filter(({ status }) => status === 'active');
      const atCommittee = (deal: Deal) =>
         COMMITTEE_STAGES.includes(deal.stage) || deal.stage === 'closing';
      const funnel: Record<FunnelGroup, number> = {
         new: all.filter(({ status }) => status === 'review').length,
         work: active.filter((deal) => !atCommittee(deal)).length,
         committee: active.filter(atCommittee).length,
         invested: held.length,
         rejected: all.filter(({ status }) => status === 'rejected').length,
         exit: exits.length,
      };

      return {
         deals: {
            inWork: funnel.new + active.length,
            applications: funnel.new,
         },
         portfolio: {
            companies: held.length,
            exits: exits.length,
            invested: companies.reduce(
               (sum, company) => sum + company.invested,
               0,
            ),
         },
         nextMeeting,
         funnel: FUNNEL_GROUPS.map((group) => ({
            group,
            count: funnel[group],
         })),
         industries: [...sectors]
            .map(([key, amount]) => ({ key, invested: amount }))
            .sort((a, b) => b.invested - a.invested),
         attention: [
            ...all.flatMap((deal) => attentionOf(deal, today)),
            ...missingReports,
         ].sort(
            (a, b) =>
               ATTENTION_ORDER.indexOf(a.kind) -
               ATTENTION_ORDER.indexOf(b.kind),
         ),
         recent: all
            .flatMap((deal) =>
               deal.journal.map((entry) => ({
                  dealId: deal.id,
                  company: deal.company,
                  entry,
               })),
            )
            .sort((a, b) => momentOf(b.entry).localeCompare(momentOf(a.entry)))
            .slice(0, RECENT_ACTIONS),
      };
   }

   // The bell's notifications: decisions waiting for the person, their tasks
   // past the deadline or newly given to them by somebody else, the
   // applications of the last two weeks and the committee's meeting of the
   // coming week.
   async getNotices(userId: string): Promise<Notice[]> {
      const [queue, tasks, all, meetingRows] = await Promise.all([
         this.getQueue(userId),
         store.get(),
         deals.getDeals(),
         meetings.get(),
      ]);
      const today = todayISO();
      const since = (days: number) =>
         dayjs(today).subtract(days, 'day').format(DATE_FORMAT);
      const mine = tasks.filter(
         (task) => !isDone(task) && getAssigneeId(task) === userId,
      );
      return [
         ...queue
            .filter((item) => item.decision && !item.completedAt)
            .map((item): Notice => ({
               id: `decision-${item.id}`,
               kind: 'decision',
               item,
            })),
         ...mine
            .filter((task) => task.dueDate && task.dueDate < today)
            .map((task): Notice => ({
               id: `overdue-${task.id}-${task.dueDate}`,
               kind: 'overdue',
               taskId: task.id,
               title: task.title,
               dueDate: task.dueDate,
            })),
         ...mine
            .filter(
               (task) =>
                  task.createdById &&
                  task.createdById !== userId &&
                  task.createdAt >= since(NOTICE_TASK_DAYS),
            )
            .map((task): Notice => ({
               id: `assigned-${task.id}`,
               kind: 'assigned',
               taskId: task.id,
               title: task.title,
               fromId: task.createdById,
            })),
         ...all
            .filter(
               (deal) =>
                  deal.status === 'review' &&
                  deal.receivedAt.slice(0, 10) >=
                     since(NOTICE_APPLICATION_DAYS),
            )
            .map((deal): Notice => ({
               id: `application-${deal.id}`,
               kind: 'application',
               dealId: deal.id,
               company: deal.company,
               date: deal.receivedAt.slice(0, 10),
            })),
         ...meetingRows
            .filter(
               (item) =>
                  str(item.body) !== 'board' &&
                  str(item.status) === 'planned' &&
                  day(item.date) >= today &&
                  daysUntil(day(item.date), today) <= NOTICE_MEETING_DAYS,
            )
            .map((item): Notice => ({
               id: `meeting-${item.guid}`,
               kind: 'meeting',
               meetingId: item.guid,
               number: str(item.number),
               date: day(item.date),
            })),
      ];
   }

   async getCounters(userId: string): Promise<SectionCounters> {
      const [tasks, queue, all, holdings] = await Promise.all([
         store.get(),
         this.getQueue(userId),
         deals.getDeals(),
         portfolio.getState(),
      ]);
      return {
         myDay:
            queue.filter((item) => !item.completedAt).length +
            tasks.filter((task) => needsAction(task, userId)).length,
         tasks: tasks.filter((task) => !isDone(task) && isMine(task, userId))
            .length,
         // applications nobody has taken yet
         deals: all.filter((deal) => deal.status === 'review').length,
         // requests waiting for the fund's answer
         portfolio: holdings.requests.filter(
            ({ status }) => status === 'waiting_fund',
         ).length,
      };
   }
}

export default new Work();

import { STAGES } from '@modules/Deals/constants';
import { getDeadline, isLate, triageDue } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { hasAllDocs } from '@modules/Portfolio/helpers';
import portfolio from '@modules/Portfolio/services';
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
import { addWorkingDays, createStore, newId } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import type {
   ChecklistItem,
   Employee,
   FundOverview,
   MyDeal,
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
import { RECURRENCE_MONTHS } from '../constants';
import {
   getAssigneeId,
   isDone,
   isMine,
   needsAction,
   shiftMonths,
   todayISO,
} from '../helpers';

/* Работа in ucode (docs/ucode-migration.md, batch 5): tasks with their
   task_checklist and task_events rows. Мой день, the week's deadlines, the
   overview and the sidebar counters have no tables of their own: they are
   counted from the deals, the portfolio, the meetings and the tasks
   (docs/ERP.md §5.7). The money of the overview is the one row of fund_money,
   kept by the chief accountant until Финансы are connected (§4.8). */

const QUEUE_DONE_KEY = 'sqbv_dashboard_queue_done';
const NEXT_STEP_DAYS = 5; // a deal's next step this close comes to Мой день

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
   type: (str(row.type) || 'other') as Task['type'],
   context: str(row.context),
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
   context: task.context,
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

// The meetings for the week's deadlines and the fund_money row for the overview.
const meetings = createStore(() => listRows('meetings'));
const money = createStore(
   async () => (await listRows('fund_money'))[0] ?? null,
);

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
// The pages of this module also show deals and companies.
[store, meetings, money].forEach((item) => item.subscribe(notify));
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
         completedAt: input.status === 'done' ? today : null,
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
      return queueOf(await deals.getDeals(), userId, today).map((item) => ({
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
      return [...fromApplicants, ...fromCompanies, ...fromColleagues];
   }

   // The deals a person runs, the furthest along first.
   async getMyDeals(userId: string): Promise<MyDeal[]> {
      const all = await deals.getDeals();
      return all
         .filter((deal) => deal.status === 'active' && deal.ownerId === userId)
         .sort((a, b) => STAGES.indexOf(b.stage) - STAGES.indexOf(a.stage))
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

   async getFundOverview(): Promise<FundOverview> {
      const [all, row, holdings] = await Promise.all([
         deals.getDeals(),
         money.get(),
         portfolio.getState(),
      ]);
      const { cycle } = holdings;
      const invested = holdings.companies.reduce(
         (sum, company) => sum + company.invested,
         0,
      );
      return {
         updatedAt: dayjs().format('HH:mm'),
         // money free for deals: on the accounts, less approved payments,
         // the follow-on reserve and the operating budget
         money: row && {
            onAccounts: num(row.on_accounts),
            capital: num(row.capital),
            plan: {
               year: num(row.plan_year) || dayjs().year(),
               amount: num(row.plan_direct_deals),
               invested,
               approved: num(row.approved_unpaid),
            },
            parts: [
               {
                  part: 'free',
                  amount: Math.max(
                     0,
                     num(row.on_accounts) -
                        num(row.approved_unpaid) -
                        num(row.follow_on_reserve) -
                        num(row.operating_left),
                  ),
                  note: '',
               },
               {
                  part: 'approved',
                  amount: num(row.approved_unpaid),
                  note: str(row.approved_note),
               },
               {
                  part: 'reserve',
                  amount: num(row.follow_on_reserve),
                  note: str(row.follow_on_note),
               },
               {
                  part: 'operating',
                  amount: num(row.operating_left),
                  note: str(row.operating_note),
               },
            ],
         },
         portfolio: {
            quarter: cycle ? Number(cycle.quarter.slice(-1)) || null : null,
            reportsDue: cycle?.due ?? '',
            requestedAt: cycle?.requestedAt ?? '',
            companies: holdings.companies.map((company) => ({
               id: company.id,
               name: company.name,
               invested: company.invested,
               reportReceived: cycle
                  ? hasAllDocs(company, cycle.quarter)
                  : false,
               nextStep: company.now,
            })),
         },
         // incoming applications, then the deals in work on each stage
         funnel: STAGES.map((stage) => {
            const group = all.filter((deal) =>
               stage === 'inbox'
                  ? deal.status === 'review'
                  : deal.status === 'active' && deal.stage === stage,
            );
            return {
               stage,
               count: group.length,
               overdue: group.filter((deal) =>
                  stage === 'inbox'
                     ? isLate(deal)
                     : getDeadline(deal).kind === 'overdue',
               ).length,
            };
         }),
      };
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

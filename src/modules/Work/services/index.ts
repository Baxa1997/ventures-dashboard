import { STAGES } from '@modules/Deals/constants';
import { getDeadline, isLate } from '@modules/Deals/helpers';
import correspondence, { FUND_TURN } from '@modules/Correspondence/services';
import deals from '@modules/Deals/services';
import { moneyParts } from '@modules/Finance/helpers';
import finance from '@modules/Finance/services';
import { hasAllDocs } from '@modules/Portfolio/helpers';
import portfolio from '@modules/Portfolio/services';
import { TEAM } from '@shared/constants';
import type {
   Employee,
   FundOverview,
   MyDeal,
   QueueItem,
   SectionCounters,
   Task,
   TaskEvent,
   TaskInput,
   WaitingItem,
   WeekDeadline,
} from '@shared/types/work.types';
import { RECURRENCE_MONTHS } from '../constants';
import { isDone, isMine, needsAction, shiftMonths, todayISO } from '../helpers';
import {
   SAMPLE_COUNTERS,
   SAMPLE_DEADLINES,
   SAMPLE_FUND,
   SAMPLE_QUEUE,
   SAMPLE_TASKS,
   SAMPLE_WAITING,
} from './sample';

/* There is no backend yet. Everything starts from the sample data in ./sample;
   what a person changes (tasks, ticked items) is kept in this browser's
   localStorage. Every method returns a promise, so the bodies can be replaced
   with API calls without changing the hooks that call them. */

const STORAGE_KEY = 'sqbv_dashboard_work_v2';

interface Stored {
   tasks: Task[];
   queueDone: Record<string, string>; // queue item id → the day it was ticked
}

// Kept in memory as well, so the pages still work when storage is unavailable.
let cache: Stored | null = null;

const listeners = new Set<() => void>();

const read = (): Stored => {
   if (cache) return cache;
   try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
         cache = JSON.parse(stored) as Stored;
         return cache;
      }
   } catch {
      // storage unavailable or unreadable: start from the sample data
   }
   cache = { tasks: SAMPLE_TASKS, queueDone: {} };
   return cache;
};

const write = (next: Stored) => {
   cache = next;
   try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
   } catch {
      // storage unavailable: changes last until the page is reloaded
   }
   listeners.forEach((listener) => listener());
};

// The pages of this module also show deals, and the sidebar counts letters,
// so they follow those changes too.
deals.subscribe(() => listeners.forEach((listener) => listener()));
correspondence.subscribe(() => listeners.forEach((listener) => listener()));
finance.subscribe(() => listeners.forEach((listener) => listener()));
portfolio.subscribe(() => listeners.forEach((listener) => listener()));

const newId = () => crypto.randomUUID();

const findTask = (tasks: Task[], id: string) => {
   const task = tasks.find((item) => item.id === id);
   if (!task) throw new Error(`Task ${id} does not exist`);
   return task;
};

const replaceTask = (state: Stored, next: Task, added: Task[] = []) =>
   write({
      ...state,
      tasks: [
         ...added,
         ...state.tasks.map((task) => (task.id === next.id ? next : task)),
      ],
   });

// A recurring task is not reopened: closing it creates the next one.
const nextOccurrence = (task: Task, today: string): Task => ({
   ...task,
   id: newId(),
   status: 'assigned',
   dueDate:
      task.dueDate && task.recurrence !== 'none'
         ? shiftMonths(task.dueDate, RECURRENCE_MONTHS[task.recurrence])
         : '',
   checklist: task.checklist.map((item) => ({ ...item, done: false })),
   createdAt: today,
   completedAt: null,
   history: [{ id: newId(), date: today, kind: 'recurred' }],
});

class Work {
   // Calls the listener after every change to the stored data.
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
      return read().tasks;
   }

   async createTask(input: TaskInput): Promise<Task> {
      const state = read();
      const today = todayISO();
      const task: Task = {
         ...input,
         id: newId(),
         basis: '',
         createdAt: today,
         completedAt: input.status === 'done' ? today : null,
         history: [],
      };
      write({ ...state, tasks: [task, ...state.tasks] });
      return task;
   }

   async updateTask(
      id: string,
      patch: Partial<TaskInput>,
      userId: string,
   ): Promise<Task> {
      const state = read();
      const current = findTask(state.tasks, id);
      const today = todayISO();
      const next: Task = { ...current, ...patch };
      const added: Task[] = [];
      if (next.status !== current.status) {
         const event: TaskEvent = {
            id: newId(),
            date: today,
            kind: 'status',
            status: next.status,
            userId,
         };
         next.history = [event, ...current.history];
         next.completedAt = isDone(next) ? today : null;
         if (isDone(next) && next.recurrence !== 'none')
            added.push(nextOccurrence(next, today));
      }
      replaceTask(state, next, added);
      return next;
   }

   async deleteTask(id: string): Promise<void> {
      const state = read();
      write({ ...state, tasks: state.tasks.filter((task) => task.id !== id) });
   }

   async toggleChecklistItem(taskId: string, itemId: string): Promise<void> {
      const state = read();
      const task = findTask(state.tasks, taskId);
      replaceTask(state, {
         ...task,
         checklist: task.checklist.map((item) =>
            item.id === itemId ? { ...item, done: !item.done } : item,
         ),
      });
   }

   async addComment(taskId: string, text: string, userId: string) {
      const state = read();
      const task = findTask(state.tasks, taskId);
      const event: TaskEvent = {
         id: newId(),
         date: todayISO(),
         kind: 'comment',
         text,
         userId,
      };
      replaceTask(state, { ...task, history: [event, ...task.history] });
   }

   // What a person has to do that does not come from the task list.
   async getQueue(userId: string): Promise<QueueItem[]> {
      const { queueDone } = read();
      return SAMPLE_QUEUE.filter((item) => item.ownerId === userId).map(
         (item) => ({ ...item, completedAt: queueDone[item.id] ?? null }),
      );
   }

   async setQueueItemDone(id: string, done: boolean): Promise<void> {
      const state = read();
      const queueDone = { ...state.queueDone };
      if (done) queueDone[id] = todayISO();
      else delete queueDone[id];
      write({ ...state, queueDone });
   }

   async getWaiting(userId: string): Promise<WaitingItem[]> {
      return SAMPLE_WAITING.filter((item) => item.ownerId === userId);
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

   async getDeadlines(): Promise<WeekDeadline[]> {
      return SAMPLE_DEADLINES;
   }

   async getFundOverview(): Promise<FundOverview> {
      const [all, money, holdings] = await Promise.all([
         deals.getDeals(),
         finance.getState(),
         portfolio.getState(),
      ]);
      const parts = moneyParts(money);
      const open = money.payments.filter(({ status }) => status !== 'paid');
      const note = (part: string) =>
         SAMPLE_FUND.money.parts.find((item) => item.part === part)?.note ?? '';
      const { cycle } = holdings;
      return {
         ...SAMPLE_FUND,
         // the money and the portfolio as Финансы and Портфель count them
         money: {
            onAccounts: parts.onAccounts,
            capital: money.capital,
            plan: {
               year: money.plan.year,
               amount: money.plan.directDeals,
               invested: holdings.companies.reduce(
                  (sum, { invested }) => sum + invested,
                  0,
               ),
               approved: parts.approved,
            },
            parts: [
               { part: 'free', amount: parts.free, note: note('free') },
               {
                  part: 'approved',
                  amount: parts.approved,
                  note: open
                     .map(
                        ({ title, amount }) =>
                           `${title.split(' (')[0].replace(' · ', ' ')} $${amount / 1000}K`,
                     )
                     .join(' · '),
               },
               {
                  part: 'reserve',
                  amount: parts.reserve,
                  note: money.reserves
                     .map(({ title, note: text }) => `${title} — ${text}`)
                     .join('; '),
               },
               {
                  part: 'operating',
                  amount: parts.operating,
                  note: note('operating'),
               },
            ],
         },
         portfolio: {
            quarter: Number(cycle.quarter.slice(-1)),
            reportsDue: cycle.due,
            requestedAt: cycle.requestedAt,
            companies: holdings.companies.map((company) => {
               const report = company.reports[cycle.quarter];
               const sample = SAMPLE_FUND.portfolio.companies.find(
                  ({ name }) => name === company.name,
               );
               return {
                  id: company.id,
                  name: company.name,
                  invested: company.invested,
                  reportReceived: hasAllDocs(company, cycle.quarter),
                  // the figures to enter while the report waits for its check
                  nextStep:
                     report?.metrics === 'check'
                        ? 'Внести показатели в дашборд'
                        : sample?.nextStep === 'Внести показатели в дашборд'
                          ? company.now
                          : (sample?.nextStep ?? company.now),
               };
            }),
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
      const { tasks, queueDone } = read();
      const { letters } = await correspondence.getState();
      const queue = SAMPLE_QUEUE.filter(
         (item) => item.ownerId === userId && !queueDone[item.id],
      );
      return {
         ...SAMPLE_COUNTERS,
         // the letters where the next move is the fund's
         correspondence: letters.filter(({ status }) =>
            FUND_TURN.includes(status),
         ).length,
         myDay:
            queue.length +
            tasks.filter((task) => needsAction(task, userId)).length,
         tasks: tasks.filter((task) => !isDone(task) && isMine(task, userId))
            .length,
      };
   }
}

export default new Work();

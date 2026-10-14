import { addWorkingDays, todayISO } from '@shared/helpers';
import type {
   Criterion,
   Deal,
   DealsSummary,
   DealStatus,
   JournalEntry,
   NewDealInput,
   Recommendation,
   RejectInput,
   RequestInput,
   Screening,
   ScreeningNoteKey,
} from '@shared/types/deals.types';
import type { DealStage } from '@shared/types/work.types';
import dayjs from 'dayjs';
import { CRITERIA, STAGE_NORMS } from '../constants';
import { nextStageOf } from '../helpers';
import { SAMPLE_DEALS, SAMPLE_SUMMARY } from './sample';

/* There is no backend yet. Everything starts from the sample data in ./sample;
   what a person changes is kept in this browser's localStorage. Every method
   returns a promise, so the bodies can be replaced with API calls without
   changing the hooks that call them. The register's figures cover deals that
   are not in the sample, so they are stored and adjusted with each change. */

const STORAGE_KEY = 'sqbv_dashboard_deals_v1';

interface Stored {
   deals: Deal[];
   summary: DealsSummary;
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
   cache = { deals: SAMPLE_DEALS, summary: SAMPLE_SUMMARY };
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

const newId = () => crypto.randomUUID();

const nowTime = () => dayjs().format('HH:mm');

type EntryInput = JournalEntry extends infer E
   ? E extends JournalEntry
      ? Omit<E, 'id' | 'date'>
      : never
   : never;

const entry = (input: EntryInput): JournalEntry =>
   ({ id: newId(), date: todayISO(), ...input }) as JournalEntry;

// Applies a change to one deal and, when given, to the register's figures.
const change = (
   id: string,
   apply: (deal: Deal) => Deal,
   adjust?: (summary: DealsSummary, before: Deal) => DealsSummary,
) => {
   const state = read();
   const before = state.deals.find((deal) => deal.id === id);
   if (!before) throw new Error(`Deal ${id} does not exist`);
   const after = apply(before);
   write({
      deals: state.deals.map((deal) => (deal.id === id ? after : deal)),
      summary: adjust ? adjust(state.summary, before) : state.summary,
   });
   return after;
};

const logged = (deal: Deal, input: EntryInput): Deal => ({
   ...deal,
   journal: [entry(input), ...deal.journal],
});

const moveStatus = (
   summary: DealsSummary,
   from: DealStatus,
   to: DealStatus,
): DealsSummary => ({
   ...summary,
   byStatus: {
      ...summary.byStatus,
      [from]: summary.byStatus[from] - 1,
      [to]: summary.byStatus[to] + 1,
   },
});

const reach = (
   summary: DealsSummary,
   step: DealsSummary['reached'][number]['step'],
): DealsSummary => ({
   ...summary,
   reached: summary.reached.map((item) =>
      item.step === step ? { ...item, count: item.count + 1 } : item,
   ),
});

// The state of a deal that has just entered a stage.
const onStage = (deal: Deal, stage: DealStage): Deal => {
   const norm = STAGE_NORMS[stage];
   return {
      ...deal,
      status: 'active',
      stage,
      waiting: false,
      days: norm ? { used: 0, norm } : null,
      // the wording of the next step comes from the stage
      next: { title: '', dueDate: addWorkingDays(todayISO(), norm ?? 5) },
      exit: undefined,
      committee: undefined,
   };
};

const emptyScreening = (): Screening => ({
   criteria: CRITERIA.map(({ key }) => ({
      key,
      score: null,
      rationale: '',
      source: '',
   })),
   decision: 'meeting',
   secondId: '',
   savedAt: '',
   note: { essence: '', whyNow: '', redFlags: '', questions: '' },
   completedAt: null,
});

const slug = (company: string, taken: string[]) => {
   const base =
      company
         .toLowerCase()
         .replace(/[^a-z0-9]+/g, '-')
         .replace(/^-|-$/g, '') || 'deal';
   let id = base;
   for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
   return id;
};

// SQBV-2026-0173: the year and the next free number in it.
const nextNumber = (deals: Deal[], year: string) => {
   const prefix = `SQBV-${year}-`;
   const last = Math.max(
      0,
      ...deals
         .filter(({ number }) => number.startsWith(prefix))
         .map(({ number }) => Number(number.slice(prefix.length))),
   );
   return `${prefix}${String(last + 1).padStart(4, '0')}`;
};

class Deals {
   // Calls the listener after every change to the stored data.
   subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
         listeners.delete(listener);
      };
   }

   async getDeals(): Promise<Deal[]> {
      return read().deals;
   }

   async getSummary(): Promise<DealsSummary> {
      return read().summary;
   }

   // An application entered by hand goes to the incoming ones.
   async createDeal(input: NewDealInput, userId: string): Promise<Deal> {
      const state = read();
      const today = todayISO();
      const deal: Deal = {
         ...input,
         id: slug(
            input.company,
            state.deals.map(({ id }) => id),
         ),
         number: nextNumber(state.deals, today.slice(0, 4)),
         tags: '',
         receivedAt: `${today} ${nowTime()}`,
         status: 'review',
         stage: 'inbox',
         ownerId: '',
         proposedOwnerId: userId,
         days: null,
         waiting: false,
         next: null,
         journal: [entry({ kind: 'created', userId })],
      };
      const summary = reach(state.summary, 'received');
      write({
         deals: [deal, ...state.deals],
         summary: {
            ...summary,
            total: summary.total + 1,
            byStatus: {
               ...summary.byStatus,
               review: summary.byStatus.review + 1,
            },
         },
      });
      return deal;
   }

   async takeToScreening(id: string, ownerId: string) {
      change(
         id,
         (deal) =>
            logged(
               {
                  ...onStage(deal, 'screening'),
                  ownerId,
                  screening: deal.screening ?? emptyScreening(),
               },
               { kind: 'taken', userId: ownerId },
            ),
         (summary) =>
            reach(moveStatus(summary, 'review', 'active'), 'screening'),
      );
   }

   async rejectDeal(id: string, input: RejectInput, userId: string) {
      change(
         id,
         (deal) =>
            logged(
               {
                  ...deal,
                  status: 'rejected',
                  waiting: false,
                  days: null,
                  next: null,
                  ownerId: deal.ownerId || userId,
                  closed: {
                     reason: input.reason,
                     note: input.comment,
                     date: todayISO(),
                     letter: input.letter,
                     resubmit: input.resubmit,
                  },
               },
               { kind: 'rejected', reason: input.reason, userId },
            ),
         (summary, before) => ({
            ...moveStatus(summary, before.status, 'rejected'),
            reasons: {
               ...summary.reasons,
               [input.reason]: summary.reasons[input.reason] + 1,
            },
         }),
      );
   }

   // Moves a deal to the next stage; after "Закрытие" it joins the portfolio.
   async transferDeal(id: string) {
      change(
         id,
         (deal) => {
            const stage = nextStageOf(deal.stage);
            const screening =
               deal.stage === 'screening' && deal.screening
                  ? { ...deal.screening, completedAt: todayISO() }
                  : deal.screening;
            return stage
               ? logged(
                    { ...onStage(deal, stage), screening },
                    { kind: 'stage', stage },
                 )
               : logged(
                    {
                       ...deal,
                       status: 'portfolio',
                       days: null,
                       next: null,
                       waiting: false,
                    },
                    { kind: 'stage', stage: 'portfolio' },
                 );
         },
         (summary, before) => {
            const stage = nextStageOf(before.stage);
            return stage
               ? reach(summary, stage)
               : reach(moveStatus(summary, 'active', 'portfolio'), 'portfolio');
         },
      );
   }

   private updateScreening(id: string, apply: (value: Screening) => Screening) {
      change(id, (deal) => ({
         ...deal,
         screening: {
            ...apply(deal.screening ?? emptyScreening()),
            savedAt: nowTime(),
         },
      }));
   }

   async setCriterion(id: string, key: string, patch: Partial<Criterion>) {
      this.updateScreening(id, (screening) => ({
         ...screening,
         criteria: screening.criteria.map((item) =>
            item.key === key ? { ...item, ...patch } : item,
         ),
      }));
   }

   async setScreening(
      id: string,
      patch: Partial<Pick<Screening, 'decision' | 'secondId'>>,
   ) {
      this.updateScreening(id, (screening) => ({ ...screening, ...patch }));
   }

   async setScreeningNote(id: string, note: Record<ScreeningNoteKey, string>) {
      this.updateScreening(id, (screening) => ({ ...screening, note }));
   }

   // Closes the screening with an invitation to a meeting.
   async completeScreening(id: string, userId: string) {
      change(
         id,
         (deal) =>
            logged(
               logged(
                  {
                     ...onStage(deal, 'meeting'),
                     screening: deal.screening && {
                        ...deal.screening,
                        completedAt: todayISO(),
                     },
                  },
                  { kind: 'screening', userId },
               ),
               { kind: 'stage', stage: 'meeting' },
            ),
         (summary) => reach(summary, 'meeting'),
      );
   }

   // A request to the applicant stops the stage clock until it is answered.
   async addRequest(id: string, input: RequestInput, userId: string) {
      const today = todayISO();
      change(id, (deal) =>
         logged(
            {
               ...deal,
               waiting: true,
               clock: deal.clock ?? { pausedDays: 0, pausedSince: today },
               requests: [
                  {
                     id: newId(),
                     title: input.title,
                     text: input.text,
                     byId: userId,
                     sentAt: today,
                     dueDate: input.dueDate,
                     status: 'waiting',
                     closedAt: '',
                     detail: '',
                     warning: '',
                  },
                  ...(deal.requests ?? []),
               ],
               totals: deal.totals?.requests
                  ? { ...deal.totals, requests: deal.totals.requests + 1 }
                  : deal.totals,
               exit: deal.exit?.map((item) =>
                  input.ddQuestionnaire &&
                  item.fulfilledBy === 'dd_questionnaire'
                     ? { ...item, state: 'done', note: '' }
                     : item,
               ),
            },
            { kind: 'request', title: input.title, userId },
         ),
      );
   }

   async reviewDocument(
      id: string,
      documentId: string,
      accepted: boolean,
      reason: string,
      userId: string,
   ) {
      const result = accepted ? 'accepted' : 'rejected';
      change(id, (deal) => {
         const title =
            deal.documents?.find((item) => item.id === documentId)?.title ?? '';
         return logged(
            {
               ...deal,
               documents: deal.documents?.map((item) =>
                  item.id === documentId
                     ? {
                          ...item,
                          status: result,
                          handled: {
                             kind: result,
                             byId: userId,
                             at: `${todayISO()} ${nowTime()}`,
                             reason,
                          },
                       }
                     : item,
               ),
            },
            { kind: 'document', title, result, userId },
         );
      });
   }

   // Records a file the fund adds itself. Only its name is kept: there is no
   // file storage yet.
   async uploadDocument(id: string, title: string, userId: string) {
      change(id, (deal) =>
         logged(
            {
               ...deal,
               documents: [
                  {
                     id: newId(),
                     title,
                     status: 'accepted',
                     version: 1,
                     detail: '',
                     handled: {
                        kind: 'uploaded',
                        byId: userId,
                        at: `${todayISO()} ${nowTime()}`,
                        reason: '',
                     },
                  },
                  ...(deal.documents ?? []),
               ],
            },
            { kind: 'document', title, result: 'uploaded', userId },
         ),
      );
   }

   async setRecommendation(id: string, recommendation: Recommendation) {
      change(id, (deal) => ({
         ...deal,
         memo: deal.memo && { ...deal.memo, recommendation },
      }));
   }

   async approveMemo(id: string, userId: string) {
      change(id, (deal) =>
         logged(
            {
               ...deal,
               memo: deal.memo && { ...deal.memo, approvedAt: todayISO() },
            },
            { kind: 'memo', userId },
         ),
      );
   }

   async addWorkstream(
      id: string,
      input: { name: string; executor: string; dueDate: string },
   ) {
      change(id, (deal) =>
         logged(
            {
               ...deal,
               workstreams: [
                  ...(deal.workstreams ?? []),
                  {
                     id: newId(),
                     ...input,
                     handedAt: '',
                     status: 'not_started',
                     conclusion: '',
                  },
               ],
            },
            { kind: 'workstream', name: input.name, handed: false },
         ),
      );
   }

   async handOverWorkstream(id: string, workstreamId: string, executor: string) {
      change(id, (deal) => {
         const name =
            deal.workstreams?.find((item) => item.id === workstreamId)?.name ??
            '';
         return logged(
            {
               ...deal,
               workstreams: deal.workstreams?.map((item) =>
                  item.id === workstreamId
                     ? {
                          ...item,
                          executor,
                          handedAt: todayISO(),
                          status: 'in_progress',
                       }
                     : item,
               ),
            },
            { kind: 'workstream', name, handed: true },
         );
      });
   }
}

export default new Deals();

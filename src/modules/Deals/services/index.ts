import settings from '@modules/Settings/services';
import { addWorkingDays, createStore, newId, todayISO } from '@shared/helpers';
import type {
   Criterion,
   Deal,
   DealsSummary,
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
import { CRITERIA } from '../constants';
import { nextStageOf, stageNorm } from '../helpers';
import { insertDeal, loadDeals, saveDeal, summarize } from './ucode';

/* The deals come from ucode's tables, applications from the website among
   them (./ucode). Each change is worked out here, then written to ucode; if
   ucode refuses it, the change is undone and the error goes to the page. The
   register's figures are counted from the deals. Deadlines and the mandate
   check follow Настройки, which are read before the deals. */

const store = createStore(async () => {
   await settings.getSettings();
   return loadDeals();
});

// Deadlines and the mandate check follow the rules in Настройки.
settings.subscribe(store.notify);

const nowTime = () => dayjs().format('HH:mm');

type EntryInput = JournalEntry extends infer E
   ? E extends JournalEntry
      ? Omit<E, 'id' | 'date'>
      : never
   : never;

const entry = (input: EntryInput): JournalEntry =>
   ({ id: newId(), date: todayISO(), ...input }) as JournalEntry;

const replace = (deals: Deal[], next: Deal) =>
   deals.map((deal) => (deal.id === next.id ? next : deal));

// Applies a change to one deal and writes it to ucode; undoes it if ucode
// refuses.
const change = async (id: string, apply: (deal: Deal) => Deal) => {
   const deals = await store.get();
   const before = deals.find((deal) => deal.id === id);
   if (!before) throw new Error(`Deal ${id} does not exist`);
   const after = apply(before);
   store.set((current) => replace(current, after));
   try {
      await saveDeal(before, after);
   } catch (error) {
      store.set((current) => replace(current, before));
      throw error;
   }
   return after;
};

const logged = (deal: Deal, input: EntryInput): Deal => ({
   ...deal,
   journal: [entry(input), ...deal.journal],
});

// The state of a deal that has just entered a stage.
const onStage = (deal: Deal, stage: DealStage): Deal => {
   const norm = stageNorm(stage);
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
   // Calls the listener after every change to the deals.
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   async getDeals(): Promise<Deal[]> {
      return store.get();
   }

   async getSummary(): Promise<DealsSummary> {
      return summarize(await store.get());
   }

   // Reads the deals again, after another section wrote to their rows.
   async reload() {
      await store.reload();
   }

   // An application entered by hand goes to the incoming ones.
   async createDeal(input: NewDealInput, userId: string): Promise<Deal> {
      const deals = await store.get();
      const today = todayISO();
      const deal: Deal = {
         ...input,
         id: newId(),
         number: nextNumber(deals, today.slice(0, 4)),
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
      store.set((current) => [deal, ...current]);
      try {
         await insertDeal(deal);
      } catch (error) {
         store.set((current) => current.filter(({ id }) => id !== deal.id));
         throw error;
      }
      return deal;
   }

   async takeToScreening(id: string, ownerId: string) {
      await change(id, (deal) =>
         logged(
            {
               ...onStage(deal, 'screening'),
               ownerId,
               screening: deal.screening ?? emptyScreening(),
            },
            { kind: 'taken', userId: ownerId },
         ),
      );
   }

   async rejectDeal(id: string, input: RejectInput, userId: string) {
      await change(id, (deal) =>
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
      );
   }

   // Moves a deal to the next stage; after "Закрытие" it joins the portfolio.
   async transferDeal(id: string) {
      await change(id, (deal) => {
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
      });
   }

   private async updateScreening(
      id: string,
      apply: (value: Screening) => Screening,
   ) {
      await change(id, (deal) => ({
         ...deal,
         screening: {
            ...apply(deal.screening ?? emptyScreening()),
            savedAt: nowTime(),
         },
      }));
   }

   async setCriterion(id: string, key: string, patch: Partial<Criterion>) {
      await this.updateScreening(id, (screening) => ({
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
      await this.updateScreening(id, (screening) => ({
         ...screening,
         ...patch,
      }));
   }

   async setScreeningNote(id: string, note: Record<ScreeningNoteKey, string>) {
      await this.updateScreening(id, (screening) => ({ ...screening, note }));
   }

   // Closes the screening with an invitation to a meeting.
   async completeScreening(id: string, userId: string) {
      await change(id, (deal) =>
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
      );
   }

   // A request to the applicant stops the stage clock until it is answered.
   async addRequest(id: string, input: RequestInput, userId: string) {
      const today = todayISO();
      await change(id, (deal) =>
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
      await change(id, (deal) => {
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
      await change(id, (deal) =>
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
      await change(id, (deal) => ({
         ...deal,
         memo: deal.memo && { ...deal.memo, recommendation },
      }));
   }

   async approveMemo(id: string, userId: string) {
      await change(id, (deal) =>
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
      await change(id, (deal) =>
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

   async handOverWorkstream(
      id: string,
      workstreamId: string,
      executor: string,
   ) {
      await change(id, (deal) => {
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

import portfolio from '@modules/Portfolio/services';
import settings from '@modules/Settings/services';
import { deleteFile, type StoredFile, uploadFile } from '@shared/api/ucode';
import { addWorkingDays, createStore, newId, todayISO } from '@shared/helpers';
import attachments from '@shared/services/attachments';
import type {
   Criterion,
   Deal,
   DealDocument,
   DealFolder,
   DealsSummary,
   DealTerms,
   Fact,
   JournalEntry,
   NewDealInput,
   Recommendation,
   RejectInput,
   RequestInput,
   Risk,
   Screening,
   ScreeningNoteKey,
   StageRecord,
   TeamMember,
   Workstream,
} from '@shared/types/deals.types';
import type { Investment } from '@shared/types/portfolio.types';
import type { DealStage } from '@shared/types/work.types';
import dayjs from 'dayjs';
import { CRITERIA } from '../constants';
import { countryText, industryText, nextStageOf, stageNorm } from '../helpers';
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

// The version a new file of this title gets in the data room.
const nextVersion = (deal: Deal, title: string) =>
   Math.max(
      0,
      ...(deal.documents ?? [])
         .filter((item) => item.title === title)
         .map((item) => item.version),
   ) + 1;

// A file's name without its extension, as a document's title.
const titleOf = (name: string) => name.replace(/\.[^.]+$/, '') || name;

// The folders inside a folder, at any depth.
const inside = (folders: DealFolder[], folderId: string): string[] => {
   const children = folders.filter((item) => item.parentId === folderId);
   return children.flatMap(({ id }) => [id, ...inside(folders, id)]);
};

// Working days after `from` up to `to`: the days a wait took.
const workingDaysAfter = (from: string, to: string) => {
   let count = 0;
   for (
      let day = dayjs(from).add(1, 'day');
      !day.isAfter(to, 'day');
      day = day.add(1, 'day')
   )
      if (day.day() !== 0 && day.day() !== 6) count += 1;
   return from ? count : 0;
};

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

// The stage history once the deal leaves the stage it is on for `stage`,
// as ucode writes it (./ucode).
const leaving = (deal: Deal, stage: StageRecord['stage']): StageRecord[] => {
   const today = todayISO();
   const left = (deal.stages ?? []).map((record) =>
      record.leftAt
         ? record
         : {
              ...record,
              leftAt: today,
              daysUsed: deal.days?.used ?? null,
              late: !!deal.days && deal.days.used > deal.days.norm,
           },
   );
   return [
      ...left,
      {
         stage,
         enteredAt: today,
         leftAt: stage === 'portfolio' ? today : '',
         daysUsed: null,
         norm: stage === 'portfolio' ? null : stageNorm(stage),
         late: false,
      },
   ];
};

// The state of a deal that has just entered a stage.
const onStage = (deal: Deal, stage: DealStage): Deal => {
   const norm = stageNorm(stage);
   return {
      ...deal,
      stages: leaving(deal, stage),
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
         fromSite: false,
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

   /* The deal leaves the inbox for the stage after it: Скрининг, unless the
      fund has deleted or moved it in Настройки. */
   async takeToScreening(id: string, ownerId: string) {
      await change(id, (deal) =>
         logged(
            {
               ...onStage(deal, nextStageOf('inbox') ?? 'screening'),
               ownerId,
               screening: deal.screening ?? emptyScreening(),
            },
            { kind: 'taken', userId: ownerId },
         ),
      );
   }

   // Who leads the deal: presents it at the committee and gets its tasks.
   async setOwner(id: string, ownerId: string) {
      await change(id, (deal) => ({ ...deal, ownerId }));
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

   /* The deal is signed and paid: its company appears in Портфель with the
      fund's first investment, and the deal leaves Закрытие for the portfolio.
      The company comes first, so a deal is never in the portfolio without it;
      a deal already there (from before the company was made here) only gets
      its company. Returns the company's id. */
   async joinPortfolio(id: string, investment: Investment) {
      const deal = (await store.get()).find((item) => item.id === id);
      if (!deal) throw new Error(`Deal ${id} does not exist`);
      const board = deal.decisions?.find(
         ({ stage, verdict }) => stage === 'board' && verdict === 'approved',
      );
      const companyId = await portfolio.addFromDeal(
         deal,
         { tagline: industryText(deal), countries: countryText(deal) },
         investment,
         board?.id ?? '',
      );
      if (deal.status === 'active' && !nextStageOf(deal.stage))
         await this.transferDeal(id);
      return companyId;
   }

   // Changes what the deal is: the company, its request and its lists.
   // The application's details; `facts`, when given, are its other rows.
   async updateDetails(
      id: string,
      input: NewDealInput,
      userId: string,
      facts?: Fact[],
   ) {
      await change(id, (deal) =>
         logged(
            {
               ...deal,
               ...(facts && { facts }),
               company: input.company,
               about: input.about,
               industryKey: input.industryKey,
               industry: input.industry,
               source: input.source,
               amount: input.amount,
               country: input.country,
               roundStage: input.roundStage,
            },
            { kind: 'edited', userId },
         ),
      );
   }

   /* Puts a deal on any stage, in work, paused or withdrawn, past the
      conditions of its stage (the person was warned of them): back to an
      earlier stage, ahead, or a closed deal reopened. The reason goes to the
      journal. A rejection and the portfolio keep their own windows, since
      they need a reason from the list and the fund's investment. */
   async moveDeal(
      id: string,
      target: { stage: DealStage; status: 'active' | 'paused' | 'withdrawn' },
      reason: string,
      userId: string,
   ) {
      await change(id, (deal) => {
         const moved = target.stage !== deal.stage || deal.status !== 'active';
         const base = moved ? onStage(deal, target.stage) : deal;
         const next: Deal =
            target.status === 'active'
               ? { ...base, closed: undefined }
               : {
                    ...base,
                    status: target.status,
                    days: null,
                    waiting: false,
                    closed: { note: reason, date: todayISO() },
                 };
         return logged(next, {
            kind: 'moved',
            stage: target.stage,
            status: target.status,
            reason,
            userId,
         });
      });
   }

   /* Puts a deal back on an earlier stage and keeps its status: a paused or
      withdrawn deal stays so, only its stage changes. */
   async stepBack(id: string, stage: DealStage, userId: string) {
      await change(id, (deal) => {
         const status =
            deal.status === 'paused' || deal.status === 'withdrawn'
               ? deal.status
               : 'active';
         const moved = onStage(deal, stage);
         return logged(
            status === 'active'
               ? moved
               : { ...moved, status, days: null, waiting: false },
            { kind: 'moved', stage, status, reason: '', userId },
         );
      });
   }

   // Moves a deal to the next stage; after "Закрытие" it joins the portfolio
   // (joinPortfolio, which also adds the company).
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
                    stages: leaving(deal, 'portfolio'),
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

   /* Closes the screening and moves the deal to the next stage in the fund's
      order: Встреча, unless the fund has deleted it or put a stage of its own
      before it. */
   async completeScreening(id: string, userId: string) {
      await change(id, (deal) => {
         const next = nextStageOf(deal.stage) ?? deal.stage;
         return logged(
            logged(
               {
                  ...onStage(deal, next),
                  screening: deal.screening && {
                     ...deal.screening,
                     completedAt: todayISO(),
                  },
               },
               { kind: 'screening', userId },
            ),
            { kind: 'stage', stage: next },
         );
      });
   }

   /* A request to the applicant stops the stage clock until it is answered.
      The templates go with it as its files: the applicant downloads them,
      fills them in and sends them back. */
   async addRequest(
      id: string,
      input: RequestInput,
      userId: string,
      templates: { title: string; url: string }[] = [],
   ) {
      const today = todayISO();
      const requestId = newId();
      await change(id, (deal) =>
         logged(
            {
               ...deal,
               waiting: true,
               // the clock stops from today, unless it already waits
               clock:
                  deal.waiting && deal.clock
                     ? deal.clock
                     : {
                          pausedDays: deal.clock?.pausedDays ?? 0,
                          pausedSince: today,
                       },
               requests: [
                  {
                     id: requestId,
                     title: input.title,
                     text: input.text,
                     byId: userId,
                     sentAt: today,
                     dueDate: input.dueDate,
                     status: 'waiting',
                     closedAt: '',
                     detail: '',
                     warning: '',
                     ddQuestionnaire: input.ddQuestionnaire,
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
      if (templates.length)
         await attachments.addCopies(
            { dealId: id, section: 'request', itemId: requestId },
            templates,
            userId,
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

   /* Stores a file the fund adds to the data room (ucode Files, public by
      its address) and records it, accepted, in the folder it was uploaded
      to, as the next version of a document of that name. */
   async uploadDocument(id: string, file: File, userId: string, folderId = '') {
      const stored = await uploadFile(file, 'Deals');
      const title = titleOf(stored.name);
      const at = `${todayISO()} ${nowTime()}`;
      await change(id, (deal) =>
         logged(
            {
               ...deal,
               documents: [
                  {
                     id: newId(),
                     title,
                     status: 'accepted',
                     version: nextVersion(deal, title),
                     url: stored.url,
                     fileId: stored.id,
                     folderId,
                     requestId: '',
                     uploadedBy: 'fund',
                     uploadedById: userId,
                     uploadedAt: at,
                     detail: '',
                     handled: {
                        kind: 'uploaded',
                        byId: userId,
                        at,
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

   // A document renamed or moved to another folder; its version stays.
   async updateDocument(
      id: string,
      documentId: string,
      input: Pick<DealDocument, 'title' | 'folderId'>,
   ) {
      await change(id, (deal) => ({
         ...deal,
         documents: deal.documents?.map((item) =>
            item.id === documentId ? { ...item, ...input } : item,
         ),
      }));
   }

   // A folder of the data room, inside another or at the top.
   async addFolder(id: string, name: string, parentId: string, userId: string) {
      await change(id, (deal) => ({
         ...deal,
         folders: [
            ...(deal.folders ?? []),
            {
               id: newId(),
               name,
               parentId,
               sortOrder: (deal.folders ?? []).length + 1,
               createdById: userId,
            },
         ],
      }));
   }

   // A folder renamed or moved; never into itself or a folder inside it.
   async updateFolder(
      id: string,
      folderId: string,
      input: Pick<DealFolder, 'name' | 'parentId'>,
   ) {
      await change(id, (deal) => {
         const folders = deal.folders ?? [];
         const parentId =
            input.parentId === folderId ||
            inside(folders, folderId).includes(input.parentId)
               ? (folders.find((item) => item.id === folderId)?.parentId ?? '')
               : input.parentId;
         return {
            ...deal,
            folders: folders.map((item) =>
               item.id === folderId ? { ...item, ...input, parentId } : item,
            ),
         };
      });
   }

   /* Deletes a folder; what it held, files and folders, moves one level up,
      so nothing is lost. The contents move first, then the folder goes. */
   async removeFolder(id: string, folderId: string) {
      const folder = (await store.get())
         .find((deal) => deal.id === id)
         ?.folders?.find((item) => item.id === folderId);
      if (!folder) return;
      await change(id, (deal) => ({
         ...deal,
         folders: deal.folders?.map((item) =>
            item.parentId === folderId
               ? { ...item, parentId: folder.parentId }
               : item,
         ),
         documents: deal.documents?.map((item) =>
            item.folderId === folderId
               ? { ...item, folderId: folder.parentId }
               : item,
         ),
      }));
      await change(id, (deal) => {
         const folders = deal.folders?.filter((item) => item.id !== folderId);
         return { ...deal, folders: folders?.length ? folders : undefined };
      });
   }

   // Takes a document out of the data room, with its file.
   async removeDocument(id: string, documentId: string) {
      const document = (await store.get())
         .find((deal) => deal.id === id)
         ?.documents?.find((item) => item.id === documentId);
      await change(id, (deal) => ({
         ...deal,
         documents: deal.documents?.filter((item) => item.id !== documentId),
      }));
      if (document?.fileId) await deleteFile(document.fileId);
   }

   /* The applicant answered a request (by mail, until the founders' cabinet
      answers itself): the request closes with what they said, and once no
      request waits, the stage clock runs again. */
   async answerRequest(
      id: string,
      requestId: string,
      answer: string,
      userId: string,
      files: File[] = [],
   ) {
      const today = todayISO();
      // the applicant's filled-in files go to the data room, to be checked
      const stored: StoredFile[] = [];
      for (const file of files) stored.push(await uploadFile(file, 'Deals'));
      const at = `${today} ${nowTime()}`;
      await change(id, (deal) => {
         const requests = (deal.requests ?? []).map((item) =>
            item.id === requestId
               ? {
                    ...item,
                    status: 'accepted' as const,
                    closedAt: today,
                    detail: answer,
                 }
               : item,
         );
         const waiting = requests.some(({ status }) => status === 'waiting');
         const resumed = deal.waiting && !waiting && deal.clock;
         const title =
            requests.find((item) => item.id === requestId)?.title ?? '';
         const answered: DealDocument[] = stored.map((file) => {
            const name = titleOf(file.name);
            return {
               id: newId(),
               title: name,
               status: 'review',
               version: nextVersion(deal, name),
               url: file.url,
               fileId: file.id,
               folderId: '',
               requestId,
               uploadedBy: 'applicant',
               uploadedById: userId,
               uploadedAt: at,
               detail: '',
            };
         });
         return logged(
            {
               ...deal,
               requests,
               ...(answered.length && {
                  documents: [...answered, ...(deal.documents ?? [])],
               }),
               waiting,
               clock: resumed
                  ? {
                       pausedDays:
                          deal.clock!.pausedDays +
                          workingDaysAfter(deal.clock!.pausedSince, today),
                       pausedSince: '',
                    }
                  : deal.clock,
            },
            { kind: 'answered', title, userId },
         );
      });
   }

   /* The fund accepts what the founder answered in the cabinet: the request
      was closed for the stage clock when the answer came (decision D4), and
      now leaves «Ответ получен — проверьте». */
   async acceptAnswer(id: string, requestId: string) {
      await change(id, (deal) => ({
         ...deal,
         requests: deal.requests?.map((item) =>
            item.id === requestId && item.status === 'answered'
               ? { ...item, status: 'accepted' as const }
               : item,
         ),
      }));
   }

   // A request's wording and deadline; for an answered one, its answer too.
   async updateRequest(
      id: string,
      requestId: string,
      input: Pick<RequestInput, 'title' | 'text' | 'dueDate'> & {
         detail?: string;
      },
   ) {
      await change(id, (deal) => ({
         ...deal,
         requests: deal.requests?.map((item) =>
            item.id === requestId ? { ...item, ...input } : item,
         ),
      }));
   }

   // Deletes a request with the files of its answer; the clock runs again if
   // nothing else waits.
   async removeRequest(id: string, requestId: string) {
      await change(id, (deal) => {
         const requests = (deal.requests ?? []).filter(
            (item) => item.id !== requestId,
         );
         const waiting = requests.some(({ status }) => status === 'waiting');
         return {
            ...deal,
            requests: requests.length ? requests : undefined,
            // its answers stay in the data room, no longer tied to it
            documents: deal.documents?.map((item) =>
               item.requestId === requestId ? { ...item, requestId: '' } : item,
            ),
            waiting,
            clock:
               deal.waiting && !waiting && deal.clock
                  ? { pausedDays: deal.clock.pausedDays, pausedSince: '' }
                  : deal.clock,
         };
      });
      await attachments.removeAt({
         dealId: id,
         section: 'request',
         itemId: requestId,
      });
   }

   async setRecommendation(id: string, recommendation: Recommendation) {
      await change(id, (deal) => ({
         ...deal,
         memo: deal.memo && { ...deal.memo, recommendation },
      }));
   }

   // The director's approval to move on after ИК-2 (docs/ERP.md, the stages).
   async approveTransfer(id: string, userId: string) {
      await change(id, (deal) => logged(deal, { kind: 'approved', userId }));
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

   // The workstream's executor has reported: its conclusion closes it.
   async concludeWorkstream(
      id: string,
      workstreamId: string,
      conclusion: string,
   ) {
      await change(id, (deal) => ({
         ...deal,
         workstreams: deal.workstreams?.map((item) =>
            item.id === workstreamId
               ? { ...item, conclusion, status: 'done' as const }
               : item,
         ),
      }));
   }

   // ---- what the owner writes on the card: the terms, the metrics DD
   // confirmed, the risks, the synergy with the bank, the team and the
   // materials for the committee

   async setTerms(id: string, terms: DealTerms) {
      await change(id, (deal) => ({ ...deal, terms }));
   }

   async setMetrics(id: string, metrics: Deal['metrics']) {
      await change(id, (deal) => ({
         ...deal,
         metrics: metrics?.items.length ? metrics : undefined,
      }));
   }

   async setSynergy(id: string, synergy: Fact[]) {
      await change(id, (deal) => ({
         ...deal,
         synergy: synergy.length ? synergy : undefined,
      }));
   }

   // Adds the risk, or changes the one with its id.
   async saveRisk(id: string, risk: Risk) {
      await change(id, (deal) => {
         const risks = deal.risks ?? [];
         return {
            ...deal,
            risks: risks.some((item) => item.id === risk.id)
               ? risks.map((item) => (item.id === risk.id ? risk : item))
               : [...risks, risk],
         };
      });
   }

   async removeRisk(id: string, riskId: string) {
      await change(id, (deal) => {
         const risks = (deal.risks ?? []).filter((item) => item.id !== riskId);
         return { ...deal, risks: risks.length ? risks : undefined };
      });
   }

   async addTeamMember(id: string, member: Omit<TeamMember, 'id'>) {
      await change(id, (deal) => ({
         ...deal,
         team: [...(deal.team ?? []), { id: newId(), ...member }],
      }));
   }

   async updateTeamMember(
      id: string,
      memberId: string,
      member: Omit<TeamMember, 'id'>,
   ) {
      await change(id, (deal) => ({
         ...deal,
         team: deal.team?.map((item) =>
            item.id === memberId ? { id: memberId, ...member } : item,
         ),
      }));
   }

   async removeTeamMember(id: string, memberId: string) {
      await change(id, (deal) => {
         const team = (deal.team ?? []).filter((item) => item.id !== memberId);
         return { ...deal, team: team.length ? team : undefined };
      });
   }

   // An item of the materials for the committee that the panel cannot see
   // for itself, such as the case for an exception to the mandate.
   async addReadinessItem(id: string, text: string) {
      await change(id, (deal) => ({
         ...deal,
         readiness: {
            note: deal.readiness?.note ?? '',
            items: [
               ...(deal.readiness?.items ?? []),
               { id: newId(), text, note: '', state: 'open' as const },
            ],
         },
      }));
   }

   async toggleReadinessItem(id: string, itemId: string) {
      await change(id, (deal) => ({
         ...deal,
         readiness: deal.readiness && {
            ...deal.readiness,
            items: deal.readiness.items.map((item) =>
               item.id === itemId
                  ? {
                       ...item,
                       state:
                          item.state === 'done' ? 'open' : ('done' as const),
                    }
                  : item,
            ),
         },
      }));
   }

   async updateReadinessItem(id: string, itemId: string, text: string) {
      await change(id, (deal) => ({
         ...deal,
         readiness: deal.readiness && {
            ...deal.readiness,
            items: deal.readiness.items.map((item) =>
               item.id === itemId ? { ...item, text } : item,
            ),
         },
      }));
   }

   async removeReadinessItem(id: string, itemId: string) {
      await change(id, (deal) => {
         const items = (deal.readiness?.items ?? []).filter(
            (item) => item.id !== itemId,
         );
         return {
            ...deal,
            readiness: items.length
               ? { note: deal.readiness?.note ?? '', items }
               : undefined,
         };
      });
   }

   async updateWorkstream(
      id: string,
      workstreamId: string,
      input: Pick<
         Workstream,
         'name' | 'executor' | 'dueDate' | 'status' | 'conclusion'
      >,
   ) {
      await change(id, (deal) => ({
         ...deal,
         workstreams: deal.workstreams?.map((item) =>
            item.id === workstreamId ? { ...item, ...input } : item,
         ),
      }));
   }

   // Deletes a workstream with its reports.
   async removeWorkstream(id: string, workstreamId: string) {
      await change(id, (deal) => {
         const workstreams = (deal.workstreams ?? []).filter(
            (item) => item.id !== workstreamId,
         );
         return {
            ...deal,
            workstreams: workstreams.length ? workstreams : undefined,
         };
      });
      await attachments.removeAt({
         dealId: id,
         section: 'workstream',
         itemId: workstreamId,
      });
   }

   // DD's frame: its deadline, the outside DD's cost, what speaks for the
   // deal and what the committee must see first.
   async setDd(id: string, dd: NonNullable<Deal['dd']>) {
      await change(id, (deal) => ({ ...deal, dd }));
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

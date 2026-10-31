import {
   createRow,
   day,
   deleteRow,
   listRows,
   num,
   type Row,
   str,
   updateRow,
} from '@shared/api/ucode';
import { createStore, newId, todayISO } from '@shared/helpers';
import type {
   Procurement,
   ProcurementInput,
} from '@shared/types/procurement.types';
import {
   firstStage,
   type MovePlan,
   nextStageOf,
   planMove,
   reapprovalOf,
} from '../helpers';

/* Закупки in ucode (docs/ucode-migration.md, batch 18): the table procurements;
   its stages, categories and vendors are read through Настройки. `stored` is
   false until the batch has made the table: the page says so, and Мой день
   just finds none. */

interface ProcurementState {
   requests: Procurement[];
   stored: boolean;
}

const toRequest = (row: Row): Procurement => ({
   id: row.guid,
   title: str(row.title),
   category: str(row.category),
   amount: num(row.amount),
   stage: str(row.stage),
   vendorId: str(row.vendor_id),
   date: day(row.request_date) || day(row.created_at),
   needDate: day(row.need_date),
   ownerId: str(row.owner_id),
   approverId: str(row.approver_id),
   approvedBy: str(row.approved_by),
   note: str(row.note),
   decisionNote: str(row.decision_note),
});

const requestRow = (request: Procurement) => ({
   title: request.title,
   category: request.category,
   amount: request.amount,
   stage: request.stage,
   vendor_id: request.vendorId,
   request_date: request.date || null,
   need_date: request.needDate || null,
   owner_id: request.ownerId,
   approver_id: request.approverId,
   approved_by: request.approvedBy,
   note: request.note,
   decision_note: request.decisionNote,
});

const newest = (a: Row, b: Row) =>
   str(b.created_at).localeCompare(str(a.created_at));

const store = createStore<ProcurementState>(async () => {
   const rows = await listRows('procurements').catch(() => null);
   return {
      requests: (rows ?? []).sort(newest).map(toRequest),
      stored: rows !== null,
   };
});

// How saving a request's form went: it stays open on what stops the move.
export type SaveOutcome =
   | { kind: 'saved' }
   | { kind: 'sent'; approverId: string }
   | { kind: 'need_vendor' }
   | { kind: 'waits'; approverId: string }
   | { kind: 'decide'; request: Procurement };

class ProcurementService {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   async getRequests() {
      return (await store.get()).requests;
   }

   async isStored() {
      return (await store.get()).stored;
   }

   private async find(id: string) {
      const request = (await store.get()).requests.find(
         (item) => item.id === id,
      );
      if (!request) throw new Error(`No procurement ${id}`);
      return request;
   }

   private async write(request: Procurement, isNew = false) {
      if (isNew)
         await createRow('procurements', {
            guid: request.id,
            ...requestRow(request),
         });
      else
         await updateRow('procurements', {
            guid: request.id,
            ...requestRow(request),
         });
      await store.reload();
   }

   /* Saves the form. A new request starts on the first stage; the stage picked
      goes by the same rules as a move, and what stops it writes nothing. */
   async save(
      id: string | null,
      input: ProcurementInput,
      userId: string,
   ): Promise<SaveOutcome> {
      const before = id ? await this.find(id) : null;
      const base: Procurement = before ?? {
         ...input,
         id: newId(),
         stage: firstStage(),
         date: todayISO(),
         approverId: '',
         approvedBy: '',
         decisionNote: '',
      };
      const changed: Procurement = { ...base, ...input, stage: base.stage };
      const plan: MovePlan | null =
         input.stage !== base.stage
            ? planMove(changed, input.stage, userId)
            : null;
      if (plan?.kind === 'need_vendor' || plan?.kind === 'waits') return plan;
      const moved: Procurement = {
         ...changed,
         ...(plan && 'patch' in plan ? plan.patch : {}),
      };
      const again = before ? reapprovalOf(before, moved) : null;
      const next: Procurement = { ...moved, ...again };
      await this.write(next, !before);
      if (plan?.kind === 'decide') return { kind: 'decide', request: next };
      if (plan?.kind === 'sent')
         return { kind: 'sent', approverId: plan.approverId };
      return again
         ? { kind: 'sent', approverId: next.approverId }
         : { kind: 'saved' };
   }

   // Moves a request on a button or a board, by the rules of planMove.
   async move(id: string, to: string, userId: string): Promise<MovePlan> {
      const request = await this.find(id);
      const plan = planMove(request, to, userId);
      if ('patch' in plan) await this.write({ ...request, ...plan.patch });
      return plan;
   }

   // The approver lets it through: on to the next stage.
   async approve(id: string, userId: string, note = '') {
      const request = await this.find(id);
      await this.write({
         ...request,
         approvedBy: userId,
         decisionNote: note,
         stage: nextStageOf(request)?.key ?? request.stage,
      });
   }

   // The approver sends it back to whoever asked for it, to the first stage.
   async sendBack(id: string, note: string) {
      await this.write({
         ...(await this.find(id)),
         approvedBy: '',
         decisionNote: note,
         stage: firstStage(),
      });
   }

   // Someone is leaving: what they asked for or decide goes to another person.
   async handOver(fromId: string, toId: string) {
      const { requests } = await store.get();
      await Promise.all(
         requests
            .filter(
               ({ ownerId, approverId }) =>
                  ownerId === fromId || approverId === fromId,
            )
            .map(({ id, ownerId, approverId }) =>
               updateRow('procurements', {
                  guid: id,
                  owner_id: ownerId === fromId ? toId : ownerId,
                  approver_id: approverId === fromId ? toId : approverId,
               }),
            ),
      );
      await store.reload();
   }

   async remove(id: string) {
      await deleteRow('procurements', id);
      await store.reload();
   }
}

export default new ProcurementService();

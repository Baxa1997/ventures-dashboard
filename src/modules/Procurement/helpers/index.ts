import { listOf } from '@modules/Settings/services';
import { directorId } from '@shared/constants';
import type { Procurement } from '@shared/types/procurement.types';
import { AUTO_APPROVED, DEFAULT_LIMIT } from '../constants';

// The stages in their order: those in use, and the one a request still sits
// on if it was turned off.
export const stagesFor = (stage = '') =>
   listOf('procStages', true).filter(
      (item) => item.active || item.key === stage,
   );

const stageItem = (key: string) =>
   listOf('procStages', true).find((item) => item.key === key);

export const firstStage = () => listOf('procStages')[0]?.key ?? '';

export const categoryLimit = (key: string) =>
   listOf('procCategories', true).find((item) => item.key === key)?.limit ??
   DEFAULT_LIMIT;

export const isOverLimit = ({ amount, category }: Procurement) =>
   amount > categoryLimit(category);

// Who decides a request over the limit: the general director unless named.
export const approverOf = ({ approverId }: Procurement) =>
   approverId || directorId();

export const nextStageOf = ({ stage }: Procurement) => {
   const stages = stagesFor(stage);
   return stages[stages.findIndex(({ key }) => key === stage) + 1];
};

// The last stage closes a request.
export const isClosed = (request: Procurement) => !nextStageOf(request);

// On the approval stage, over the limit, and nobody has decided yet.
export const waitsApproval = (request: Procurement) =>
   !!stageItem(request.stage)?.needsApproval &&
   isOverLimit(request) &&
   !request.approvedBy;

export const awaitsProcurementApproval = (
   request: Procurement,
   userId: string,
) => waitsApproval(request) && approverOf(request) === userId;

// What moving a request to a stage comes to: past the stage that needs a
// vendor it needs one; past the approval stage, over the limit, it stops there
// until the approver decides; otherwise it goes.
export type MovePlan =
   | { kind: 'moved'; patch: Partial<Procurement> }
   | { kind: 'need_vendor' }
   | { kind: 'sent'; patch: Partial<Procurement>; approverId: string }
   | { kind: 'waits'; approverId: string }
   | { kind: 'decide' };

export const planMove = (
   request: Procurement,
   to: string,
   userId: string,
): MovePlan => {
   const stages = stagesFor(request.stage);
   const target = stages.findIndex(({ key }) => key === to);
   const passed = stages.slice(0, Math.max(target, 0));
   if (passed.some(({ needsVendor }) => needsVendor) && !request.vendorId)
      return { kind: 'need_vendor' };
   const gate = passed.find(({ needsApproval }) => needsApproval);
   const over = isOverLimit(request);
   if (gate && over && !request.approvedBy) {
      const approverId = approverOf(request);
      if (request.stage !== gate.key)
         return {
            kind: 'sent',
            approverId,
            patch: { stage: gate.key, approverId },
         };
      return approverId === userId
         ? { kind: 'decide' }
         : { kind: 'waits', approverId };
   }
   return {
      kind: 'moved',
      patch: {
         stage: to,
         ...(stages[target]?.needsApproval &&
            over &&
            !request.approverId && { approverId: directorId() }),
         ...(gate && !over && !request.approvedBy
            ? { approvedBy: AUTO_APPROVED }
            : {}),
         // once it moves on, the reason it came back is behind it
         ...(!request.approvedBy && { decisionNote: '' }),
      },
   };
};

/* A request changed after it was let through. Over the limit now, without a
   person's decision for this sum, it goes back to the approval stage: raising
   the sum, or a lower limit, does not get round the approver. A closed one is
   left as it was paid. */
export const reapprovalOf = (
   before: Procurement,
   after: Procurement,
): Partial<Procurement> | null => {
   if (isClosed(after) || !isOverLimit(after)) return null;
   const decided = after.approvedBy && after.approvedBy !== AUTO_APPROVED;
   if (decided && after.amount <= before.amount) return null;
   const stages = stagesFor(after.stage);
   const gate = stages.findIndex(({ needsApproval }) => needsApproval);
   const at = stages.findIndex(({ key }) => key === after.stage);
   if (gate === -1 || at < gate || (at === gate && !after.approvedBy))
      return null;
   return {
      stage: stages[gate].key,
      approvedBy: '',
      approverId: approverOf(after),
   };
};

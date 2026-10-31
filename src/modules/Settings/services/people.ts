import contracts from '@modules/Contracts/services';
import deals from '@modules/Deals/services';
import portfolio from '@modules/Portfolio/services';
import procurement from '@modules/Procurement/services';
import { isDone } from '@modules/Work/helpers';
import work from '@modules/Work/services';

/* A person leaving, across the sections: kept apart from Настройки' own service,
   which those sections read. */

// What depends on the person: nobody would run it once they are gone.
export const loadOf = async (personId: string) => {
   const [all, tasks, allContracts, requests, holdings] = await Promise.all([
      deals.getDeals(),
      work.getTasks(),
      contracts.getContracts(),
      procurement.getRequests(),
      portfolio.getState(),
   ]);
   const isOpen = (status: string) => status === 'active' || status === 'review';
   return {
      deals: all.filter(
         ({ ownerId, proposedOwnerId, status }) =>
            isOpen(status) &&
            (ownerId === personId || (!ownerId && proposedOwnerId === personId)),
      ).length,
      tasks: tasks.filter(
         (task) =>
            !isDone(task) &&
            (task.assigneeId === personId || task.reviewerId === personId),
      ).length,
      companies: holdings.companies.filter(
         ({ ownerId }) => ownerId === personId,
      ).length,
      contracts: allContracts.filter(
         ({ ownerId, approverId }) =>
            ownerId === personId || approverId === personId,
      ).length,
      purchases: requests.filter(
         ({ ownerId, approverId }) =>
            ownerId === personId || approverId === personId,
      ).length,
   };
};

export type PersonLoad = Awaited<ReturnType<typeof loadOf>>;

/* Gives another person what `fromId` runs: their open deals, open tasks, companies,
   contracts and purchases. Closed records keep the name they have. */
export const handOver = async (fromId: string, toId: string, byId: string) => {
   const [all, tasks] = await Promise.all([deals.getDeals(), work.getTasks()]);
   await Promise.all(
      all
         .filter(
            ({ ownerId, proposedOwnerId, status }) =>
               (status === 'active' || status === 'review') &&
               (ownerId === fromId || (!ownerId && proposedOwnerId === fromId)),
         )
         .map(({ id }) => deals.setOwner(id, toId)),
   );
   for (const task of tasks.filter((item) => !isDone(item))) {
      if (task.assigneeId === fromId)
         await work.updateTask(task.id, { assigneeId: toId }, byId);
      if (task.reviewerId === fromId)
         await work.updateTask(task.id, { reviewerId: toId }, byId);
   }
   await Promise.all([
      portfolio.handOver(fromId, toId),
      contracts.handOver(fromId, toId),
      procurement.handOver(fromId, toId),
   ]);
};

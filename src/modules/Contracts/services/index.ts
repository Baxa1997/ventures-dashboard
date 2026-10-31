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
import { createStore, newId } from '@shared/helpers';
import type {
   Contract,
   ContractInput,
   ContractStatus,
} from '@shared/types/contracts.types';
import { settled } from '../helpers';

/* Договоры in ucode (docs/ucode-migration.md, batch 18): the table contracts.
   A change is written to ucode, then the table is read again, so the page shows
   what ucode keeps. `stored` is false until the batch has made the table: the
   page says so, and Мой день, the search and the deal's card just find none. */

interface ContractsState {
   contracts: Contract[];
   stored: boolean;
}

const toContract = (row: Row): Contract => ({
   id: row.guid,
   number: str(row.number),
   party: str(row.party),
   subject: str(row.subject),
   type: str(row.contract_type),
   status: (str(row.status) || 'draft') as ContractStatus,
   amount: num(row.amount),
   signedDate: day(row.signed_date),
   validUntil: day(row.valid_until),
   ownerId: str(row.owner_id),
   approverId: str(row.approver_id),
   dealId: str(row.deal_id),
   decisionNote: str(row.decision_note),
});

const contractRow = (input: ContractInput) => ({
   number: input.number,
   party: input.party,
   subject: input.subject,
   contract_type: input.type,
   status: input.status,
   amount: input.amount,
   signed_date: input.signedDate || null,
   valid_until: input.validUntil || null,
   owner_id: input.ownerId,
   approver_id: input.approverId,
   deal_id: input.dealId,
});

const newest = (a: Row, b: Row) =>
   str(b.created_at).localeCompare(str(a.created_at));

const store = createStore<ContractsState>(async () => {
   const rows = await listRows('contracts').catch(() => null);
   return {
      contracts: (rows ?? []).sort(newest).map(toContract),
      stored: rows !== null,
   };
});

const inputOf = ({ id: _id, decisionNote: _note, ...input }: Contract) => input;

class Contracts {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   async getContracts() {
      return (await store.get()).contracts;
   }

   async isStored() {
      return (await store.get()).stored;
   }

   private async find(id: string) {
      const contract = (await store.get()).contracts.find(
         (item) => item.id === id,
      );
      if (!contract) throw new Error(`No contract ${id}`);
      return contract;
   }

   async create(input: ContractInput) {
      await createRow('contracts', {
         guid: newId(),
         ...contractRow(settled(input)),
      });
      await store.reload();
   }

   // A contract that leaves the draft leaves the note on why it came back.
   async update(id: string, input: ContractInput) {
      await updateRow('contracts', {
         guid: id,
         ...contractRow(settled(input)),
         ...(input.status !== 'draft' && { decision_note: '' }),
      });
      await store.reload();
   }

   async setStatus(id: string, status: ContractStatus) {
      await this.update(id, { ...inputOf(await this.find(id)), status });
   }

   // Approved from Мой день: it counts as signed, from today unless dated.
   async approve(id: string) {
      await this.setStatus(id, 'signed');
   }

   // Sent back from Мой день, to its draft with what to fix.
   async sendBack(id: string, note: string) {
      await updateRow('contracts', {
         guid: id,
         status: 'draft',
         decision_note: note,
      });
      await store.reload();
   }

   // Someone is leaving: what they run or approve goes to another person.
   async handOver(fromId: string, toId: string) {
      const { contracts } = await store.get();
      await Promise.all(
         contracts
            .filter(
               ({ ownerId, approverId }) =>
                  ownerId === fromId || approverId === fromId,
            )
            .map(({ id, ownerId, approverId }) =>
               updateRow('contracts', {
                  guid: id,
                  owner_id: ownerId === fromId ? toId : ownerId,
                  approver_id: approverId === fromId ? toId : approverId,
               }),
            ),
      );
      await store.reload();
   }

   async remove(id: string) {
      await deleteRow('contracts', id);
      await store.reload();
   }
}

export default new Contracts();

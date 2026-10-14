import { createStore, newId, todayISO } from '@shared/helpers';
import type {
   Contract,
   ContractDetails,
   NewContractInput,
} from '@shared/types/contracts.types';
import { SAMPLE_CONTRACTS } from './sample';

const store = createStore<Contract[]>(
   'sqbv_dashboard_contracts_v1',
   () => SAMPLE_CONTRACTS,
);

const changeDetails = (
   id: string,
   apply: (details: ContractDetails) => ContractDetails,
) =>
   store.update((contracts) =>
      contracts.map((contract) =>
         contract.id === id && contract.details
            ? { ...contract, details: apply(contract.details) }
            : contract,
      ),
   );

const logged = (details: ContractDetails, text: string): ContractDetails => ({
   ...details,
   history: [{ date: todayISO(), text }, ...details.history],
});

class Contracts {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   async getContracts(): Promise<Contract[]> {
      return store.read();
   }

   async createContract(input: NewContractInput): Promise<Contract> {
      const contract: Contract = {
         ...input,
         id: newId(),
         endDate: null,
         attention: '',
         status: 'approval',
         dealIds: [],
      };
      store.update((contracts) => [contract, ...contracts]);
      return contract;
   }

   // The director agrees an act; it goes to the accountants for payment.
   async approveAct(id: string, actId: string, label: string) {
      changeDetails(id, (details) =>
         logged(
            {
               ...details,
               acts: details.acts.map((act) =>
                  act.id === actId ? { ...act, status: 'approved' } : act,
               ),
            },
            label,
         ),
      );
   }

   async returnAct(id: string, actId: string, note: string, label: string) {
      changeDetails(id, (details) =>
         logged(
            {
               ...details,
               acts: details.acts.map((act) =>
                  act.id === actId ? { ...act, status: 'returned', note } : act,
               ),
            },
            label,
         ),
      );
   }

   async addOrder(
      id: string,
      order: {
         title: string;
         tariffId: string;
         amount: number;
         dealId?: string;
      },
      label: string,
   ) {
      changeDetails(id, (details) =>
         logged(
            {
               ...details,
               orders: [
                  {
                     ...order,
                     id: newId(),
                     date: todayISO(),
                     note: '',
                     status: 'in_progress',
                  },
                  ...details.orders,
               ],
            },
            label,
         ),
      );
   }
}

export default new Contracts();

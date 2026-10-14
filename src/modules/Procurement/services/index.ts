import { createStore, newId } from '@shared/helpers';
import type {
   CommissionMember,
   CommissionProtocol,
   NewProcurementInput,
   Procurement,
   ProcurementStage,
   Supplier,
} from '@shared/types/procurement.types';
import {
   SAMPLE_COMMISSION,
   SAMPLE_PROCUREMENTS,
   SAMPLE_PROTOCOLS,
   SAMPLE_SUPPLIERS,
   SAMPLE_TOTALS,
   tenderSteps,
} from './sample';

export interface ProcurementState {
   procurements: Procurement[];
   commission: CommissionMember[];
   protocols: CommissionProtocol[];
   suppliers: Supplier[];
   totals: typeof SAMPLE_TOTALS;
}

const store = createStore<ProcurementState>(
   'sqbv_dashboard_procurement_v1',
   () => ({
      procurements: SAMPLE_PROCUREMENTS,
      commission: SAMPLE_COMMISSION,
      protocols: SAMPLE_PROTOCOLS,
      suppliers: SAMPLE_SUPPLIERS,
      totals: SAMPLE_TOTALS,
   }),
);

// The stage a tender is at once this many of its six steps are done.
const STAGE_BY_STEPS: ProcurementStage[] = [
   'planned',
   'documents',
   'documents',
   'published',
   'bidding',
   'evaluation',
   'contract',
];

class Procurements {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   async getState(): Promise<ProcurementState> {
      return store.read();
   }

   async createProcurement(input: NewProcurementInput): Promise<Procurement> {
      const procurement: Procurement = {
         ...input,
         id: newId(),
         stage: 'planned',
         result: '',
         steps: tenderSteps(0, []),
      };
      store.update((state) => ({
         ...state,
         procurements: [procurement, ...state.procurements],
      }));
      return procurement;
   }

   // The next step of a tender is done; the stage follows the steps.
   async completeStep(id: string, stepId: string) {
      store.update((state) => ({
         ...state,
         procurements: state.procurements.map((procurement) => {
            if (procurement.id !== id) return procurement;
            const steps = procurement.steps.map((step) =>
               step.id === stepId ? { ...step, done: true } : step,
            );
            return {
               ...procurement,
               steps,
               stage: STAGE_BY_STEPS[steps.filter(({ done }) => done).length],
            };
         }),
      }));
   }
}

export default new Procurements();

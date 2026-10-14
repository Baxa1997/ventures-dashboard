import { createStore, todayISO } from '@shared/helpers';
import type {
   CompanyRequest,
   PortfolioCompany,
   ReportingCycle,
} from '@shared/types/portfolio.types';
import { SAMPLE_COMPANIES, SAMPLE_CYCLE, SAMPLE_REQUESTS } from './sample';

export interface PortfolioState {
   companies: PortfolioCompany[];
   requests: CompanyRequest[];
   cycle: ReportingCycle;
}

const store = createStore<PortfolioState>(
   'sqbv_dashboard_portfolio_v1',
   () => ({
      companies: SAMPLE_COMPANIES,
      requests: SAMPLE_REQUESTS,
      cycle: SAMPLE_CYCLE,
   }),
);

class Portfolio {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   async getState(): Promise<PortfolioState> {
      return store.read();
   }

   // The analyst checked the figures the fund's template brought in.
   async confirmMetrics(companyId: string, quarter: string) {
      store.update((state) => ({
         ...state,
         companies: state.companies.map((company) =>
            company.id === companyId
               ? {
                    ...company,
                    reports: {
                       ...company.reports,
                       [quarter]: {
                          ...company.reports[quarter],
                          metrics: 'confirmed',
                       },
                    },
                 }
               : company,
         ),
      }));
   }

   // A reminder goes to the cabinets of the companies that have not sent all
   // their documents yet.
   async remind() {
      store.update((state) => ({
         ...state,
         cycle: { ...state.cycle, remindedAt: todayISO() },
      }));
   }

   async answerRequest(id: string, answer: string) {
      store.update((state) => ({
         ...state,
         requests: state.requests.map((request) =>
            request.id === id
               ? { ...request, status: 'closed', answer }
               : request,
         ),
      }));
   }
}

export default new Portfolio();

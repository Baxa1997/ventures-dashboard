import DataRoom from '@modules/Deals/pages/Deal/components/DataRoom';
import DataRequests from '@modules/Portfolio/components/DataRequests';
import type { PortfolioData } from '@modules/Portfolio/hooks';
import { Card, NoData } from '@shared/components';
import type { Deal } from '@shared/types/deals.types';
import type {
   CompanyDataRequest,
   PortfolioCompany,
} from '@shared/types/portfolio.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Reports from './Reports';

interface DataRoomTabProps {
   company: PortfolioCompany;
   deal: Deal | undefined; // the deal it came from; none for an import
   cycle: PortfolioData['cycle'];
   requests: CompanyDataRequest[]; // the fund's requests for data
   onNewRequest: () => void;
}

/* «Документы Data Room», as the design draws it: the company's data room —
   its deal's folders and files, which the fund goes on keeping while the
   company is active — then what the fund asked the company for, with its
   answers and files, and its quarterly reports' documents. */
const DataRoomTab = ({
   company,
   deal,
   cycle,
   requests,
   onNewRequest,
}: DataRoomTabProps) => {
   const { t } = useTranslation('portfolio');
   const [folderId, setFolderId] = useState('');

   return (
      <div className='gap-section flex flex-1 flex-col'>
         {deal ? (
            <DataRoom
               deal={deal}
               folderId={folderId}
               writable={company.status === 'active'}
               onFolder={setFolderId}
            />
         ) : (
            <Card title='Data room'>
               <NoData>
                  {t(
                     'Компания пришла в портфель не через сделку в панели, поэтому дата рума у неё нет.',
                  )}
               </NoData>
            </Card>
         )}
         <DataRequests
            company={company}
            requests={requests}
            onNew={onNewRequest}
         />
         <Reports company={company} cycle={cycle} />
      </div>
   );
};

export default DataRoomTab;

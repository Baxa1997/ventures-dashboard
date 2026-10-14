import { PILOT_STATUSES, PORTFOLIO_PATH } from '@modules/Portfolio/constants';
import type { PortfolioData } from '@modules/Portfolio/hooks';
import { Badge, Card, NoData, Table, TD, TH } from '@shared/components';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface PilotsProps {
   data: PortfolioData;
   companyId?: string; // only this company's pilots, on its card
}

// Pilots of the portfolio companies with the bank's business lines.
const Pilots = ({ data, companyId }: PilotsProps) => {
   const { t } = useTranslation('portfolio');
   const companies = data.companies.filter(
      ({ id, pilots }) => pilots.length && (!companyId || id === companyId),
   );

   return (
      <Card className='flex-1'>
         {companies.length ? (
            <Table
               className='min-w-2xl'
               head={
                  <>
                     {!companyId && <th className={TH}>{t('Компания')}</th>}
                     <th className={TH}>{t('Пилот')}</th>
                     <th className={TH}>{t('Заказчик')}</th>
                     <th className={TH}>{t('Итог')}</th>
                     <th className={TH}>{t('Статус')}</th>
                  </>
               }
            >
               {companies.flatMap((company) =>
                  company.pilots.map((pilot) => (
                     <tr key={`${company.id}-${pilot.id}`}>
                        {!companyId && (
                           <td className={TD}>
                              <Link
                                 className='text-sm font-semibold hover:underline'
                                 to={`${PORTFOLIO_PATH}/${company.id}?tab=pilots`}
                              >
                                 {company.name}
                              </Link>
                           </td>
                        )}
                        <td className={clsx(TD, 'font-medium')}>
                           {pilot.title}
                        </td>
                        <td className={clsx(TD, 'text-ink-soft')}>
                           {pilot.customer}
                        </td>
                        <td className={TD}>{pilot.note}</td>
                        <td className={TD}>
                           <Badge tone={PILOT_STATUSES[pilot.status].tone}>
                              {t(PILOT_STATUSES[pilot.status].label)}
                           </Badge>
                        </td>
                     </tr>
                  )),
               )}
            </Table>
         ) : (
            <NoData>{t('Пилотов с банком пока нет')}</NoData>
         )}
      </Card>
   );
};

export default Pilots;

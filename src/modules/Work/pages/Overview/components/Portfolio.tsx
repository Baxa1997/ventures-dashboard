import { formatDate } from '@modules/Work/helpers';
import { Badge } from '@shared/components';
import type { FundOverview } from '@shared/types/work.types';
import { useTranslation } from 'react-i18next';
import { QUARTERS } from '../constants';
import { formatThousands } from '../helpers';

interface PortfolioProps {
   portfolio: FundOverview['portfolio'];
}

const TH = 'px-3 py-2 text-xs font-normal text-ink-soft';

const Portfolio = ({ portfolio }: PortfolioProps) => {
   const { t } = useTranslation('work');

   return (
      <>
         <div className='overflow-x-auto'>
            <table className='w-full min-w-120 border-collapse text-left'>
               <thead>
                  <tr className='bg-ground border-line border-b'>
                     <th className={`${TH} pl-5`}>{t('Компания')}</th>
                     <th className={`${TH} text-right`}>{t('Вложено')}</th>
                     <th className={TH}>
                        {t('Отчёт Q{{quarter}}', {
                           quarter: portfolio.quarter,
                        })}
                     </th>
                     <th className={`${TH} pr-5`}>{t('Следующий шаг')}</th>
                  </tr>
               </thead>
               <tbody className='divide-line divide-y'>
                  {portfolio.companies.map((company) => (
                     <tr key={company.id} className='h-12.5'>
                        <td className='py-2.5 pr-3 pl-5 font-semibold'>
                           {company.name}
                        </td>
                        <td className='px-3 py-2.5 text-right tabular-nums'>
                           {formatThousands(company.invested)}
                        </td>
                        <td className='px-3 py-2.5'>
                           {company.reportReceived ? (
                              <Badge tone='success'>{t('Получен')}</Badge>
                           ) : (
                              <Badge>{t('Ожидается')}</Badge>
                           )}
                        </td>
                        <td className='text-ink-soft w-[41%] py-2.5 pr-5 pl-3 text-xs'>
                           {company.nextStep || '—'}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         <p className='border-line text-ink-soft border-t px-5 py-3 text-xs'>
            {t(
               'Срок сдачи отчётов за {{quarter}} квартал — {{due}}. Запрос отправлен компаниям {{sent}}.',
               {
                  quarter: QUARTERS[portfolio.quarter - 1],
                  due: formatDate(portfolio.reportsDue),
                  sent: formatDate(portfolio.requestedAt),
               },
            )}
         </p>
      </>
   );
};

export default Portfolio;

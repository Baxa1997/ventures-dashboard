import { METRIC_LABELS } from '@modules/Portfolio/constants';
import { formatMetric, quarterLabel } from '@modules/Portfolio/helpers';
import portfolio from '@modules/Portfolio/services';
import {
   Button,
   Modal,
   ModalBody,
   ModalFooter,
   Table,
   TD,
   TH,
} from '@shared/components';
import { formatDate } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface MetricsDialogProps {
   company: PortfolioCompany | null; // null — closed
   quarter: string;
   onClose: () => void;
}

// The figures the fund's template brought in, next to the quarter before, for
// the analyst to confirm rather than type again.
const MetricsDialog = ({ company, quarter, onClose }: MetricsDialogProps) => {
   const { t, i18n } = useTranslation('portfolio');
   const user = useCurrentUser();
   const language = i18n.resolvedLanguage ?? i18n.language;
   const [year, q] = quarter.split('-Q');
   const previous = Number(q) > 1 ? `${year}-Q${Number(q) - 1}` : null;
   const report = company?.reports[quarter];

   return (
      <Modal
         open={company !== null}
         subtitle={
            report?.filledAt &&
            t('Заполнено из шаблона фонда {{date}}', {
               date: formatDate(report.filledAt),
            })
         }
         title={t('Показатели {{company}} за {{quarter}}', {
            company: company?.name ?? '',
            quarter: quarterLabel(t, quarter),
         })}
         onClose={onClose}
      >
         <div className='min-h-0 flex-auto overflow-y-auto'>
            {company?.metrics.length ? (
               <Table
                  head={
                     <>
                        <th className={TH}>{t('Показатель')}</th>
                        {previous && (
                           <th className={clsx(TH, 'text-right')}>
                              {quarterLabel(t, previous)}
                           </th>
                        )}
                        <th className={clsx(TH, 'text-right')}>
                           {quarterLabel(t, quarter)}
                        </th>
                     </>
                  }
               >
                  {company.metrics.map((metric) => (
                     <tr key={metric.key}>
                        <td className={TD}>{t(METRIC_LABELS[metric.key])}</td>
                        {previous && (
                           <td
                              className={clsx(
                                 TD,
                                 'text-ink-soft text-right tabular-nums',
                              )}
                           >
                              {formatMetric(
                                 t,
                                 metric,
                                 metric.values[previous] ?? null,
                                 language,
                              )}
                           </td>
                        )}
                        <td
                           className={clsx(
                              TD,
                              'text-right font-semibold tabular-nums',
                           )}
                        >
                           {formatMetric(
                              t,
                              metric,
                              metric.values[quarter] ?? null,
                              language,
                           ) || '—'}
                        </td>
                     </tr>
                  ))}
               </Table>
            ) : (
               <ModalBody>
                  <p>{t('Показатели этой компании ещё не перенесены.')}</p>
               </ModalBody>
            )}
         </div>
         <ModalFooter
            note={t('После подтверждения показатели попадут в дашборд')}
         >
            <Button variant='ghost' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button
               onClick={async () => {
                  if (company)
                     await portfolio.confirmMetrics(
                        company.id,
                        quarter,
                        user.id,
                     );
                  onClose();
               }}
            >
               {t('Подтвердить показатели')}
            </Button>
         </ModalFooter>
      </Modal>
   );
};

export default MetricsDialog;

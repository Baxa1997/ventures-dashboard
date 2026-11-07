import InlineRows from '@modules/Deals/components/InlineRows';
import deals from '@modules/Deals/services';
import { Card, FactList } from '@shared/components';
import type { Deal, Fact } from '@shared/types/deals.types';
import { useTranslation } from 'react-i18next';

interface SynergyCardProps {
   deal: Deal;
   editable: boolean;
}

/* «Синергия с SQB»: what the company could bring the bank (settlements,
   lending, jobs), as the company states it. While the deal is open the rows
   are typed where they stand. */
const SynergyCard = ({ deal, editable }: SynergyCardProps) => {
   const { t } = useTranslation('deals');
   const rows = deal.synergy ?? [];

   return (
      <Card
         hint={rows.length ? t('заявлено компанией') : undefined}
         title={t('Синергия с SQB')}
      >
         {editable ? (
            <div className='text-meta px-5 py-2'>
               {!rows.length && (
                  <p className='text-ink-soft pt-1 pb-2'>
                     {t(
                        'Что компания даст банку: расчёты, кредитование, рабочие места.',
                     )}
                  </p>
               )}
               <InlineRows
                  addLabel={t('Добавить направление')}
                  max={6}
                  placeholders={{
                     label: t('Направление'),
                     value: t('Что даёт банку'),
                     note: t('Комментарий'),
                  }}
                  rows={rows.map(([label, value, note]) => ({
                     label,
                     value,
                     note: note ?? '',
                  }))}
                  onSave={(next) =>
                     deals.setSynergy(
                        deal.id,
                        next.map(
                           ({ label, value, note }): Fact =>
                              note ? [label, value, note] : [label, value],
                        ),
                     )
                  }
               />
            </div>
         ) : rows.length ? (
            <div className='text-meta px-5 py-1'>
               <FactList
                  divided
                  labelWidth='6.5rem'
                  rows={rows.map(([label, value, note]) => ({
                     label,
                     value,
                     note,
                  }))}
               />
            </div>
         ) : (
            <p className='text-ink-soft text-meta px-5 py-4'>
               {t('Синергия не вносилась.')}
            </p>
         )}
      </Card>
   );
};

export default SynergyCard;

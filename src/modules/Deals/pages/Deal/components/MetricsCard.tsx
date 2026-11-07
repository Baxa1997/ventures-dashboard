import InlineRows from '@modules/Deals/components/InlineRows';
import deals from '@modules/Deals/services';
import { Card, InlineField } from '@shared/components';
import type { Deal } from '@shared/types/deals.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface MetricsCardProps {
   deal: Deal;
   editable: boolean;
}

/* «Метрики, проверенные DD»: the figures DD confirmed, each with a remark;
   what the company only claimed stays out. The owner enters them after DD. */
const MetricsCard = ({ deal, editable }: MetricsCardProps) => {
   const { t } = useTranslation('deals');
   const metrics = deal.metrics;
   const hint = metrics?.hint ?? '';
   const note = metrics?.note ?? '';
   const items = metrics?.items ?? [];

   const save = (patch: Partial<NonNullable<Deal['metrics']>>) =>
      deals.setMetrics(deal.id, { hint, items, note, ...patch });

   if (editable)
      return (
         <Card title={t('Метрики, проверенные DD')}>
            <div className='grid gap-3 p-5'>
               {!items.length && (
                  <p className='text-ink-soft text-meta'>
                     {t(
                        'Сюда попадают только цифры, которые подтвердил DD: выручка, GMV, EBITDA, удержание. Заявленное компанией без проверки сюда не вносится.',
                     )}
                  </p>
               )}
               <div className='text-meta grid gap-x-4 sm:grid-cols-[6rem_minmax(0,16rem)]'>
                  <span className='text-ink-soft py-0.5'>{t('Период')}</span>
                  <InlineField
                     label={t('Период')}
                     maxLength={40}
                     placeholder={t('например, «факт 2025»')}
                     value={hint}
                     onSave={(next) => save({ hint: next })}
                  />
               </div>
               <InlineRows
                  tiles
                  addLabel={t('Показатель')}
                  max={8}
                  placeholders={{
                     label: t('Показатель'),
                     value: t('Значение'),
                     note: t('Комментарий'),
                  }}
                  rows={items.map((item) => ({ ...item }))}
                  warnLabel={t('Выделить')}
                  onSave={(next) =>
                     save({
                        items: next.map(({ label, value, note: remark, warn }) => ({
                           label,
                           value,
                           note: remark,
                           ...(warn && { warn }),
                        })),
                     })
                  }
               />
               <div className='text-meta grid gap-x-4 sm:grid-cols-[6rem_minmax(0,1fr)]'>
                  <span className='text-ink-soft py-0.5'>{t('Источник')}</span>
                  <InlineField
                     label={t('Источник')}
                     placeholder={t('чей DD и когда: так ИК видит, откуда цифры')}
                     value={note}
                     onSave={(next) => save({ note: next })}
                  />
               </div>
            </div>
         </Card>
      );

   return (
      <Card hint={metrics?.hint || undefined} title={t('Метрики, проверенные DD')}>
         {metrics ? (
            <div className='p-5'>
               <dl className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
                  {metrics.items.map((item) => (
                     <div
                        key={item.label}
                        className='bg-ground rounded-lg px-4 py-3'
                     >
                        <dt className='text-ink-soft text-xs'>{item.label}</dt>
                        <dd>
                           <div className='mt-1 text-xl leading-7 font-bold'>
                              {item.value}
                           </div>
                           <div
                              className={clsx(
                                 'mt-1 text-xs',
                                 item.warn
                                    ? 'text-warning-ink'
                                    : 'text-ink-soft',
                              )}
                           >
                              {item.note}
                           </div>
                        </dd>
                     </div>
                  ))}
               </dl>
               {metrics.note && (
                  <p className='text-ink-soft mt-3.5 text-xs'>{metrics.note}</p>
               )}
            </div>
         ) : (
            <p className='text-ink-soft text-meta px-5 py-4'>
               {t('Метрики не вносились.')}
            </p>
         )}
      </Card>
   );
};

export default MetricsCard;

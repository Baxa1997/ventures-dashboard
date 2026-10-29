import { formatAmount, isOpen, reasonText } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { listName, listOf, nameOf } from '@modules/Settings/services';
import { Card, Field } from '@shared/components';
import { TEAM } from '@shared/constants';
import { shortName } from '@shared/helpers';
import { useAction, useCurrentUser } from '@shared/hooks';
import type { Deal, NewDealInput } from '@shared/types/deals.types';
import type { ListKind } from '@shared/types/settings.types';
import { useTranslation } from 'react-i18next';

interface ParamsCardProps {
   deal: Deal;
}

const SELECT = 'field-input text-meta h-8 text-ink';

// What updateDetails writes: the deal's details as they are.
const detailsOf = (deal: Deal): NewDealInput => ({
   company: deal.company,
   about: deal.about,
   industryKey: deal.industryKey,
   industry: deal.industry,
   source: deal.source,
   amount: deal.amount,
   country: deal.country,
   roundStage: deal.roundStage,
});

/* «Параметры сделки», as the prototype has them: the amount asked for, and
   the owner, the round's stage and the source, each changed where it stands
   while the deal is open; a refused deal shows its reason. */
const ParamsCard = ({ deal }: ParamsCardProps) => {
   const { t, i18n } = useTranslation('deals');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const user = useCurrentUser();
   const editable = isOpen(deal);
   const owning = useAction(
      (ownerId: string) => deals.setOwner(deal.id, ownerId),
      { success: t('Владелец назначен') },
   );
   const saving = useAction((patch: Partial<NewDealInput>) =>
      deals.updateDetails(deal.id, { ...detailsOf(deal), ...patch }, user.id),
   );

   // a list's rows in use, and the deal's own value if the list lost it
   const options = (kind: ListKind, value: string) => [
      ...(value && !listOf(kind).some(({ key }) => key === value)
         ? [{ value, label: listName(kind, value) }]
         : []),
      ...listOf(kind).map((item) => ({ value: item.key, label: nameOf(item) })),
   ];

   return (
      <Card title={t('Параметры сделки')}>
         <div className='grid gap-3 px-4.5 py-3.5'>
            <div>
               <div className='text-ink-soft text-xs font-medium'>
                  {t('Запрашиваемая сумма')}
               </div>
               <div className='text-ink-strong mt-0.5 text-[22px] leading-7 font-extrabold tabular-nums'>
                  {formatAmount(deal.amount, language)}
               </div>
            </div>
            <Field label={t('Владелец')}>
               <select
                  className={SELECT}
                  disabled={!editable || owning.pending}
                  value={deal.ownerId || deal.proposedOwnerId}
                  onChange={(event) => owning.run(event.target.value)}
               >
                  <option value=''>{t('Не назначен')}</option>
                  {TEAM.map(({ id, name }) => (
                     <option key={id} value={id}>
                        {shortName(name)}
                     </option>
                  ))}
               </select>
            </Field>
            <Field label={t('Стадия раунда')}>
               <select
                  className={SELECT}
                  disabled={!editable || saving.pending}
                  value={deal.roundStage}
                  onChange={(event) =>
                     saving.run({ roundStage: event.target.value })
                  }
               >
                  {!deal.roundStage && <option value=''>—</option>}
                  {options('rounds', deal.roundStage).map(
                     ({ value, label }) => (
                        <option key={value} value={value}>
                           {label}
                        </option>
                     ),
                  )}
               </select>
            </Field>
            <Field label={t('Источник')}>
               <select
                  className={SELECT}
                  disabled={!editable || saving.pending}
                  value={deal.source}
                  onChange={(event) =>
                     saving.run({ source: event.target.value })
                  }
               >
                  {!deal.source && <option value=''>—</option>}
                  {options('sources', deal.source).map(({ value, label }) => (
                     <option key={value} value={value}>
                        {label}
                     </option>
                  ))}
               </select>
            </Field>
            {deal.closed?.reason && (
               <div>
                  <div className='text-ink-soft text-xs font-medium'>
                     {t('Причина отказа')}
                  </div>
                  <div className='text-meta mt-1'>
                     {reasonText(deal.closed.reason)}
                  </div>
               </div>
            )}
         </div>
      </Card>
   );
};

export default ParamsCard;

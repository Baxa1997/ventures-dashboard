import { CommitteeLink } from '@modules/Deals/components';
import { STAGE_HOW } from '@modules/Deals/constants';
import { COMMITTEE_STAGES, dueText, nextTitle } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { Card, FilterSelect } from '@shared/components';
import { TEAM } from '@shared/constants';
import { personName, shortName } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import type { DealStage } from '@shared/types/work.types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface NextStepProps {
   deal: Deal;
}

type TabLabel =
   | 'Открыть оценку'
   | 'Открыть «Запросы и документы»'
   | 'Открыть «Due diligence»';

// The tab of the card where a stage's work is done.
const STAGE_TABS: Partial<Record<DealStage, [tab: string, label: TabLabel]>> = {
   screening: ['screening', 'Открыть оценку'],
   analysis: ['requests', 'Открыть «Запросы и документы»'],
   dd: ['dd', 'Открыть «Due diligence»'],
};

/* What the deal's owner does now: the step and its deadline, what the stage
   asks for and how the deal moves on, with a link to where it is done. A deal
   without an owner gets one here; the director may hand it to someone else. */
const NextStep = ({ deal }: NextStepProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   const active = deal.status === 'active';
   // an application not taken yet has its own buttons in the header
   const open = active || deal.status === 'review';
   const canAssign =
      active &&
      (!deal.ownerId || user.role === 'director' || user.id === deal.ownerId);

   const tab = STAGE_TABS[deal.stage];
   const where = !active ? null : COMMITTEE_STAGES.includes(deal.stage) ? (
      <CommitteeLink deal={deal} />
   ) : (
      tab && (
         <Link className='link' to={`?tab=${tab[0]}`}>
            {t(tab[1])}
         </Link>
      )
   );

   return (
      <Card title={t('Следующий шаг')}>
         <div className='px-5 py-4'>
            <div className='font-medium'>{nextTitle(t, deal)}</div>
            {deal.next && (
               <div className='text-ink-soft text-meta mt-1'>
                  {dueText(t, deal.next)}
               </div>
            )}
            {open && (
               <p className='text-meta mt-3'>{t(STAGE_HOW[deal.stage])}</p>
            )}
            {where && <div className='text-meta mt-3'>{where}</div>}
            {active && (
               <div className='border-line mt-4 border-t pt-3'>
                  {canAssign ? (
                     <FilterSelect
                        accent={!deal.ownerId}
                        label={t('Владелец')}
                        options={[
                           ...(deal.ownerId
                              ? []
                              : [{ value: '', label: t('не назначен') }]),
                           ...TEAM.map(({ id, name }) => ({
                              value: id,
                              label: shortName(name),
                           })),
                        ]}
                        showLabel
                        value={deal.ownerId}
                        onChange={(ownerId) =>
                           ownerId && deals.setOwner(deal.id, ownerId)
                        }
                     />
                  ) : (
                     <span className='text-ink-soft text-meta'>
                        {t('Владелец')}: {personName(deal.ownerId)}
                     </span>
                  )}
                  {!deal.ownerId && (
                     <p className='text-warning-ink mt-1.5 text-xs'>
                        {t(
                           'Назначьте владельца: он ведёт сделку и докладывает её на комитете.',
                        )}
                     </p>
                  )}
               </div>
            )}
         </div>
      </Card>
   );
};

export default NextStep;

import { stageName } from '@modules/Settings/services';
import { CommitteeLink, PortfolioDialog } from '@modules/Deals/components';
import {
   COMMITTEE_STAGES,
   committeeStateOf,
   dueText,
   exitConditions,
   nextStageOf,
   nextStepOf,
} from '@modules/Deals/helpers';
import { useDealLinks } from '@modules/Deals/hooks';
import deals from '@modules/Deals/services';
import { PORTFOLIO_PATH } from '@modules/Portfolio/constants';
import { Button, Card, CheckList, FilterSelect } from '@shared/components';
import { TEAM } from '@shared/constants';
import { personName, shortName } from '@shared/helpers';
import { useAction, useCurrentUser } from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import type { DealStage } from '@shared/types/work.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface NextStepProps {
   deal: Deal;
   onTransfer: () => void; // opens the move to the next stage
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

/* What the deal's owner does now: the step from where the deal stands, what
   still holds the move to the next stage, and where it is done; once the deal
   is ready, the move itself. A deal without an owner gets one here; the
   director may hand it to someone else. A deal in the portfolio links to its
   company there. */
const NextStep = ({ deal, onTransfer }: NextStepProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   const { tasks, company, loaded } = useDealLinks(deal.id);
   const [adding, setAdding] = useState(false);
   const assigning = useAction(
      (ownerId: string) => deals.setOwner(deal.id, ownerId),
      { success: t('Владелец назначен') },
   );
   const active = deal.status === 'active';
   const canAssign =
      active &&
      (!deal.ownerId || user.role === 'director' || user.id === deal.ownerId);
   const step = nextStepOf(t, deal, tasks);
   const exit = active ? exitConditions(t, deal, tasks) : [];
   const next = nextStageOf(deal.stage);
   const target = next ? stageName(next) : t('Портфель');

   const tab = STAGE_TABS[deal.stage];
   // the meeting while the deal waits for one; once the committee has spoken,
   // the step is the move or the rejection
   const decided = ['approved', 'rejected'].includes(committeeStateOf(deal));
   const where = !active
      ? null
      : COMMITTEE_STAGES.includes(deal.stage)
        ? !decided && <CommitteeLink deal={deal} />
        : tab && (
             <Link className='link' to={`?tab=${tab[0]}`}>
                {t(tab[1])}
             </Link>
          );

   return (
      <Card title={t('Следующий шаг')}>
         <div className='px-5 py-4'>
            <div className='font-medium'>{step.title}</div>
            {(active || deal.status === 'review') && deal.next && (
               <div className='text-ink-soft text-meta mt-1'>
                  {dueText(t, deal.next)}
               </div>
            )}
            {step.text && <p className='text-meta mt-3'>{step.text}</p>}
            {where && <div className='text-meta mt-3'>{where}</div>}
            {exit.length > 0 && (
               <div className='border-line mt-4 border-t pt-3'>
                  <div className='text-ink-soft text-xs font-medium'>
                     {t('Для перевода в «{{stage}}»', { stage: target })}
                  </div>
                  <CheckList className='text-meta mt-2.5' items={exit} />
               </div>
            )}
            {step.ready && (
               <Button className='mt-4' onClick={onTransfer}>
                  {step.ready}
               </Button>
            )}
            {deal.status === 'portfolio' &&
               loaded &&
               (company ? (
                  <Link
                     className='link text-meta mt-3 inline-block'
                     to={`${PORTFOLIO_PATH}/${company.id}`}
                  >
                     {t('Открыть компанию в «Портфеле»')}
                  </Link>
               ) : (
                  <div className='bg-warning-tint text-warning-ink text-meta mt-3 rounded-lg px-4 py-3'>
                     <p>
                        {t(
                           'Компании этой сделки в «Портфеле» ещё нет: укажите инвестицию фонда, и она появится там.',
                        )}
                     </p>
                     <Button className='mt-3' onClick={() => setAdding(true)}>
                        {t('Добавить в портфель')}
                     </Button>
                  </div>
               ))}
            {active && (
               <div className='border-line mt-4 border-t pt-3'>
                  {canAssign ? (
                     <FilterSelect
                        accent={!deal.ownerId}
                        busy={assigning.pending}
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
                           ownerId && assigning.run(ownerId)
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
         <PortfolioDialog
            deal={adding ? deal : null}
            onClose={() => setAdding(false)}
         />
      </Card>
   );
};

export default NextStep;

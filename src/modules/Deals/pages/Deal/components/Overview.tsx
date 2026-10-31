import { RisksCard } from '@modules/Deals/components';
import { FIELD_FACTS } from '@modules/Deals/constants';
import {
   COMMITTEE_STAGES,
   committeeStateOf,
   countryText,
   factRows,
   hasTermsStage,
   isOpen,
} from '@modules/Deals/helpers';
import { Card, FactList, STACK } from '@shared/components';
import { formatNumericDate } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import type { DealStage } from '@shared/types/work.types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import CabinetCard from './CabinetCard';
import CapitalCard from './CapitalCard';
import MandateCard from './MandateCard';
import MetricsCard from './MetricsCard';
import NextStep from './NextStep';
import ParamsCard from './ParamsCard';
import ReadinessCard from './ReadinessCard';
import RelatedCard from './RelatedCard';
import StageCard from './StageCard';
import SynergyCard from './SynergyCard';
import TasksCard from './TasksCard';
import TeamCard from './TeamCard';
import TermsCard from './TermsCard';

interface OverviewProps {
   deal: Deal;
   onTransfer: () => void; // opens the move to the next stage
   onEdit: () => void; // opens the deal's details
   onMove: () => void; // opens the move to any stage or status
}

// The stages from which DD's confirmed metrics are kept.
const METRICS_STAGES: DealStage[] = ['dd', 'ic2', 'board', 'closing'];

/* The deal at a glance, as the prototype lays it out: what the company is
   and what the fund knows of it on the left — its details, its capital, its
   team in the cabinet, and from ИК-1 on the terms, DD's metrics and risks, the synergy with the bank and
   the owner's team; on the right the deal's parameters, what to do next,
   where it is on its way, its open tasks and where else it is in the panel.
   A new application shows its mandate check; a deal on a committee stage
   the readiness of its materials, until the committee decides. */
const Overview = ({ deal, onTransfer, onEdit, onMove }: OverviewProps) => {
   const { t } = useTranslation('deals');
   const editable = isOpen(deal);
   // a section to fill in while the deal is open, or one already written
   const shown = (written: boolean) =>
      written || (editable && hasTermsStage(deal));
   const terms = shown(!!deal.terms);
   const metrics =
      shown(!!deal.metrics) &&
      (!!deal.metrics || METRICS_STAGES.includes(deal.stage));
   const risks = shown(!!deal.risks);
   const synergy = shown(!!deal.synergy);
   const preparing =
      deal.status === 'active' &&
      COMMITTEE_STAGES.includes(deal.stage) &&
      !['approved', 'rejected'].includes(committeeStateOf(deal));

   return (
      <div className='gap-section grid flex-1 items-start xl:grid-cols-[minmax(0,1fr)_21.25rem]'>
         <div className={STACK}>
            <Card
               action={
                  editable && (
                     <button type='button' className='link' onClick={onEdit}>
                        {t('Изменить')}
                     </button>
                  )
               }
               title={t('О компании')}
            >
               {deal.about && (
                  <div className='border-line border-b px-4.5 py-3.5'>
                     <p className='max-w-[72ch]'>{deal.about}</p>
                  </div>
               )}
               <div className='text-meta px-4.5 py-3.5'>
                  <FactList
                     labelWidth='10.5rem'
                     rows={[
                        { label: t('Юр. лицо'), value: deal.legalName || '—' },
                        { label: t('ИНН'), value: deal.tin || '—' },
                        {
                           label: t('Год основания'),
                           value: String(deal.foundedYear ?? '—'),
                        },
                        {
                           label: t('Сотрудников'),
                           value: String(deal.employees ?? '—'),
                        },
                        { label: t('Регион'), value: countryText(deal) || '—' },
                        { label: t('Сайт'), value: deal.website || '—' },
                        {
                           label: t('Контакты'),
                           value:
                              [deal.applicantEmail, deal.applicantPhone]
                                 .filter(Boolean)
                                 .join(' · ') || '—',
                        },
                        {
                           label: t('Заявка подана'),
                           value: formatNumericDate(
                              deal.receivedAt.slice(0, 10),
                           ),
                        },
                        ...factRows(
                           t,
                           (deal.facts ?? []).filter(
                              ([label]) => !FIELD_FACTS.includes(label),
                           ),
                        ),
                     ].filter(({ value }) => value)}
                  />
               </div>
            </Card>
            <CapitalCard deal={deal} editable={editable} />
            <CabinetCard deal={deal} />
            {terms && <TermsCard deal={deal} editable={editable} />}
            {metrics && <MetricsCard deal={deal} editable={editable} />}
            {risks && (
               <RisksCard
                  deal={deal}
                  editable={editable}
                  link={
                     <Link className='link' to='?tab=dd'>
                        {t('Матрица рисков')}
                     </Link>
                  }
                  title={t('Риски из DD')}
               />
            )}
            {synergy && <SynergyCard deal={deal} editable={editable} />}
            <TeamCard deal={deal} editable={editable} />
         </div>

         <div className={STACK}>
            <ParamsCard deal={deal} />
            {deal.status === 'review' && <MandateCard deal={deal} />}
            {(deal.next ||
               deal.status === 'active' ||
               deal.status === 'review' ||
               deal.status === 'portfolio') && (
               <NextStep deal={deal} onTransfer={onTransfer} />
            )}
            {preparing && <ReadinessCard deal={deal} editable={editable} />}
            <StageCard deal={deal} onMove={onMove} />
            <TasksCard deal={deal} />
            <RelatedCard deal={deal} />
         </div>
      </div>
   );
};

export default Overview;

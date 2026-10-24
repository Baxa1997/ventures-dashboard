import { stageName } from '@modules/Settings/services';
import { RisksCard } from '@modules/Deals/components';
import { FIELD_FACTS } from '@modules/Deals/constants';
import {
   COMMITTEE_STAGES,
   committeeStateOf,
   countryText,
   defaultPath,
   hasTermsStage,
   industryText,
   isOpen,
   pathHintOf,
   roundText,
   sourceLine,
   factRows,
   formatAmount,
   formatStamp,
   pathState,
} from '@modules/Deals/helpers';
import { Card, FactList, STACK } from '@shared/components';
import type { Deal } from '@shared/types/deals.types';
import type { DealStage } from '@shared/types/work.types';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import MetricsCard from './MetricsCard';
import NextStep from './NextStep';
import ReadinessCard from './ReadinessCard';
import RelatedCard from './RelatedCard';
import StagePanel from './StagePanel';
import SynergyCard from './SynergyCard';
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

/* The deal at a glance: where it is on its path, then what the fund knows
   of it and what it does next. Before the first committee that is the
   application; from ИК-1 on, the terms, DD's metrics and risks and the
   synergy with the bank, which the owner writes here (a closed deal shows
   only those written). On a committee stage the materials for the meeting
   come first, until the committee decides. */
const Overview = ({ deal, onTransfer, onEdit, onMove }: OverviewProps) => {
   const { t, i18n } = useTranslation('deals');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const path = deal.path ?? defaultPath(t, deal);
   // the stage opened under the path: the deal's own until another is clicked
   const [selected, setSelected] = useState<string | null>(null);
   const chosen =
      path.find((step) => step.stage === (selected ?? deal.stage)) ??
      path.find((step) => pathState(deal, step.stage) === 'current') ??
      path[0];
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
   const movable = deal.status !== 'portfolio';
   const preparing =
      deal.status === 'active' &&
      COMMITTEE_STAGES.includes(deal.stage) &&
      !['approved', 'rejected'].includes(committeeStateOf(deal));

   return (
      <div className='gap-section flex flex-1 flex-col'>
         <Card
            action={
               <span className='flex gap-4'>
                  {movable && (
                     <button type='button' className='link' onClick={onMove}>
                        {t('Сменить этап')}
                     </button>
                  )}
                  <Link className='link' to='?tab=history'>
                     {t('Журнал переходов')}
                  </Link>
               </span>
            }
            hint={deal.pathHint ?? pathHintOf(t, deal)}
            title={t('Путь сделки')}
         >
            {/* a timeline: as many stages as the fund has, each at least
                9.5rem wide; a long name wraps, and a path wider than the card
                scrolls sideways */}
            <ol className='flex overflow-x-auto'>
               {path.map((step) => {
                  const state = pathState(deal, step.stage);
                  return (
                     <li
                        key={step.stage}
                        aria-current={state === 'current' ? 'step' : undefined}
                        className={clsx(
                           'border-line relative min-w-38 flex-1 basis-0 border-l px-3 py-3 first:border-l-0',
                           step === chosen &&
                              'shadow-[inset_0_-2px_0_var(--color-accent)]',
                           state !== 'current' && 'hover:bg-ground',
                           state === 'current' && 'bg-accent-tint',
                        )}
                     >
                        {/* the whole cell opens the stage under the path */}
                        <button
                           type='button'
                           aria-label={t('Открыть этап «{{stage}}»', {
                              stage: stageName(step.stage),
                           })}
                           aria-pressed={step === chosen}
                           className='absolute inset-0 cursor-pointer focus-visible:-outline-offset-2'
                           onClick={() => setSelected(step.stage)}
                        />
                        <div className='flex items-start gap-1.5'>
                           <span
                              aria-hidden
                              className={clsx(
                                 'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full',
                                 state === 'done' &&
                                    (step.late
                                       ? 'bg-warning-ink text-white'
                                       : 'bg-success-ink text-white'),
                                 state === 'current' &&
                                    'border-accent border-2 after:bg-accent after:size-1.5 after:rounded-full',
                                 state === 'ahead' &&
                                    'border-line-strong border',
                              )}
                           >
                              {state === 'done' && (
                                 <Check className='size-3' strokeWidth={3.5} />
                              )}
                           </span>
                           <span
                              className={clsx(
                                 'text-meta min-w-0 font-semibold [overflow-wrap:anywhere]',
                                 state === 'ahead' &&
                                    'text-ink-soft font-normal',
                              )}
                           >
                              {stageName(step.stage)}
                           </span>
                        </div>
                        <div className='text-ink-soft mt-1.5 text-xs'>
                           {step.line1}
                        </div>
                        <div
                           className={clsx(
                              'mt-1 text-xs',
                              state === 'current'
                                 ? 'text-accent'
                                 : step.late
                                   ? 'text-warning-ink'
                                   : 'text-ink-soft',
                           )}
                        >
                           {step.line2}
                        </div>
                     </li>
                  );
               })}
            </ol>
            {chosen && (
               <StagePanel
                  key={chosen.stage}
                  deal={deal}
                  state={pathState(deal, chosen.stage)}
                  step={chosen}
               />
            )}
         </Card>

         <div className='gap-section grid flex-1 xl:grid-cols-[minmax(0,1fr)_23.75rem]'>
            <div className={STACK}>
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
               <Card
                  action={
                     <button type='button' className='link' onClick={onEdit}>
                        {t('Изменить')}
                     </button>
                  }
                  title={t('Заявка')}
               >
                  <div className='text-meta px-5 py-3'>
                     <FactList
                        divided
                        labelWidth='27%'
                        rows={[
                           ...(deal.about
                              ? [
                                   {
                                      label: t('Чем занимается'),
                                      value: deal.about,
                                   },
                                ]
                              : []),
                           { label: t('Отрасль'), value: industryText(deal) },
                           {
                              label: t('Запрос'),
                              value: formatAmount(deal.amount, language),
                           },
                           {
                              label: t('Стадия раунда'),
                              value: roundText(deal),
                           },
                           { label: t('География'), value: countryText(deal) },
                           { label: t('Источник'), value: sourceLine(t, deal) },
                           {
                              label: t('Поступила'),
                              value: formatStamp(deal.receivedAt),
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
            </div>

            <div className={STACK}>
               {preparing && <ReadinessCard deal={deal} editable={editable} />}
               {(deal.next ||
                  deal.status === 'active' ||
                  deal.status === 'review' ||
                  deal.status === 'portfolio') && (
                  <NextStep deal={deal} onTransfer={onTransfer} />
               )}
               <TeamCard deal={deal} editable={editable} />
               {synergy && <SynergyCard deal={deal} editable={editable} />}
               <RelatedCard deal={deal} />
            </div>
         </div>
      </div>
   );
};

export default Overview;

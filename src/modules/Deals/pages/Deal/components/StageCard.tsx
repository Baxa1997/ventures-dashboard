import { defaultPath, pathHintOf, pathState } from '@modules/Deals/helpers';
import { stageItem, stageName } from '@modules/Settings/services';
import { Badge, type BadgeTone, Card, FactList } from '@shared/components';
import type { Deal } from '@shared/types/deals.types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface StageCardProps {
   deal: Deal;
   onMove: () => void; // any stage or status
}

type StepState = 'done' | 'current' | 'ahead';

const STATES = {
   done: { label: 'Пройден', tone: 'success' },
   current: { label: 'Текущий', tone: 'accent' },
   ahead: { label: 'Впереди', tone: 'neutral' },
} as const satisfies Record<StepState, { label: string; tone: BadgeTone }>;

/* Where the deal is on its way, under the stepper: the current stage, when
   it began and how many of its days are used, its norm and when its clock
   stands. «Сменить этап» moves it anywhere; the journal lists every move. */
const StageCard = ({ deal, onMove }: StageCardProps) => {
   const { t } = useTranslation('deals');
   const path = deal.path ?? defaultPath(t, deal);
   const step =
      path.find(({ stage }) => pathState(deal, stage) === 'current') ??
      path.find(({ stage }) => stage === deal.stage) ??
      path[path.length - 1];
   if (!step) return null;
   const state = pathState(deal, step.stage);
   const item = stageItem(step.stage);

   return (
      <Card
         action={
            <span className='flex gap-4'>
               {deal.status !== 'portfolio' && (
                  <button type='button' className='link' onClick={onMove}>
                     {t('Сменить этап')}
                  </button>
               )}
               <Link className='link' to='?tab=history'>
                  {t('Журнал переходов')}
               </Link>
            </span>
         }
         title={t('Путь сделки')}
      >
         <div className='px-4.5 py-3.5'>
            <div className='flex flex-wrap items-center gap-2.5'>
               <span className='font-semibold'>{stageName(step.stage)}</span>
               <Badge tone={STATES[state].tone}>{t(STATES[state].label)}</Badge>
            </div>
            <FactList
               className='text-meta mt-2'
               labelWidth='8rem'
               rows={[
                  { label: t('Сроки'), value: step.line1 },
                  { label: t('Итог'), value: step.line2 },
                  {
                     label: t('Норма'),
                     value: item?.norm || t('по графику заседаний'),
                  },
                  { label: t('Часы стоят, когда'), value: item?.paused ?? '' },
               ].filter(({ value }) => value)}
            />
            <p className='text-ink-soft mt-2 text-xs'>
               {deal.pathHint ?? pathHintOf(t, deal)}
            </p>
         </div>
      </Card>
   );
};

export default StageCard;

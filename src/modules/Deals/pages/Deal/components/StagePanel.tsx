import { stageKeys } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { stageItem, stageName } from '@modules/Settings/services';
import {
   Badge,
   type BadgeTone,
   Button,
   ConfirmDialog,
   FactList,
} from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type { Deal, PathStep } from '@shared/types/deals.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type StepState = 'done' | 'current' | 'ahead';

interface StagePanelProps {
   deal: Deal;
   step: PathStep;
   state: StepState;
}

const STATES = {
   done: { label: 'Пройден', tone: 'success' },
   current: { label: 'Текущий', tone: 'accent' },
   ahead: { label: 'Впереди', tone: 'neutral' },
} as const satisfies Record<StepState, { label: string; tone: BadgeTone }>;

// The statuses a deal keeps when it goes back a stage.
const KEEPS_STATUS = ['active', 'paused', 'withdrawn'];

/* The stage chosen on «Путь сделки»: when it was passed and in how many
   days, its norm and when its clock stands. A stage the deal has passed
   takes it back, after a confirmation: that stage is current again, the ones
   after it are not passed any more, and the deal keeps its status. */
const StagePanel = ({ deal, step, state }: StagePanelProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   const [returning, setReturning] = useState(false);
   const item = stageItem(step.stage);
   const name = stageName(step.stage);
   const keys = stageKeys();
   // the stages that will not be passed any more, up to the current one
   const undone = keys
      .slice(keys.indexOf(step.stage) + 1, keys.indexOf(deal.stage) + 1)
      .map(stageName);
   const canReturn = state === 'done' && KEEPS_STATUS.includes(deal.status);

   return (
      <div className='border-line border-t px-5 py-4'>
         <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex items-center gap-2.5'>
               <span className='font-semibold'>{name}</span>
               <Badge tone={STATES[state].tone}>{t(STATES[state].label)}</Badge>
            </div>
            {canReturn && (
               <Button variant='ghost' onClick={() => setReturning(true)}>
                  {t('Вернуть на этот этап')}
               </Button>
            )}
         </div>
         <FactList
            className='text-meta mt-2'
            labelWidth='9rem'
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
         <ConfirmDialog
            confirmLabel={t('Вернуть')}
            error={t('Не удалось вернуть сделку на этап')}
            open={returning}
            subtitle={deal.company}
            success={t('Сделка возвращена на этап «{{stage}}»', {
               stage: name,
            })}
            title={t('Вернуть сделку на этап «{{stage}}»?', { stage: name })}
            onClose={() => setReturning(false)}
            onConfirm={() => deals.stepBack(deal.id, step.stage, user.id)}
         >
            <p>
               {t(
                  '«{{stage}}» снова станет текущим этапом, а пройденные после него — {{stages}} — станут непройденными. Статус сделки не изменится, переход попадёт в историю.',
                  { stage: name, stages: undone.join(', ') },
               )}
            </p>
         </ConfirmDialog>
      </div>
   );
};

export default StagePanel;

import {
   columnTone,
   defaultPath,
   isOpen,
   nextStageOf,
   pathState,
   stageKeys,
} from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { stageName } from '@modules/Settings/services';
import { ConfirmDialog, TONE_COLORS } from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type { Deal, PathStep } from '@shared/types/deals.types';
import clsx from 'clsx';
import { type CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DealStepperProps {
   deal: Deal;
   onTransfer: () => void; // to the next stage, with its conditions
   onMove: (stage: string) => void; // to any stage further on
}

// The statuses a deal keeps when it goes back a stage.
const KEEPS_STATUS = ['active', 'paused', 'withdrawn'];

/* The stages of the deal as the prototype's stepper: the current one tinted
   in its part of the way's colour, the passed ones underlined in it. Each step tells its dates and days on hover. A click moves
   the deal there: to the next stage with its conditions, further on through
   «Сменить этап», back to a passed stage after a confirmation — that stage
   is current again and the ones after it not passed, the status kept. */
const DealStepper = ({ deal, onTransfer, onMove }: DealStepperProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   const path = deal.path ?? defaultPath(t, deal);
   const [back, setBack] = useState<PathStep | null>(null);
   const next = nextStageOf(deal.stage);
   const keys = stageKeys();
   // the stages that will not be passed any more, up to the current one
   const undone = back
      ? keys
           .slice(keys.indexOf(back.stage) + 1, keys.indexOf(deal.stage) + 1)
           .map(stageName)
      : [];

   const actionOf = (step: PathStep) => {
      const state = pathState(deal, step.stage);
      if (state === 'done' && KEEPS_STATUS.includes(deal.status))
         return () => setBack(step);
      if (state !== 'ahead' || !isOpen(deal)) return undefined;
      return deal.status === 'active' && step.stage === next
         ? onTransfer
         : () => onMove(step.stage);
   };

   return (
      <>
         <ol
            aria-label={t('Путь сделки')}
            className='print-hidden mb-4 flex gap-1 overflow-x-auto'
         >
            {path.map((step) => {
               const state = pathState(deal, step.stage);
               const action = actionOf(step);
               const name = stageName(step.stage);
               return (
                  <li key={step.stage} className='min-w-28 flex-1'>
                     <button
                        type='button'
                        aria-current={state === 'current' ? 'step' : undefined}
                        className={clsx(
                           'border-line flex w-full items-center justify-center gap-1.5 rounded-md border border-b-3 px-2.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors',
                           state === 'current'
                              ? 'text-ink-strong border-b-(--c) bg-[color-mix(in_srgb,var(--c)_14%,white)]'
                              : 'text-ink-soft bg-white',
                           state === 'done' &&
                              'border-b-[color-mix(in_srgb,var(--c)_50%,var(--color-line))]',
                           action
                              ? 'hover:text-ink-strong cursor-pointer'
                              : 'cursor-default',
                           action && state !== 'current' && 'hover:bg-hover',
                        )}
                        aria-disabled={!action || undefined}
                        style={
                           {
                              '--c': TONE_COLORS[columnTone(step.stage)],
                           } as CSSProperties
                        }
                        data-hint={[
                           name,
                           step.line1,
                           step.line2,
                           action &&
                              (state === 'done'
                                 ? t(
                                      'Нажмите, чтобы вернуть сделку на этот этап',
                                   )
                                 : t(
                                      'Нажмите, чтобы перевести сделку на этот этап',
                                   )),
                        ]
                           .filter(Boolean)
                           .join(' · ')}
                        onClick={action}
                     >
                        <span className='truncate'>{name}</span>
                     </button>
                  </li>
               );
            })}
         </ol>
         <ConfirmDialog
            confirmLabel={t('Вернуть')}
            error={t('Не удалось вернуть сделку на этап')}
            open={back !== null}
            subtitle={deal.company}
            success={t('Сделка возвращена на этап «{{stage}}»', {
               stage: back ? stageName(back.stage) : '',
            })}
            title={t('Вернуть сделку на этап «{{stage}}»?', {
               stage: back ? stageName(back.stage) : '',
            })}
            onClose={() => setBack(null)}
            onConfirm={() =>
               back && deals.stepBack(deal.id, back.stage, user.id)
            }
         >
            {back && (
               <p>
                  {t(
                     '«{{stage}}» снова станет текущим этапом, а пройденные после него — {{stages}} — станут непройденными. Статус сделки не изменится, переход попадёт в историю.',
                     {
                        stage: stageName(back.stage),
                        stages: undone.join(', '),
                     },
                  )}
               </p>
            )}
         </ConfirmDialog>
      </>
   );
};

export default DealStepper;

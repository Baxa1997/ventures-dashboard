import {
   Badge,
   Button,
   CheckList,
   FactList,
   Modal,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { addWorkingDays, formatDate, todayISO } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { STAGE_LABELS } from '../constants';
import { exitConditions, nextStageOf, personName, stageNorm } from '../helpers';
import deals from '../services';
import SecondReviewer from './SecondReviewer';

interface TransferDialogProps {
   deal: Deal | null; // null: the dialog is closed
   onClose: () => void;
}

/* Moving a deal to the next stage. The stage it leaves may have exit
   conditions; the move is possible only when all of them are met, and each
   one that is not says where it is met. */
const TransferDialog = ({ deal, onClose }: TransferDialogProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   const next = deal && nextStageOf(deal.stage);
   const norm = next ? stageNorm(next) : null;
   const exit = deal ? exitConditions(t, deal) : [];
   const met = exit.filter((item) => item.state === 'done').length;
   const ready = met === exit.length;
   const stage = deal ? t(STAGE_LABELS[deal.stage]) : '';
   const target = next ? t(STAGE_LABELS[next]) : t('Портфель');

   const transfer = async () => {
      if (!deal) return;
      // leaving screening also closes it, as «Завершить скрининг» does
      if (deal.stage === 'screening')
         await deals.completeScreening(deal.id, user.id);
      else await deals.transferDeal(deal.id);
      onClose();
   };

   const scored = exit.find(({ id }) => id === 'score')?.state === 'done';
   const actions =
      deal?.stage === 'screening'
         ? {
              score: !scored && (
                 <Link className='link' to='?tab=screening' onClick={onClose}>
                    {t('Открыть оценку')}
                 </Link>
              ),
              second: <SecondReviewer showLabel deal={deal} />,
           }
         : undefined;

   return (
      <Modal
         open={deal !== null}
         subtitle={
            <span className='mt-1 flex items-center gap-2'>
               <Badge tone='neutral'>{stage}</Badge>
               <ArrowRight aria-hidden className='size-4' />
               <Badge>{target}</Badge>
            </span>
         }
         title={
            deal
               ? t('Перевести {{company}} в «{{stage}}»', {
                    company: deal.company,
                    stage: target,
                 })
               : ''
         }
         onClose={onClose}
      >
         <ModalBody>
            <div className='font-semibold'>
               {t('Условия выхода из стадии «{{stage}}»', { stage })}
               {exit.length > 0 && (
                  <span className='text-ink-soft text-meta ml-2 font-normal'>
                     {t('выполнено {{done}} из {{total}}', {
                        done: met,
                        total: exit.length,
                     })}
                  </span>
               )}
            </div>
            {exit.length ? (
               <CheckList actions={actions} className='mt-3' items={exit} />
            ) : (
               <p className='text-ink-soft text-meta mt-2'>
                  {t(
                     'У этой стадии нет условий выхода — сделку можно перевести сразу.',
                  )}
               </p>
            )}
            {deal && (
               <FactList
                  divided
                  className='border-line text-meta mt-5 border-t border-b'
                  labelWidth='34%'
                  rows={[
                     {
                        label: t('Владелец'),
                        value: personName(deal.ownerId) || t('не назначен'),
                     },
                     {
                        label: t('Норма стадии «{{stage}}»', { stage: target }),
                        value: norm
                           ? `${t('{{count}} рабочий день', { count: norm })} · ${t(
                                'до {{date}}',
                                {
                                   date: formatDate(
                                      addWorkingDays(todayISO(), norm),
                                   ),
                                },
                             )}`
                           : t('по графику заседаний'),
                     },
                  ]}
               />
            )}
         </ModalBody>
         <ModalFooter
            note={
               ready
                  ? t('Переход попадёт в журнал сделки')
                  : t('Перевести можно, когда выполнены все условия')
            }
         >
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button disabled={!ready} onClick={transfer}>
               {t('Перевести')}
            </Button>
         </ModalFooter>
      </Modal>
   );
};

export default TransferDialog;

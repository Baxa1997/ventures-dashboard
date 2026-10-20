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
import CommitteeLink from './CommitteeLink';
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

   // where a condition that is not met yet is met
   const open = (id: string) =>
      exit.some((item) => item.id === id && item.state !== 'done');
   const actions = deal && {
      score: open('score') && (
         <Link className='link' to='?tab=screening' onClick={onClose}>
            {t('Открыть оценку')}
         </Link>
      ),
      second: deal.stage === 'screening' && (
         <SecondReviewer showLabel deal={deal} />
      ),
      committee: open('committee') && (
         <CommitteeLink deal={deal} onClick={onClose} />
      ),
      // the director confirms here, once the committee has approved
      director:
         open('director') &&
         (user.role === 'director' ? (
            <Button
               disabled={open('committee')}
               title={
                  open('committee')
                     ? t('Сначала нужно одобрение ИК-2')
                     : undefined
               }
               variant='ghost'
               onClick={() => deals.approveTransfer(deal.id, user.id)}
            >
               {t('Одобряю')}
            </Button>
         ) : (
            <span className='text-ink-soft text-xs'>
               {t('Попросите директора открыть это окно и подтвердить.')}
            </span>
         )),
   };

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
               {t('Что сделать перед переводом')}
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
               <CheckList
                  actions={actions ?? undefined}
                  className='mt-3'
                  items={exit}
               />
            ) : (
               <p className='text-ink-soft text-meta mt-2'>
                  {t('Ничего — сделку можно перевести сразу.')}
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
                        label: t('Срок на стадии «{{stage}}»', {
                           stage: target,
                        }),
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
                  : t('Кнопка «Перевести» включится, когда всё будет готово')
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

import {
   Badge,
   Button,
   FactList,
   Modal,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { addWorkingDays, formatDate, todayISO } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { STAGE_LABELS, STAGE_NORMS } from '../constants';
import { exitConditions, nextStageOf, personName } from '../helpers';
import deals from '../services';
import CheckList from './CheckList';

interface TransferDialogProps {
   deal: Deal | null; // null: the dialog is closed
   onClose: () => void;
}

// What the applicant sees in the cabinet once the deal is on a stage.
// Keys of the "deals" translations.
const APPLICANT_VIEW = {
   meeting: 'дату и участников встречи',
   analysis: '«Due diligence» и чек-лист документов',
} as const;

/* Moving a deal to the next stage. The stage it leaves may have exit
   conditions; the move is possible only when all of them are met. */
const TransferDialog = ({ deal, onClose }: TransferDialogProps) => {
   const { t } = useTranslation('deals');
   const next = deal && nextStageOf(deal.stage);
   const norm = next ? STAGE_NORMS[next] : null;
   const exit = deal ? exitConditions(t, deal) : [];
   const met = exit.filter((item) => item.state === 'done').length;
   const stage = deal ? t(STAGE_LABELS[deal.stage]) : '';
   const target = next ? t(STAGE_LABELS[next]) : t('Портфель');

   const transfer = async () => {
      if (!deal) return;
      await deals.transferDeal(deal.id);
      onClose();
   };

   const sees =
      next && next in APPLICANT_VIEW
         ? t(APPLICANT_VIEW[next as keyof typeof APPLICANT_VIEW])
         : t('новый статус заявки');

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
               <CheckList className='mt-3' items={exit} />
            ) : (
               <p className='text-ink-soft text-meta mt-2'>
                  {t(
                     'Для этой стадии условия выхода не заданы — они настраиваются в Настройках.',
                  )}
               </p>
            )}
            {deal && (
               <FactList
                  divided
                  className='border-line text-meta mt-5 border-t border-b'
                  labelWidth='34%'
                  rows={[
                     { label: t('Владелец'), value: personName(deal.ownerId) },
                     {
                        label: t('Норма стадии'),
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
                     { label: t('Заявитель увидит'), value: sees },
                  ]}
               />
            )}
         </ModalBody>
         <ModalFooter note={t('Переход попадёт в журнал сделки')}>
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button disabled={met < exit.length} onClick={transfer}>
               {t('Перевести')}
            </Button>
         </ModalFooter>
      </Modal>
   );
};

export default TransferDialog;

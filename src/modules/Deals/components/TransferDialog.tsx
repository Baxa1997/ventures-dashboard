import { stageName } from '@modules/Settings/services';
import {
   Badge,
   Button,
   CheckList,
   FactList,
   Modal,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { SECTION_PATHS } from '@shared/constants';
import { addWorkingDays, formatDate, todayISO } from '@shared/helpers';
import { useAction, useCurrentUser } from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { CONDITION_STAGES } from '../constants';
import {
   conditionTasks,
   exitConditions,
   nextStageOf,
   personName,
   stageNorm,
} from '../helpers';
import { useDealLinks } from '../hooks';
import deals from '../services';
import CommitteeLink from './CommitteeLink';
import InvestmentFields, {
   type InvestmentErrors,
   investmentDraft,
   readInvestment,
} from './InvestmentFields';
import SecondReviewer from './SecondReviewer';

interface TransferDialogProps {
   deal: Deal | null; // null: the dialog is closed
   onClose: () => void;
}

/* Moving a deal to the next stage. The stage it leaves may have exit
   conditions; the move is possible only when all of them are met, and each
   one that is not says where it is met. From Закрытие the deal goes to the
   portfolio: the owner enters what the fund paid, and the company appears in
   Портфель. */
const TransferDialog = ({ deal, onClose }: TransferDialogProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   const { tasks } = useDealLinks(deal?.id ?? '');
   const next = deal && nextStageOf(deal.stage);
   const toPortfolio = !!deal && !next;
   const norm = next ? stageNorm(next) : null;
   const exit = deal ? exitConditions(t, deal, tasks) : [];
   const met = exit.filter((item) => item.state === 'done').length;
   const ready = met === exit.length;
   const stage = deal ? stageName(deal.stage) : '';
   const target = next ? stageName(next) : t('Портфель');
   const [draft, setDraft] = useState(() => deal && investmentDraft(deal));
   const [errors, setErrors] = useState<InvestmentErrors>({});
   const moving = useAction(
      async (
         id: string,
         from: string,
         investment: Parameters<typeof deals.joinPortfolio>[1] | null,
      ) => {
         // leaving screening also closes it, as «Завершить скрининг» does
         if (from === 'screening') await deals.completeScreening(id, user.id);
         else if (investment) await deals.joinPortfolio(id, investment);
         else await deals.transferDeal(id);
      },
      {
         success: toPortfolio
            ? t('Компания переведена в «Портфель»')
            : t('Сделка переведена: «{{stage}}»', { stage: target }),
      },
   );
   const approving = useAction(
      (id: string) => deals.approveTransfer(id, user.id),
      { success: t('Переход одобрен') },
   );

   useEffect(() => {
      if (deal) setDraft(investmentDraft(deal));
      setErrors({});
      // a fresh form each time it opens
   }, [deal?.id]);

   const transfer = async () => {
      if (!deal) return;
      const read = toPortfolio && draft ? readInvestment(t, draft) : null;
      if (read && 'errors' in read) {
         setErrors(read.errors);
         return;
      }
      if (await moving.run(deal.id, deal.stage, read && read.investment))
         onClose();
   };

   // the first condition still open, to open in Задачи
   const openCondition =
      deal &&
      conditionTasks(deal, tasks).find(
         ({ dueLabel, status }) =>
            dueLabel === CONDITION_STAGES[deal.stage] && status !== 'done',
      );

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
      conditions: openCondition && (
         <Link
            className='link'
            to={`${SECTION_PATHS.tasks}?tab=open&task=${openCondition.id}`}
            onClick={onClose}
         >
            {t('Открыть задачу')}
         </Link>
      ),
      // the director confirms here, once the committee has approved
      director:
         open('director') &&
         (user.role === 'director' ? (
            <Button
               disabled={open('committee')}
               loading={approving.pending}
               title={
                  open('committee')
                     ? t('Сначала нужно одобрение ИК-2')
                     : undefined
               }
               variant='ghost'
               onClick={() => approving.run(deal.id)}
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
            {toPortfolio && draft && (
               <div className='border-line mt-5 border-t pt-4'>
                  <div className='font-semibold'>{t('Инвестиция фонда')}</div>
                  <p className='text-ink-soft text-meta mt-1 mb-3'>
                     {t(
                        'Компания появится в «Портфеле» с этой первой инвестицией.',
                     )}
                  </p>
                  <InvestmentFields
                     errors={errors}
                     value={draft}
                     onChange={(value) => {
                        setDraft(value);
                        setErrors({});
                     }}
                  />
               </div>
            )}
            {deal && !toPortfolio && (
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
            <Button
               disabled={!ready}
               loading={moving.pending}
               onClick={transfer}
            >
               {toPortfolio ? t('Перевести в портфель') : t('Перевести')}
            </Button>
         </ModalFooter>
      </Modal>
   );
};

export default TransferDialog;

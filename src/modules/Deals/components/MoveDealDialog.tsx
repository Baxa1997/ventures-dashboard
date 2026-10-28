import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { useAction, useCurrentUser } from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { STATUS_LABELS } from '../constants';
import { exitConditions, stageKeys, stageName } from '../helpers';
import { useDealLinks } from '../hooks';
import deals from '../services';

export type MoveStatus = 'active' | 'paused' | 'withdrawn';

// Where the dialog opens set to: the column a card was dropped on.
export interface MoveTarget {
   stage?: string;
   status?: MoveStatus;
}

const STATUSES: MoveStatus[] = ['active', 'paused', 'withdrawn'];

interface MoveDealDialogProps {
   deal: Deal | null; // null: the dialog is closed
   to?: MoveTarget;
   onClose: () => void;
}

interface MoveFormProps {
   deal: Deal;
   to: MoveTarget;
   onClose: () => void;
}

const MoveForm = ({ deal, to: target, onClose }: MoveFormProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   const { tasks } = useDealLinks(deal.id);
   const keys = stageKeys();
   const [stage, setStage] = useState(
      target.stage ??
         (keys.includes(deal.stage) ? deal.stage : (keys[1] ?? deal.stage)),
   );
   // a closed or paused deal is most often reopened
   const [status, setStatus] = useState<MoveStatus>(target.status ?? 'active');
   const [reason, setReason] = useState('');
   const moving = useAction(
      () => deals.moveDeal(deal.id, { stage, status }, reason.trim(), user.id),
      {
         success: t('Сделка переведена: «{{stage}}»', {
            stage: stageName(stage),
         }),
      },
   );

   const from = keys.indexOf(deal.stage);
   const to = keys.indexOf(stage);
   const unchanged =
      stage === deal.stage && status === 'active' && deal.status === 'active';
   // what still holds the deal where it is, when it moves ahead past it
   const unmet =
      deal.status === 'active' && to > from
         ? exitConditions(t, deal, tasks).filter(
              ({ state }) => state !== 'done',
           )
         : [];
   const skipped = to > from + 1 ? keys.slice(from + 1, to) : [];

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!unchanged && (await moving.run())) onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4 sm:grid-cols-2'>
               <Field label={t('Этап')}>
                  <select
                     data-autofocus
                     className='field-input'
                     value={stage}
                     onChange={(event) => setStage(event.target.value)}
                  >
                     {keys.map((key) => (
                        <option key={key} value={key}>
                           {stageName(key)}
                           {key === deal.stage ? ` · ${t('сейчас')}` : ''}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field label={t('Статус')}>
                  <select
                     className='field-input'
                     value={status}
                     onChange={(event) =>
                        setStatus(event.target.value as MoveStatus)
                     }
                  >
                     {STATUSES.map((value) => (
                        <option key={value} value={value}>
                           {t(STATUS_LABELS[value])}
                        </option>
                     ))}
                  </select>
               </Field>
               {(unmet.length > 0 || skipped.length > 0 || to < from) && (
                  <div className='bg-warning-tint text-warning-ink text-meta rounded-lg px-4 py-3 sm:col-span-2'>
                     {unmet.length > 0 && (
                        <>
                           <p className='font-semibold'>
                              {t('Этап «{{stage}}» ещё не пройден:', {
                                 stage: stageName(deal.stage),
                              })}
                           </p>
                           <ul className='mt-1 list-disc pl-5'>
                              {unmet.map((item) => (
                                 <li key={item.id}>{item.text}</li>
                              ))}
                           </ul>
                        </>
                     )}
                     {skipped.length > 0 && (
                        <p className={unmet.length ? 'mt-2' : undefined}>
                           {t('Будут пропущены: {{stages}}.', {
                              stages: skipped.map(stageName).join(', '),
                           })}
                        </p>
                     )}
                     {to < from && (
                        <p>
                           {t(
                              'Сделка вернётся на этап «{{stage}}», его срок начнётся заново.',
                              { stage: stageName(stage) },
                           )}
                        </p>
                     )}
                  </div>
               )}
               <Field
                  className='sm:col-span-2'
                  hint={t('необязательно; попадёт в историю сделки')}
                  label={t('Причина')}
               >
                  <textarea
                     className='field-input field-sizing-content min-h-16 resize-none'
                     maxLength={400}
                     value={reason}
                     onChange={(event) => setReason(event.target.value)}
                  />
               </Field>
               <p className='text-ink-soft text-xs sm:col-span-2'>
                  {t(
                     'Отказ — кнопкой «Отказать с причиной», портфель — «Перевести в портфель»: им нужны причина из списка и инвестиция фонда.',
                  )}
               </p>
            </div>
         </ModalBody>
         <ModalFooter note={t('Переход и причина попадут в историю сделки')}>
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button disabled={unchanged} loading={moving.pending} type='submit'>
               {t('Сменить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

/* Puts a deal on any stage with any status by hand: back to an earlier
   stage, ahead past the conditions (shown as a warning), paused, withdrawn
   or reopened. The move is logged with who made it, and the reason when one
   is written. */
const MoveDealDialog = ({ deal, to = {}, onClose }: MoveDealDialogProps) => {
   const { t } = useTranslation('deals');

   return (
      <Modal
         open={deal !== null}
         subtitle={deal?.company}
         title={t('Этап и статус сделки')}
         onClose={onClose}
      >
         {deal && (
            <MoveForm key={deal.id} deal={deal} to={to} onClose={onClose} />
         )}
      </Modal>
   );
};

export default MoveDealDialog;

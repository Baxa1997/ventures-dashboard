import {
   Button,
   ChoiceCards,
   Field,
   FilterSelect,
   MODAL_FORM,
   Modal,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type { Deal, RejectReason, Resubmit } from '@shared/types/deals.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
   MANDATE_REASONS,
   REJECT_REASON_LABELS,
   REJECT_REASON_ORDER,
   RESUBMIT_LABELS,
   RESUBMIT_ORDER,
   STAGE_LABELS,
   TEXT_MAX,
} from '../constants';
import { formatAmount, mandateLimits } from '../helpers';
import deals from '../services';

interface RejectDialogProps {
   deal: Deal | null; // null: the dialog is closed
   onClose: () => void;
   onDone?: () => void;
}

interface FormProps {
   deal: Deal;
   onClose: () => void;
   onDone?: () => void;
}

const defaultResubmit = (reason: RejectReason): Resubmit =>
   MANDATE_REASONS.includes(reason) ? 'now' : 'in_6_months';

const RejectForm = ({ deal, onClose, onDone }: FormProps) => {
   const { t, i18n } = useTranslation('deals');
   const user = useCurrentUser();
   const language = i18n.resolvedLanguage ?? i18n.language;
   const money = (amount: number) =>
      `$${new Intl.NumberFormat(language).format(amount)}`;
   // $300 000, but $1,5 млн
   const round = (amount: number) =>
      amount >= 1_000_000
         ? t('{{amount}} млн', {
              amount: `$${new Intl.NumberFormat(language, {
                 maximumFractionDigits: 1,
              }).format(amount / 1_000_000)}`,
           })
         : money(amount);

   // What the applicant is told, worded from the reason.
   const letterFor = (reason: RejectReason) => {
      if (reason === 'mandate_check')
         return t(
            'Спасибо за заявку. Мы инвестируем от {{min}} до {{max}} на стадиях pre-seed и seed, а {{company}} привлекает {{amount}}. Сейчас это вне нашего мандата. Вы можете подать заявку снова, если структура раунда изменится, — мы рассмотрим её в обычном порядке.',
            {
               min: money(mandateLimits().minCheck),
               max: money(mandateLimits().maxCheck),
               company: deal.company,
               amount: round(deal.amount),
            },
         );
      if (reason === 'other')
         return t(
            'Спасибо за заявку. Мы внимательно её рассмотрели и сейчас не готовы идти дальше.',
         );
      return t(
         'Спасибо за заявку. Мы внимательно её рассмотрели и сейчас не готовы идти дальше. Причина: {{reason}}.',
         { reason: t(REJECT_REASON_LABELS[reason]).toLowerCase() },
      );
   };

   // an application whose check is over the limit starts with that reason
   const [reason, setReason] = useState<RejectReason | null>(
      deal.amount > mandateLimits().maxCheck ? 'mandate_check' : null,
   );
   const [letter, setLetter] = useState(() =>
      reason ? letterFor(reason) : '',
   );
   const [letterEdited, setLetterEdited] = useState(false);
   const [comment, setComment] = useState('');
   const [resubmit, setResubmit] = useState<Resubmit>(
      defaultResubmit(reason ?? 'other'),
   );
   const [tried, setTried] = useState(false);

   const commentMissing = reason === 'other' && !comment.trim();
   const valid = !!reason && !!letter.trim() && !commentMissing;

   const chooseReason = (next: RejectReason) => {
      setReason(next);
      setResubmit(defaultResubmit(next));
      // a letter the person has rewritten is left alone
      if (!letterEdited) setLetter(letterFor(next));
   };

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setTried(true);
      if (!reason || !valid) return;
      await deals.rejectDeal(
         deal.id,
         { reason, letter: letter.trim(), comment: comment.trim(), resubmit },
         user.id,
      );
      onClose();
      onDone?.();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={handleSubmit}>
         <ModalBody>
            <div className='flex flex-col gap-5'>
               <div>
                  <div className='mb-2 font-semibold'>
                     {t('Причина')}
                     <span className='text-ink-soft text-meta ml-2 font-normal'>
                        {t('из справочника — нужна для отчёта по воронке')}
                     </span>
                  </div>
                  <ChoiceCards
                     label={t('Причина')}
                     name='reason'
                     options={REJECT_REASON_ORDER.map((value) => ({
                        value,
                        label:
                           value === 'other'
                              ? t('Другое — потребуется комментарий')
                              : t(REJECT_REASON_LABELS[value]),
                     }))}
                     value={reason}
                     onChange={chooseReason}
                  />
                  {tried && !reason && (
                     <p role='alert' className='text-danger mt-2 text-xs'>
                        {t('Выберите причину отказа')}
                     </p>
                  )}
               </div>
               <Field
                  strong
                  aside={t('увидит в кабинете и получит на почту')}
                  error={
                     tried && !letter.trim()
                        ? t('Напишите, что увидит заявитель')
                        : undefined
                  }
                  label={t('Письмо заявителю')}
               >
                  <textarea
                     className='field-input'
                     maxLength={TEXT_MAX * 2}
                     rows={5}
                     value={letter}
                     onChange={(event) => {
                        setLetter(event.target.value);
                        setLetterEdited(true);
                     }}
                  />
               </Field>
               <Field
                  strong
                  aside={t('заявитель не увидит')}
                  error={
                     tried && commentMissing
                        ? t('Для причины «Другое» нужен комментарий')
                        : undefined
                  }
                  label={t('Комментарий для фонда')}
               >
                  <textarea
                     className='field-input'
                     maxLength={TEXT_MAX}
                     placeholder={t(
                        'Например: что проверили и почему решение окончательное',
                     )}
                     rows={3}
                     value={comment}
                     onChange={(event) => setComment(event.target.value)}
                  />
               </Field>
               <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='min-w-0'>
                     <div className='font-semibold'>
                        {t('Повторная подача')}
                     </div>
                     <div className='text-ink-soft mt-0.5 text-xs'>
                        {t(
                           'Норма — через 6 месяцев. При отказе по мандату можно открыть сразу.',
                        )}
                     </div>
                  </div>
                  <FilterSelect
                     accent
                     label={t('Повторная подача')}
                     options={RESUBMIT_ORDER.map((value) => ({
                        value,
                        label: t(RESUBMIT_LABELS[value]),
                     }))}
                     showLabel={false}
                     value={resubmit}
                     onChange={setResubmit}
                  />
               </div>
            </div>
         </ModalBody>
         <ModalFooter note={t('Статус в кабинете: «Отказ» с причиной')}>
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button type='submit'>{t('Отказать и уведомить')}</Button>
         </ModalFooter>
      </form>
   );
};

// Rejection with a reason — from the incoming applications or from any stage.
const RejectDialog = ({ deal, onClose, onDone }: RejectDialogProps) => {
   const { t, i18n } = useTranslation('deals');
   const language = i18n.resolvedLanguage ?? i18n.language;

   return (
      <Modal
         open={deal !== null}
         subtitle={
            deal &&
            [
               deal.number,
               t(STAGE_LABELS[deal.stage]).toLowerCase(),
               t('запрос {{amount}}', {
                  amount: formatAmount(deal.amount, language),
               }),
            ].join(' · ')
         }
         title={
            deal ? t('Отказать: {{company}}', { company: deal.company }) : ''
         }
         onClose={onClose}
      >
         {deal && (
            <RejectForm
               key={deal.id}
               deal={deal}
               onClose={onClose}
               onDone={onDone}
            />
         )}
      </Modal>
   );
};

export default RejectDialog;

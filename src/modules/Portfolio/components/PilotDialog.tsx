import { PILOT_STATUSES } from '@modules/Portfolio/constants';
import portfolio from '@modules/Portfolio/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   Notice,
} from '@shared/components';
import { parseAmount, todayISO } from '@shared/helpers';
import { useAction } from '@shared/hooks';
import type {
   Pilot,
   PilotInput,
   PilotStatus,
} from '@shared/types/portfolio.types';
import dayjs from 'dayjs';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PilotDialogProps {
   companyId: string;
   pilot: Pilot | 'new' | null; // null: the dialog is closed
   fields: boolean; // ucode has the sponsor and the budget (batch 24)
   onClose: () => void;
   onRemove: (pilot: Pilot) => void; // asks first
}

export const STATUS_ORDER: PilotStatus[] = [
   'planned',
   'in_progress',
   'success',
   'failed',
];

type Errors = Partial<
   Record<'title' | 'customer' | 'budget' | 'endedAt', string>
>;

interface PilotFormProps extends Omit<PilotDialogProps, 'pilot'> {
   pilot: Pilot | null;
}

const PilotForm = ({
   companyId,
   pilot,
   fields,
   onClose,
   onRemove,
}: PilotFormProps) => {
   const { t } = useTranslation('portfolio');
   const [input, setInput] = useState<PilotInput>(
      pilot ?? {
         title: '',
         customer: '',
         sponsor: '',
         budget: null,
         status: 'planned',
         note: '',
         startedAt: todayISO(),
         endedAt: dayjs().add(90, 'day').format('YYYY-MM-DD'),
      },
   );
   // the budget as typed: "45 000"
   const [budget, setBudget] = useState(
      pilot?.budget == null ? '' : String(pilot.budget),
   );
   const [errors, setErrors] = useState<Errors>({});
   const saving = useAction(
      (value: PilotInput) =>
         pilot
            ? portfolio.updatePilot(pilot.id, value)
            : portfolio.addPilot(companyId, value),
      { kind: pilot ? 'save' : 'create', success: t('Пилот сохранён') },
   );
   const change = (patch: Partial<PilotInput>) =>
      setInput((prev) => ({ ...prev, ...patch }));

   return (
      <form
         noValidate
         className={MODAL_FORM}
         onSubmit={async (event) => {
            event.preventDefault();
            const amount = budget.trim() ? parseAmount(budget) : null;
            const value = {
               ...input,
               title: input.title.trim(),
               customer: input.customer.trim(),
               sponsor: input.sponsor.trim(),
               note: input.note.trim(),
               budget: amount,
            };
            const found: Errors = {
               ...(!value.title && { title: t('Назовите пилот') }),
               ...(!value.customer && {
                  customer: t('Укажите подразделение SQB или клиента банка'),
               }),
               ...(amount !== null &&
                  !(amount >= 0) && {
                     budget: t('Укажите сумму в долларах, например 45 000'),
                  }),
               ...(value.startedAt &&
                  value.endedAt &&
                  value.endedAt < value.startedAt && {
                     endedAt: t('Окончание раньше начала'),
                  }),
            };
            setErrors(found);
            if (Object.keys(found).length) return;
            if (await saving.run(value)) onClose();
         }}
      >
         <ModalBody>
            <div className='grid gap-4 sm:grid-cols-2'>
               {!fields && (
                  <Notice warning className='sm:col-span-2'>
                     {t(
                        'Спонсор и бюджет сохранятся, когда в ucode будет партия 24.',
                     )}
                  </Notice>
               )}
               <Field
                  className='sm:col-span-2'
                  error={errors.title}
                  label={t('Название')}
               >
                  <input
                     data-autofocus
                     aria-invalid={!!errors.title}
                     className='field-input'
                     maxLength={160}
                     value={input.title}
                     onChange={(event) => change({ title: event.target.value })}
                  />
               </Field>
               <Field label={t('Статус')}>
                  <select
                     className='field-input select-chevron'
                     value={input.status}
                     onChange={(event) =>
                        change({ status: event.target.value as PilotStatus })
                     }
                  >
                     {STATUS_ORDER.map((status) => (
                        <option key={status} value={status}>
                           {t(PILOT_STATUSES[status].label)}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field error={errors.customer} label={t('Подразделение SQB')}>
                  <input
                     aria-invalid={!!errors.customer}
                     className='field-input'
                     maxLength={120}
                     placeholder={t('Подразделение или клиент банка')}
                     value={input.customer}
                     onChange={(event) =>
                        change({ customer: event.target.value })
                     }
                  />
               </Field>
               <Field label={t('Спонсор в банке')}>
                  <input
                     className='field-input'
                     maxLength={120}
                     value={input.sponsor}
                     onChange={(event) =>
                        change({ sponsor: event.target.value })
                     }
                  />
               </Field>
               <Field error={errors.budget} label={t('Бюджет, USD')}>
                  <input
                     aria-invalid={!!errors.budget}
                     className='field-input tabular-nums'
                     inputMode='decimal'
                     maxLength={16}
                     value={budget}
                     onChange={(event) => setBudget(event.target.value)}
                  />
               </Field>
               <Field label={t('Начало')}>
                  <input
                     className='field-input'
                     type='date'
                     value={input.startedAt}
                     onChange={(event) =>
                        change({ startedAt: event.target.value })
                     }
                  />
               </Field>
               <Field error={errors.endedAt} label={t('Окончание')}>
                  <input
                     aria-invalid={!!errors.endedAt}
                     className='field-input'
                     type='date'
                     value={input.endedAt}
                     onChange={(event) =>
                        change({ endedAt: event.target.value })
                     }
                  />
               </Field>
               <Field className='sm:col-span-2' label={t('Цель или результат')}>
                  <textarea
                     className='field-input field-sizing-content min-h-9 resize-none'
                     maxLength={500}
                     rows={1}
                     value={input.note}
                     onChange={(event) => change({ note: event.target.value })}
                  />
               </Field>
            </div>
         </ModalBody>
         <ModalFooter>
            {pilot && (
               <Button
                  className='mr-auto'
                  disabled={saving.pending}
                  hint={t('Удалить пилот: сначала спросим')}
                  variant='ghost'
                  onClick={() => onRemove(pilot)}
               >
                  <Trash2 aria-hidden />
                  {t('Удалить')}
               </Button>
            )}
            <Button
               hint={t('Закрыть окно, ничего не меняя')}
               variant='ghost'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               hint={
                  pilot
                     ? t('Сохранить изменения в пилоте')
                     : t('Добавить пилот этой компании')
               }
               loading={saving.pending}
               type='submit'
            >
               {pilot ? t('Сохранить') : t('Добавить пилот')}
            </Button>
         </ModalFooter>
      </form>
   );
};

/* A company's pilot with the bank, as the prototype's window has it: added,
   or changed, and from there deleted (after asking). */
const PilotDialog = ({ pilot, ...props }: PilotDialogProps) => {
   const { t } = useTranslation('portfolio');
   const existing = pilot === 'new' ? null : pilot;
   return (
      <Modal
         open={pilot !== null}
         title={existing ? existing.title : t('Новый пилот')}
         onClose={props.onClose}
      >
         {pilot !== null && (
            <PilotForm
               key={existing?.id ?? 'new'}
               pilot={existing}
               {...props}
            />
         )}
      </Modal>
   );
};

export default PilotDialog;

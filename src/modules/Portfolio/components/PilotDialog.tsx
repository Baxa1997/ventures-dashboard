import { PILOT_STATUSES } from '@modules/Portfolio/constants';
import portfolio from '@modules/Portfolio/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { todayISO } from '@shared/helpers';
import { useAction } from '@shared/hooks';
import type {
   Pilot,
   PilotInput,
   PilotStatus,
} from '@shared/types/portfolio.types';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PilotDialogProps {
   companyId: string;
   pilot: Pilot | 'new' | null; // null: the dialog is closed
   onClose: () => void;
}

const STATUS_ORDER: PilotStatus[] = [
   'planned',
   'in_progress',
   'success',
   'failed',
];

const PilotForm = ({
   companyId,
   pilot,
   onClose,
}: {
   companyId: string;
   pilot: Pilot | null;
   onClose: () => void;
}) => {
   const { t } = useTranslation('portfolio');
   const [input, setInput] = useState<PilotInput>(
      pilot ?? {
         title: '',
         customer: '',
         status: 'planned',
         note: '',
         startedAt: todayISO(),
         endedAt: dayjs().add(90, 'day').format('YYYY-MM-DD'),
      },
   );
   const [errors, setErrors] = useState<{ title?: string; customer?: string }>(
      {},
   );
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
            const value = {
               ...input,
               title: input.title.trim(),
               customer: input.customer.trim(),
               note: input.note.trim(),
            };
            const found = {
               ...(!value.title && { title: t('Назовите пилот') }),
               ...(!value.customer && {
                  customer: t('Укажите подразделение SQB или клиента банка'),
               }),
            };
            setErrors(found);
            if (Object.keys(found).length) return;
            if (await saving.run(value)) onClose();
         }}
      >
         <ModalBody>
            <div className='grid gap-4 sm:grid-cols-2'>
               <Field
                  className='sm:col-span-2'
                  error={errors.title}
                  label={t('Название')}
               >
                  <input
                     data-autofocus
                     aria-invalid={!!errors.title}
                     className='field-input'
                     value={input.title}
                     onChange={(event) => change({ title: event.target.value })}
                  />
               </Field>
               <Field
                  error={errors.customer}
                  label={t('Подразделение SQB или клиент')}
               >
                  <input
                     aria-invalid={!!errors.customer}
                     className='field-input'
                     value={input.customer}
                     onChange={(event) =>
                        change({ customer: event.target.value })
                     }
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
               <Field label={t('Окончание')}>
                  <input
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
                     className='field-input field-sizing-content min-h-18 resize-none'
                     value={input.note}
                     onChange={(event) => change({ note: event.target.value })}
                  />
               </Field>
            </div>
         </ModalBody>
         <ModalFooter>
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

// A company's pilot with the bank: added, or changed.
const PilotDialog = ({ companyId, pilot, onClose }: PilotDialogProps) => {
   const { t } = useTranslation('portfolio');
   const existing = pilot === 'new' ? null : pilot;
   return (
      <Modal
         open={pilot !== null}
         title={existing ? existing.title : t('Новый пилот')}
         onClose={onClose}
      >
         {pilot !== null && (
            <PilotForm
               key={existing?.id ?? 'new'}
               companyId={companyId}
               pilot={existing}
               onClose={onClose}
            />
         )}
      </Modal>
   );
};

export default PilotDialog;

import { NEED_DAYS } from '@modules/Procurement/constants';
import {
   categoryLimit,
   firstStage,
   stagesFor,
} from '@modules/Procurement/helpers';
import procurement, { type SaveOutcome } from '@modules/Procurement/services';
import {
   listName,
   listOf,
   nameOf,
   vendorsOf,
} from '@modules/Settings/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   Notice,
} from '@shared/components';
import { DATE_FORMAT, TEAM } from '@shared/constants';
import { formatMoneyShort, personName, todayISO } from '@shared/helpers';
import { useCurrentUser, useRequest } from '@shared/hooks';
import type {
   Procurement,
   ProcurementInput,
} from '@shared/types/procurement.types';
import dayjs from 'dayjs';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ProcurementDialogProps {
   open: boolean;
   request: Procurement | null; // null: a new one
   onSaved: (outcome: SaveOutcome) => void;
   onClose: () => void;
}

const ProcurementForm = ({
   request,
   onSaved,
   onClose,
}: Omit<ProcurementDialogProps, 'open'>) => {
   const { t } = useTranslation('procurement');
   const user = useCurrentUser();
   const [value, setValue] = useState<ProcurementInput>(() =>
      request
         ? { ...request }
         : {
              title: '',
              category: listOf('procCategories')[0]?.key ?? '',
              amount: 0,
              stage: firstStage(),
              vendorId: '',
              needDate: dayjs(todayISO())
                 .add(NEED_DAYS, 'day')
                 .format(DATE_FORMAT),
              ownerId: user.id,
              note: '',
           },
   );
   const [tried, setTried] = useState(false);
   // what stopped the stage picked
   const [stopped, setStopped] = useState({ vendor: '', stage: '' });
   const set = (patch: Partial<ProcurementInput>) => {
      setValue((prev) => ({ ...prev, ...patch }));
      setStopped({ vendor: '', stage: '' });
   };

   const errors = {
      title: value.title.trim() ? '' : t('Напишите, что закупаем'),
      amount: value.amount > 0 ? '' : t('Укажите сумму'),
   };
   const valid = !errors.title && !errors.amount;
   const saving = useRequest({ success: false });

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setTried(true);
      if (!valid) return;
      let outcome: SaveOutcome | undefined;
      await saving.run(async () => {
         outcome = await procurement.save(
            request?.id ?? null,
            { ...value, title: value.title.trim(), note: value.note.trim() },
            user.id,
         );
      });
      if (!outcome) return;
      if (outcome.kind === 'need_vendor') {
         setStopped({
            vendor: t('Сначала выберите поставщика'),
            stage: '',
         });
         return;
      }
      if (outcome.kind === 'waits') {
         setStopped({
            vendor: '',
            stage: t(
               'Закупка ждёт согласования: {{name}}. Следующий этап откроется после решения.',
               { name: personName(outcome.approverId) },
            ),
         });
         return;
      }
      onSaved(outcome);
      onClose();
   };

   // the vendors of the category first, the rest with theirs named
   const vendors = vendorsOf(true)
      .filter(({ active, id }) => active || id === value.vendorId)
      .map((vendor) => ({
         ...vendor,
         own: vendor.category === value.category,
      }))
      .sort((a, b) => Number(b.own) - Number(a.own));
   const limit = categoryLimit(value.category);
   const categories = listOf('procCategories', true).filter(
      (item) => item.active || item.key === value.category,
   );

   return (
      <form noValidate className={MODAL_FORM} onSubmit={handleSubmit}>
         <ModalBody>
            <div className='grid gap-4'>
               {request?.decisionNote && (
                  <Notice warning={!request.approvedBy}>
                     {request.approvedBy
                        ? t('Комментарий согласующего: {{note}}', {
                             note: request.decisionNote,
                          })
                        : t('Возвращена инициатору: {{note}}', {
                             note: request.decisionNote,
                          })}
                  </Notice>
               )}
               <Field error={tried ? errors.title : ''} label={t('Что закупаем')}>
                  <input
                     data-autofocus
                     aria-invalid={tried && !!errors.title}
                     className='field-input'
                     maxLength={200}
                     value={value.title}
                     onChange={(event) => set({ title: event.target.value })}
                  />
               </Field>
               <div className='grid gap-4 sm:grid-cols-2'>
                  <Field label={t('Категория')}>
                     <select
                        className='field-input'
                        value={value.category}
                        onChange={(event) =>
                           set({ category: event.target.value })
                        }
                     >
                        {categories.map((item) => (
                           <option key={item.key} value={item.key}>
                              {nameOf(item)}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field
                     error={tried ? errors.amount : ''}
                     label={t('Сумма, USD')}
                  >
                     <input
                        aria-invalid={tried && !!errors.amount}
                        className='field-input'
                        inputMode='numeric'
                        value={value.amount || ''}
                        onChange={(event) =>
                           set({
                              amount:
                                 Number(event.target.value.replace(/\D/g, '')) ||
                                 0,
                           })
                        }
                     />
                  </Field>
                  <Field error={stopped.vendor} label={t('Поставщик')}>
                     <select
                        aria-invalid={!!stopped.vendor}
                        className='field-input'
                        value={value.vendorId}
                        onChange={(event) =>
                           set({ vendorId: event.target.value })
                        }
                     >
                        <option value=''>{t('Выбрать позже')}</option>
                        {vendors.map(({ id, name, own, category }) => (
                           <option key={id} value={id}>
                              {own
                                 ? name
                                 : `${name} · ${listName('procCategories', category)}`}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field error={stopped.stage} label={t('Этап')}>
                     <select
                        aria-invalid={!!stopped.stage}
                        className='field-input'
                        value={value.stage}
                        onChange={(event) => set({ stage: event.target.value })}
                     >
                        {stagesFor(request?.stage).map((item) => (
                           <option key={item.key} value={item.key}>
                              {nameOf(item)}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field label={t('Нужно к дате')}>
                     <input
                        className='field-input'
                        type='date'
                        value={value.needDate}
                        onChange={(event) =>
                           set({ needDate: event.target.value })
                        }
                     />
                  </Field>
                  <Field label={t('Инициатор')}>
                     <select
                        className='field-input'
                        value={value.ownerId}
                        onChange={(event) => set({ ownerId: event.target.value })}
                     >
                        {TEAM.map(({ id, name }) => (
                           <option key={id} value={id}>
                              {name}
                           </option>
                        ))}
                        {!TEAM.some(({ id }) => id === value.ownerId) && (
                           <option value={value.ownerId}>
                              {personName(value.ownerId) || value.ownerId}
                           </option>
                        )}
                     </select>
                  </Field>
               </div>
               <Field label={t('Обоснование')}>
                  <textarea
                     className='field-input min-h-28'
                     placeholder={t('Зачем нужна закупка')}
                     value={value.note}
                     onChange={(event) => set({ note: event.target.value })}
                  />
               </Field>
               <p className='text-ink-faint text-xs'>
                  {value.amount > limit
                     ? t(
                          'Лимит категории без согласования: {{limit}}. Заявку согласует генеральный директор.',
                          { limit: formatMoneyShort(limit) },
                       )
                     : t('Лимит категории без согласования: {{limit}}.', {
                          limit: formatMoneyShort(limit),
                       })}
               </p>
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
                  request
                     ? t('Сохранить изменения в заявке')
                     : t('Подать заявку на закупку')
               }
               loading={saving.pending}
               type='submit'
            >
               {request ? t('Сохранить') : t('Подать заявку')}
            </Button>
         </ModalFooter>
      </form>
   );
};

/* A request's form, as the design draws it. The stage picked goes by the same
   rules as the buttons and the board; what stops it is said under its field. */
const ProcurementDialog = ({
   open,
   request,
   ...form
}: ProcurementDialogProps) => {
   const { t } = useTranslation('procurement');

   return (
      <Modal
         open={open}
         title={request ? request.title : t('Заявка на закупку')}
         onClose={form.onClose}
      >
         {open && <ProcurementForm request={request} {...form} />}
      </Modal>
   );
};

export default ProcurementDialog;

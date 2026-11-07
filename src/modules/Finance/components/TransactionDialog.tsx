import {
   Button,
   Checkbox,
   ConfirmDialog,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   Notice,
} from '@shared/components';
import { parseAmount, todayISO } from '@shared/helpers';
import { toast } from '@shared/helpers/toast';
import { useCurrentUser, useRequest } from '@shared/hooks';
import type {
   FinanceState,
   FinTransaction,
   FinTransactionInput,
} from '@shared/types/finance.types';
import { Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { autoDeal, categoriesFor, categoryName, isInvesting } from '../helpers';
import finance from '../services';

interface TransactionDialogProps {
   open: boolean;
   transaction: FinTransaction | null; // null: a new one, entered by hand
   data: FinanceState;
   editable: boolean;
   onClose: () => void;
}

interface FormProps extends Omit<TransactionDialogProps, 'open'> {
   onRemove: () => void;
}

const TransactionForm = ({
   transaction,
   data,
   editable,
   onClose,
   onRemove,
}: FormProps) => {
   const { t, i18n } = useTranslation('finance');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const user = useCurrentUser();
   const fromBank = !!transaction?.importId;
   const accounts = data.accounts.filter(
      ({ active, id }) => active || id === transaction?.accountId,
   );
   const [value, setValue] = useState<FinTransactionInput>(
      transaction ?? {
         date: todayISO(),
         accountId: accounts[0]?.id ?? '',
         party: '',
         purpose: '',
         amount: 0,
         category: '',
         note: '',
         dealId: '',
         partyAccount: '',
      },
   );
   const [amountText, setAmountText] = useState(
      transaction ? String(transaction.amount) : '',
   );
   const [remember, setRemember] = useState(false);
   const [tried, setTried] = useState(false);
   const saving = useRequest();
   const set = (patch: Partial<FinTransactionInput>) =>
      setValue((prev) => ({ ...prev, ...patch }));

   const amount = parseAmount(amountText);
   const errors = {
      amount:
         amount && !Number.isNaN(amount)
            ? ''
            : t('Сумма: плюс — поступление, минус — списание'),
      party: value.party.trim() ? '' : t('Укажите контрагента'),
      accountId: value.accountId ? '' : t('Выберите счёт'),
      date: value.date ? '' : t('Укажите дату'),
   };
   const valid = fromBank || Object.values(errors).every((error) => !error);
   const categories = categoriesFor(
      data.categories,
      amount || 0,
      value.category,
   );
   const locked = fromBank || !editable;
   // an investment or an exit names its deal: the portfolio's company
   const investing = isInvesting(
      data.categories.find(({ key }) => key === value.category),
   );
   const setCategory = (category: string) => {
      const item = data.categories.find(({ key }) => key === category);
      set({
         category,
         dealId: isInvesting(item)
            ? value.dealId || autoDeal(value, data.deals)
            : '',
      });
   };

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setTried(true);
      if (!valid || !editable) return;
      const done = await saving.run(async () => {
         await finance.saveTransaction(
            transaction?.id ?? null,
            {
               ...value,
               amount,
               party: value.party.trim(),
               purpose: value.purpose.trim(),
               note: value.note.trim(),
            },
            user.id,
         );
         if (remember && transaction && value.category) {
            const more = await finance.remember(
               transaction.party,
               value.category,
               user.id,
            );
            if (more)
               toast.success(
                  t('Правило сохранено. Разнесено ещё операций: {{count}}', {
                     count: more,
                  }),
               );
         }
      });
      if (done) onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={handleSubmit}>
         <ModalBody>
            <div className='grid gap-4'>
               {fromBank && (
                  <Notice>
                     {t(
                        'Дата, сумма, счёт и контрагент взяты из банковской выписки и не меняются. Статью и комментарий можно менять.',
                     )}
                  </Notice>
               )}
               <div className='grid gap-4 sm:grid-cols-2'>
                  <Field error={tried ? errors.date : ''} label={t('Дата')}>
                     <input
                        className='field-input'
                        disabled={locked}
                        type='date'
                        value={value.date}
                        onChange={(event) => set({ date: event.target.value })}
                     />
                  </Field>
                  <Field
                     error={tried && !fromBank ? errors.amount : ''}
                     hint={t('Минус — списание: −5 400')}
                     label={t('Сумма')}
                  >
                     <input
                        data-autofocus
                        aria-invalid={tried && !!errors.amount}
                        className='field-input tabular-nums'
                        disabled={locked}
                        inputMode='decimal'
                        value={amountText}
                        onChange={(event) => setAmountText(event.target.value)}
                     />
                  </Field>
                  <Field
                     error={tried && !fromBank ? errors.party : ''}
                     label={t('Контрагент')}
                  >
                     <input
                        className='field-input'
                        disabled={locked}
                        maxLength={200}
                        value={value.party}
                        onChange={(event) => set({ party: event.target.value })}
                     />
                  </Field>
                  <Field
                     error={tried && !fromBank ? errors.accountId : ''}
                     label={t('Счёт')}
                  >
                     <select
                        className='field-input'
                        disabled={locked}
                        value={value.accountId}
                        onChange={(event) =>
                           set({ accountId: event.target.value })
                        }
                     >
                        {!accounts.length && (
                           <option value=''>
                              {t('Сначала добавьте счёт')}
                           </option>
                        )}
                        {accounts.map((account) => (
                           <option key={account.id} value={account.id}>
                              {[
                                 account.name,
                                 account.number.slice(-4),
                                 account.currency,
                              ]
                                 .filter(Boolean)
                                 .join(' · ')}
                           </option>
                        ))}
                     </select>
                  </Field>
               </div>
               <Field label={t('Назначение платежа')}>
                  <textarea
                     className='field-input min-h-20'
                     disabled={locked}
                     maxLength={1000}
                     value={value.purpose}
                     onChange={(event) => set({ purpose: event.target.value })}
                  />
               </Field>
               <div className='grid gap-4 sm:grid-cols-2'>
                  <Field label={t('Статья')}>
                     <select
                        className='field-input'
                        disabled={!editable}
                        value={value.category}
                        onChange={(event) => setCategory(event.target.value)}
                     >
                        <option value=''>{t('Не разнесено')}</option>
                        {categories.map((category) => (
                           <option key={category.key} value={category.key}>
                              {categoryName(category, language)}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field label={t('Комментарий')}>
                     <input
                        className='field-input'
                        disabled={!editable}
                        maxLength={300}
                        value={value.note}
                        onChange={(event) => set({ note: event.target.value })}
                     />
                  </Field>
               </div>
               {investing && (
                  <Field
                     hint={t(
                        'Компания, в которую ушла инвестиция или от которой пришёл выход',
                     )}
                     label={t('Сделка')}
                  >
                     <select
                        className='field-input'
                        disabled={!editable}
                        value={value.dealId}
                        onChange={(event) =>
                           set({ dealId: event.target.value })
                        }
                     >
                        <option value=''>{t('Не указана')}</option>
                        <optgroup label={t('Портфель')}>
                           {data.deals
                              .filter(({ portfolio }) => portfolio)
                              .map((deal) => (
                                 <option key={deal.id} value={deal.id}>
                                    {deal.company}
                                 </option>
                              ))}
                        </optgroup>
                        <optgroup label={t('Сделки в работе')}>
                           {data.deals
                              .filter(({ portfolio }) => !portfolio)
                              .map((deal) => (
                                 <option key={deal.id} value={deal.id}>
                                    {deal.company}
                                 </option>
                              ))}
                        </optgroup>
                        {value.dealId &&
                           !data.deals.some(
                              ({ id }) => id === value.dealId,
                           ) && (
                              <option value={value.dealId}>
                                 {t('Сделка не в работе')}
                              </option>
                           )}
                     </select>
                  </Field>
               )}
               {transaction && editable && value.category && (
                  <label className='flex items-center gap-2.5 text-sm'>
                     <Checkbox
                        checked={remember}
                        label={t('Запомнить статью для контрагента')}
                        onChange={() => setRemember((on) => !on)}
                     />
                     {t(
                        'Запомнить: операции с «{{party}}» разносить на эту статью',
                        {
                           party: transaction.party,
                        },
                     )}
                  </label>
               )}
            </div>
         </ModalBody>
         <ModalFooter
            note={
               transaction && editable ? (
                  <Button
                     hint={t('Удалить операцию')}
                     size='sm'
                     variant='danger'
                     onClick={onRemove}
                  >
                     <Trash2 aria-hidden />
                     {t('Удалить')}
                  </Button>
               ) : undefined
            }
         >
            <Button
               hint={t('Закрыть окно, ничего не меняя')}
               variant='ghost'
               onClick={onClose}
            >
               {editable ? t('Отмена') : t('Закрыть')}
            </Button>
            {editable && (
               <Button
                  disabled={!data.stored}
                  hint={t('Сохранить операцию')}
                  loading={saving.pending}
                  type='submit'
               >
                  {t('Сохранить')}
               </Button>
            )}
         </ModalFooter>
      </form>
   );
};

/* An operation's window: a new one entered by hand, or one from the list —
   a statement's keeps its date, sum and counterparty, and takes a line
   item, a comment and a rule for the counterparty's next operations. */
const TransactionDialog = ({
   open,
   transaction,
   ...form
}: TransactionDialogProps) => {
   const { t } = useTranslation('finance');
   const user = useCurrentUser();
   const [removing, setRemoving] = useState(false);
   return (
      <>
         <Modal
            open={open && !removing}
            size='lg'
            subtitle={transaction?.purpose || undefined}
            title={transaction ? transaction.party : t('Операция вручную')}
            onClose={form.onClose}
         >
            {open && (
               <TransactionForm
                  transaction={transaction}
                  {...form}
                  onRemove={() => setRemoving(true)}
               />
            )}
         </Modal>
         <ConfirmDialog
            open={removing}
            subtitle={transaction?.party}
            title={t('Удалить операцию?')}
            onClose={() => setRemoving(false)}
            onConfirm={async () => {
               if (transaction)
                  await finance.removeTransaction(transaction.id, user.id);
               setRemoving(false);
               form.onClose();
            }}
         >
            <p>
               {transaction?.importId
                  ? t(
                       'Операция из выписки исчезнет из отчётов. Если загрузить ту же выписку снова, она вернётся.',
                    )
                  : t('Операция исчезнет из списка и из отчётов.')}
            </p>
         </ConfirmDialog>
      </>
   );
};

export default TransactionDialog;

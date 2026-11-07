import {
   Button,
   ConfirmDialog,
   InlineField,
   Modal,
   ModalBody,
   ModalFooter,
   Switch,
   Table,
   TD,
   TH,
} from '@shared/components';
import { formatNumericDate, parseAmount, todayISO } from '@shared/helpers';
import { useCurrentUser, useRequest } from '@shared/hooks';
import type { FinAccount, FinanceState } from '@shared/types/finance.types';
import clsx from 'clsx';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CURRENCIES } from '../constants';
import { accountBalance, formatSum } from '../helpers';
import finance from '../services';

interface AccountsDialogProps {
   open: boolean;
   data: FinanceState;
   editable: boolean;
   onClose: () => void;
}

const inputOf = ({ id: _id, sortOrder: _sortOrder, ...input }: FinAccount) =>
   input;

/* «Счета фонда»: the bank accounts statements are loaded to, each changed
   where it stands. The balance on the opening day is where Cash Flow starts
   counting; an account with operations is turned off, not deleted. */
const AccountsDialog = ({
   open,
   data,
   editable,
   onClose,
}: AccountsDialogProps) => {
   const { t, i18n } = useTranslation('finance');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const user = useCurrentUser();
   const [removing, setRemoving] = useState<FinAccount | null>(null);
   const adding = useRequest({ kind: 'create' });
   const can = editable && data.stored;

   const save = (account: FinAccount, patch: Partial<FinAccount>) =>
      finance.saveAccount(
         account.id,
         { ...inputOf(account), ...patch },
         user.id,
      );
   const usedBy = (account: FinAccount) =>
      data.transactions.filter(({ accountId }) => accountId === account.id)
         .length;

   return (
      <>
         <Modal
            open={open && !removing}
            size='wide'
            subtitle={t(
               'Остаток на дату начала: с него Cash Flow считает деньги на счёте.',
            )}
            title={t('Счета фонда')}
            onClose={onClose}
         >
            <ModalBody>
               <div className='border-line rounded-lg border'>
                  <Table
                     className='min-w-4xl'
                     head={
                        <>
                           <th className={clsx(TH, 'w-14')}>{t('Вкл.')}</th>
                           <th className={TH}>{t('Название')}</th>
                           <th className={TH}>{t('Банк')}</th>
                           <th className={TH}>{t('Номер счёта')}</th>
                           <th className={clsx(TH, 'w-24')}>{t('Валюта')}</th>
                           <th className={clsx(TH, 'text-right')}>
                              {t('Остаток на начало')}
                           </th>
                           <th className={TH}>{t('Дата начала')}</th>
                           <th className={clsx(TH, 'text-right')}>
                              {t('Сейчас')}
                           </th>
                           <th
                              aria-label={t('Действия')}
                              className={clsx(TH, 'w-10')}
                           />
                        </>
                     }
                  >
                     {data.accounts.map((account) => (
                        <tr key={account.id}>
                           <td className={TD}>
                              <Switch
                                 small
                                 checked={account.active}
                                 disabled={!can}
                                 hint={
                                    account.active
                                       ? t(
                                            'Счёт используется: на него загружают выписки',
                                         )
                                       : t(
                                            'Счёт закрыт: новые выписки на него не загружают',
                                         )
                                 }
                                 label={t('Счёт используется: {{name}}', {
                                    name: account.name,
                                 })}
                                 onChange={(active) =>
                                    save(account, { active })
                                 }
                              />
                           </td>
                           <td className={TD}>
                              <InlineField
                                 disabled={!can}
                                 label={t('Название')}
                                 maxLength={80}
                                 validate={(text) =>
                                    text ? undefined : t('Нужно название')
                                 }
                                 value={account.name}
                                 onSave={(name) => save(account, { name })}
                              />
                           </td>
                           <td className={TD}>
                              <InlineField
                                 disabled={!can}
                                 label={t('Банк')}
                                 maxLength={80}
                                 placeholder='—'
                                 value={account.bank}
                                 onSave={(bank) => save(account, { bank })}
                              />
                           </td>
                           <td className={TD}>
                              <InlineField
                                 className='tabular-nums'
                                 disabled={!can}
                                 inputMode='numeric'
                                 label={t('Номер счёта')}
                                 maxLength={34}
                                 placeholder='—'
                                 value={account.number}
                                 onSave={(number) => save(account, { number })}
                              />
                           </td>
                           <td className={TD}>
                              <InlineField
                                 disabled={!can || usedBy(account) > 0}
                                 kind='select'
                                 label={t('Валюта')}
                                 options={[
                                    ...new Set([
                                       ...CURRENCIES,
                                       account.currency,
                                    ]),
                                 ].map((value) => ({ value, label: value }))}
                                 value={account.currency}
                                 onSave={(currency) =>
                                    save(account, { currency })
                                 }
                              />
                           </td>
                           <td className={clsx(TD, 'text-right')}>
                              <InlineField
                                 className='justify-end text-right tabular-nums'
                                 disabled={!can}
                                 format={(text) =>
                                    formatSum(
                                       Number(text) || 0,
                                       account.currency,
                                       language,
                                    )
                                 }
                                 inputMode='decimal'
                                 kind='number'
                                 label={t('Остаток на начало')}
                                 value={String(account.openingBalance)}
                                 onSave={(text) =>
                                    save(account, {
                                       openingBalance: parseAmount(text) || 0,
                                    })
                                 }
                              />
                           </td>
                           <td className={TD}>
                              <InlineField
                                 disabled={!can}
                                 format={formatNumericDate}
                                 kind='date'
                                 label={t('Дата начала')}
                                 placeholder='—'
                                 value={account.openingDate}
                                 onSave={(openingDate) =>
                                    save(account, { openingDate })
                                 }
                              />
                           </td>
                           <td
                              className={clsx(
                                 TD,
                                 'text-right font-semibold whitespace-nowrap tabular-nums',
                              )}
                           >
                              {formatSum(
                                 accountBalance(account, data.transactions),
                                 account.currency,
                                 language,
                              )}
                           </td>
                           <td className={TD}>
                              {can && (
                                 <button
                                    aria-label={t('Удалить счёт: {{name}}', {
                                       name: account.name,
                                    })}
                                    className='text-ink-soft hover:bg-danger/12 hover:text-danger grid size-7 place-items-center rounded-md'
                                    data-hint={t('Удалить счёт')}
                                    type='button'
                                    onClick={() => setRemoving(account)}
                                 >
                                    <Trash2 aria-hidden className='size-4' />
                                 </button>
                              )}
                           </td>
                        </tr>
                     ))}
                     {!data.accounts.length && (
                        <tr>
                           <td
                              className='text-ink-soft px-4.5 py-8 text-center'
                              colSpan={9}
                           >
                              {t('Счетов пока нет')}
                           </td>
                        </tr>
                     )}
                  </Table>
               </div>
            </ModalBody>
            <ModalFooter
               note={
                  can
                     ? t(
                          'Изменения сохраняются сразу. Валюту счёта с операциями поменять нельзя.',
                       )
                     : t('Счета меняет тот, у кого полный доступ к Финансам.')
               }
            >
               {can && (
                  <Button
                     hint={t('Добавить счёт фонда')}
                     loading={adding.pending}
                     variant='ghost'
                     onClick={() =>
                        adding.run(() =>
                           finance.saveAccount(
                              null,
                              {
                                 name: t('Новый счёт'),
                                 bank: 'АКБ SQB',
                                 number: '',
                                 currency: 'USD',
                                 openingBalance: 0,
                                 openingDate: todayISO(),
                                 active: true,
                              },
                              user.id,
                           ),
                        )
                     }
                  >
                     <Plus aria-hidden />
                     {t('Добавить счёт')}
                  </Button>
               )}
               <Button hint={t('Закрыть окно')} onClick={onClose}>
                  {t('Готово')}
               </Button>
            </ModalFooter>
         </Modal>
         <ConfirmDialog
            disabled={!!removing && usedBy(removing) > 0}
            open={removing !== null}
            subtitle={removing?.name}
            title={t('Удалить счёт?')}
            onClose={() => setRemoving(null)}
            onConfirm={async () => {
               if (removing) await finance.removeAccount(removing.id, user.id);
               setRemoving(null);
            }}
         >
            <p>
               {removing && usedBy(removing) > 0
                  ? t(
                       'Операций на счёте: {{count}}. Удалить его нельзя: выключите его — новые выписки на него не загрузят, а отчёты сохранят его операции.',
                       { count: usedBy(removing) },
                    )
                  : t('Счёт без операций исчезнет из списка.')}
            </p>
         </ConfirmDialog>
      </>
   );
};

export default AccountsDialog;

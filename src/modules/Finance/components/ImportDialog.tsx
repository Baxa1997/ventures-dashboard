import {
   Button,
   Field,
   Modal,
   ModalBody,
   ModalFooter,
   Notice,
} from '@shared/components';
import { formatNumericDate } from '@shared/helpers';
import { toast } from '@shared/helpers/toast';
import { useCurrentUser, useRequest } from '@shared/hooks';
import type { FinanceState, StatementRow } from '@shared/types/finance.types';
import clsx from 'clsx';
import { FileSpreadsheet, UploadCloud } from 'lucide-react';
import { type DragEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
   autoCategory,
   autoDeal,
   categoriesFor,
   categoryName,
   formatSum,
   isInvesting,
   duplicateKey,
   parseStatement,
   readStatementFile,
   savedKeys,
} from '../helpers';
import finance from '../services';

interface ImportDialogProps {
   open: boolean;
   data: FinanceState;
   onClose: () => void;
   onAccounts: () => void; // no account yet: open «Счета фонда»
}

type Row = StatementRow & {
   category: string;
   dealId: string; // an investment's company, found by its name
   duplicate: boolean;
};

const ImportForm = ({
   data,
   onClose,
   onAccounts,
}: Omit<ImportDialogProps, 'open'>) => {
   const { t, i18n } = useTranslation('finance');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const user = useCurrentUser();
   const accounts = data.accounts.filter(({ active }) => active);
   const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
   const [fileName, setFileName] = useState('');
   const [text, setText] = useState('');
   const [picked, setPicked] = useState<Record<number, string>>({});
   const [over, setOver] = useState(false);
   const saving = useRequest({ success: false });
   const account = accounts.find(({ id }) => id === accountId);

   // read again for the account: its number tells money out in a 1С file
   const saved = useMemo(
      () => savedKeys(data.transactions),
      [data.transactions],
   );
   const numbers = data.accounts.map(({ number }) => number);
   const rows: Row[] = text
      ? parseStatement(text, account?.number ?? '').map((row, index) => {
           const category =
              picked[index] ??
              autoCategory(row, data.rules, data.categories, numbers);
           const investing = isInvesting(
              data.categories.find(({ key }) => key === category),
           );
           return {
              ...row,
              category,
              dealId: investing ? autoDeal(row, data.deals) : '',
              duplicate: saved.has(duplicateKey(row, accountId)),
           };
        })
      : [];
   const fresh = rows.filter(({ duplicate }) => !duplicate);

   const read = async (file: File | undefined) => {
      if (!file) return;
      setFileName(file.name);
      setPicked({});
      setText(await readStatementFile(file));
   };
   const drop = (event: DragEvent) => {
      event.preventDefault();
      setOver(false);
      read(event.dataTransfer.files[0]);
   };

   const save = async () => {
      const done = await saving.run(async () => {
         const count = await finance.importStatement(
            accountId,
            fileName,
            fresh.map(({ duplicate: _duplicate, ...row }) => row),
            user.id,
         );
         const left = fresh.filter(({ category }) => !category).length;
         toast.success(
            left
               ? t(
                    'Загружено операций: {{count}}. Без статьи: {{left}}, разнесите их.',
                    {
                       count,
                       left,
                    },
                 )
               : t('Загружено операций: {{count}}', { count }),
         );
      });
      if (done) onClose();
   };

   if (!accounts.length)
      return (
         <>
            <ModalBody>
               <Notice>
                  {t(
                     'Выписка загружается на счёт фонда. Сначала добавьте счёт: банк, номер, валюту и остаток на дату начала.',
                  )}
               </Notice>
            </ModalBody>
            <ModalFooter>
               <Button
                  hint={t('Закрыть окно')}
                  variant='ghost'
                  onClick={onClose}
               >
                  {t('Закрыть')}
               </Button>
               <Button hint={t('Открыть счета фонда')} onClick={onAccounts}>
                  {t('Добавить счёт')}
               </Button>
            </ModalFooter>
         </>
      );

   return (
      <>
         <ModalBody>
            <div className='grid gap-4'>
               <Field label={t('Счёт')}>
                  <select
                     className='field-input'
                     value={accountId}
                     onChange={(event) => setAccountId(event.target.value)}
                  >
                     {accounts.map((one) => (
                        <option key={one.id} value={one.id}>
                           {[
                              one.bank,
                              one.name,
                              one.number.slice(-4),
                              one.currency,
                           ]
                              .filter(Boolean)
                              .join(' · ')}
                        </option>
                     ))}
                  </select>
               </Field>
               <label
                  className={clsx(
                     'border-line-strong hover:bg-hover grid cursor-pointer place-items-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors',
                     over && 'border-accent bg-accent-tint',
                  )}
                  onDragLeave={() => setOver(false)}
                  onDragOver={(event) => {
                     event.preventDefault();
                     setOver(true);
                  }}
                  onDrop={drop}
               >
                  <UploadCloud aria-hidden className='text-accent size-6' />
                  <span className='text-sm font-semibold'>
                     {fileName ||
                        t(
                           'Перетащите файл выписки сюда или нажмите, чтобы выбрать',
                        )}
                  </span>
                  <span className='text-ink-soft max-w-[60ch] text-xs'>
                     {t(
                        'CSV с колонками «Дата; Контрагент; Назначение; Сумма» или «Дебет / Кредит», и 1С .txt (обмен с клиент-банком). Excel сохраните как CSV.',
                     )}
                  </span>
                  <input
                     accept='.csv,.txt,.tsv'
                     className='sr-only'
                     type='file'
                     onChange={(event) => read(event.target.files?.[0])}
                  />
               </label>
               {fileName && !rows.length && (
                  <Notice warning>
                     {t(
                        'В файле не нашлось операций. Нужны дата, сумма и контрагент; проверьте разделитель и заголовки.',
                     )}
                  </Notice>
               )}
               {rows.length > 0 && (
                  <div>
                     <p className='text-ink-soft mb-2 flex items-center gap-1.5 text-xs'>
                        <FileSpreadsheet aria-hidden className='size-3.5' />
                        {t('{{file}}: операций {{count}}', {
                           file: fileName,
                           count: rows.length,
                        })}
                        {rows.length > fresh.length &&
                           t(
                              ', из них {{count}} уже загружены и будут пропущены',
                              {
                                 count: rows.length - fresh.length,
                              },
                           )}
                     </p>
                     <div className='border-line max-h-80 overflow-auto rounded-lg border'>
                        <table className='w-full text-left text-sm'>
                           <thead className='bg-ground text-ink-soft sticky top-0 z-[1] text-[11px] font-semibold'>
                              <tr>
                                 <th className='px-3 py-2'>{t('Дата')}</th>
                                 <th className='px-3 py-2'>
                                    {t('Контрагент и назначение')}
                                 </th>
                                 <th className='px-3 py-2'>{t('Статья')}</th>
                                 <th className='px-3 py-2 text-right'>
                                    {t('Сумма')}
                                 </th>
                              </tr>
                           </thead>
                           <tbody className='divide-line divide-y'>
                              {rows.map((row, index) => (
                                 <tr
                                    key={index}
                                    className={clsx(
                                       row.duplicate && 'opacity-50',
                                    )}
                                 >
                                    <td className='px-3 py-2 align-top whitespace-nowrap'>
                                       {formatNumericDate(row.date)}
                                    </td>
                                    <td className='min-w-48 px-3 py-2 align-top'>
                                       <div className='font-medium'>
                                          {row.party || '—'}
                                          {row.duplicate && (
                                             <span className='text-ink-faint font-normal'>
                                                {' · '}
                                                {t('уже есть')}
                                             </span>
                                          )}
                                       </div>
                                       <div className='text-ink-soft text-xs'>
                                          {row.purpose}
                                       </div>
                                       {row.dealId && (
                                          <div className='text-accent text-xs font-semibold'>
                                             →{' '}
                                             {
                                                data.deals.find(
                                                   ({ id }) =>
                                                      id === row.dealId,
                                                )?.company
                                             }
                                          </div>
                                       )}
                                    </td>
                                    <td className='px-3 py-2 align-top'>
                                       <select
                                          aria-label={t('Статья: {{party}}', {
                                             party: row.party,
                                          })}
                                          className='field-input h-8 min-w-44 text-xs'
                                          disabled={row.duplicate}
                                          value={row.category}
                                          onChange={(event) =>
                                             setPicked((prev) => ({
                                                ...prev,
                                                [index]: event.target.value,
                                             }))
                                          }
                                       >
                                          <option value=''>
                                             {t('Не разнесено')}
                                          </option>
                                          {categoriesFor(
                                             data.categories,
                                             row.amount,
                                          ).map((category) => (
                                             <option
                                                key={category.key}
                                                value={category.key}
                                             >
                                                {categoryName(
                                                   category,
                                                   language,
                                                )}
                                             </option>
                                          ))}
                                       </select>
                                    </td>
                                    <td
                                       className={clsx(
                                          'px-3 py-2 text-right align-top font-semibold whitespace-nowrap tabular-nums',
                                          row.amount < 0
                                             ? 'text-danger'
                                             : 'text-success-ink',
                                       )}
                                    >
                                       {formatSum(
                                          row.amount,
                                          account?.currency ?? 'USD',
                                          language,
                                          true,
                                       )}
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}
            </div>
         </ModalBody>
         <ModalFooter
            note={t(
               'Статьи подставлены по правилам разнесения; их можно поменять до загрузки.',
            )}
         >
            <Button
               hint={t('Закрыть окно, ничего не загружая')}
               variant='ghost'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               disabled={!fresh.length || !data.stored}
               hint={t('Сохранить операции выписки на счёт')}
               loading={saving.pending}
               onClick={save}
            >
               {fresh.length
                  ? t('Загрузить {{count}} операцию', { count: fresh.length })
                  : t('Загрузить')}
            </Button>
         </ModalFooter>
      </>
   );
};

/* «Импорт выписки», as the design draws it: the account, the file, and its
   operations before they are saved, each with the line item the rules give
   it and a select to change it. An operation already saved (the same
   account, day, sum and counterparty) is shown faded and left out. */
const ImportDialog = ({ open, ...form }: ImportDialogProps) => {
   const { t } = useTranslation('finance');
   return (
      <Modal
         open={open}
         size='wide'
         title={t('Импорт банковской выписки')}
         onClose={form.onClose}
      >
         {open && <ImportForm {...form} />}
      </Modal>
   );
};

export default ImportDialog;

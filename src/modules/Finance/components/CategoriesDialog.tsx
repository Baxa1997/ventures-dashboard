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
import { useCurrentUser, useRequest } from '@shared/hooks';
import type {
   FinCash,
   FinCategory,
   FinanceState,
   FinFlow,
   FinPnl,
} from '@shared/types/finance.types';
import type { SupportedLanguageType } from '@shared/types/system/language.types';
import clsx from 'clsx';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CASH_GROUPS, FLOWS, PNL_PLACES } from '../constants';
import { categoryName } from '../helpers';
import finance from '../services';

interface CategoriesDialogProps {
   open: boolean;
   data: FinanceState;
   editable: boolean;
   onClose: () => void;
}

/* «Статьи», the line items operations are sorted into: what each is called,
   which operations may take it (money in, out or either), and where it goes
   in P&L and in Cash Flow. Changed where they stand. One with operations or
   rules is turned off, not deleted; the transfers' item stays as it is. */
const CategoriesDialog = ({
   open,
   data,
   editable,
   onClose,
}: CategoriesDialogProps) => {
   const { t, i18n } = useTranslation('finance');
   const language = (i18n.resolvedLanguage ??
      i18n.language) as SupportedLanguageType;
   const user = useCurrentUser();
   const [removing, setRemoving] = useState<FinCategory | null>(null);
   const [used, setUsed] = useState<number | null>(null);
   const adding = useRequest({ kind: 'create' });
   const can = editable && data.stored;

   useEffect(() => {
      setUsed(null);
      if (removing) finance.categoryUsage(removing.key).then(setUsed);
   }, [removing]);

   const save = (category: FinCategory, patch: Partial<FinCategory>) =>
      finance.saveCategory(category.key, patch, user.id);

   const flows = (Object.keys(FLOWS) as FinFlow[]).map((value) => ({
      value,
      label: t(FLOWS[value]),
   }));
   const places = (Object.keys(PNL_PLACES) as FinPnl[]).map((value) => ({
      value,
      label: t(PNL_PLACES[value]),
   }));
   const groups = (Object.keys(CASH_GROUPS) as FinCash[]).map((value) => ({
      value,
      label: t(CASH_GROUPS[value]),
   }));

   const select = <T extends string>(
      category: FinCategory,
      label: string,
      value: T,
      options: { value: T; label: string }[],
      onSave: (next: T) => unknown,
   ) => (
      <InlineField
         disabled={!can || category.system}
         kind='select'
         label={`${label}: ${categoryName(category, language)}`}
         options={options}
         value={value}
         onSave={(next) => onSave(next as T)}
      />
   );

   return (
      <>
         <Modal
            open={open && !removing}
            size='wide'
            subtitle={t(
               'Операции разносят по статьям; P&L берёт доходы и расходы, Cash Flow группирует всё по видам деятельности.',
            )}
            title={t('Статьи доходов и расходов')}
            onClose={onClose}
         >
            <ModalBody>
               <div className='border-line rounded-lg border'>
                  <Table
                     className='min-w-4xl'
                     head={
                        <>
                           <th className={clsx(TH, 'w-14')}>{t('Вкл.')}</th>
                           <th className={TH}>{t('Статья')}</th>
                           <th className={TH}>{t('Операции')}</th>
                           <th className={TH}>{t('В P&L')}</th>
                           <th className={TH}>{t('В Cash Flow')}</th>
                           <th
                              aria-label={t('Действия')}
                              className={clsx(TH, 'w-10')}
                           />
                        </>
                     }
                  >
                     {data.categories.map((category) => (
                        <tr key={category.key}>
                           <td className={TD}>
                              <Switch
                                 small
                                 checked={category.active}
                                 disabled={!can || category.system}
                                 hint={
                                    category.active
                                       ? t('Статья предлагается операциям')
                                       : t(
                                            'Статья выключена: новым операциям её не предлагают',
                                         )
                                 }
                                 label={t('Статья используется: {{name}}', {
                                    name: categoryName(category, language),
                                 })}
                                 onChange={(active) =>
                                    save(category, { active })
                                 }
                              />
                           </td>
                           <td className={clsx(TD, 'min-w-64')}>
                              <InlineField
                                 disabled={!can}
                                 label={t('Название статьи')}
                                 maxLength={80}
                                 validate={(text) =>
                                    text ? undefined : t('Нужно название')
                                 }
                                 value={categoryName(category, language)}
                                 onSave={(name) =>
                                    save(category, {
                                       names: {
                                          ...category.names,
                                          [language]: name,
                                       },
                                    })
                                 }
                              />
                           </td>
                           <td className={TD}>
                              {select<FinFlow>(
                                 category,
                                 t('Операции'),
                                 category.flow,
                                 flows,
                                 (flow) => save(category, { flow }),
                              )}
                           </td>
                           <td className={TD}>
                              {select<FinPnl>(
                                 category,
                                 t('В P&L'),
                                 category.pnl,
                                 places,
                                 (pnl) => save(category, { pnl }),
                              )}
                           </td>
                           <td className={TD}>
                              {select<FinCash>(
                                 category,
                                 t('В Cash Flow'),
                                 category.cash,
                                 groups,
                                 (cash) => save(category, { cash }),
                              )}
                           </td>
                           <td className={TD}>
                              {category.system ? (
                                 <span
                                    className='text-ink-faint grid size-7 place-items-center'
                                    data-hint={t(
                                       'Перевод между своими счетами не входит ни в P&L, ни в Cash Flow: его вид не меняется',
                                    )}
                                 >
                                    <Lock aria-hidden className='size-3.5' />
                                 </span>
                              ) : (
                                 can && (
                                    <button
                                       aria-label={t(
                                          'Удалить статью: {{name}}',
                                          {
                                             name: categoryName(
                                                category,
                                                language,
                                             ),
                                          },
                                       )}
                                       className='text-ink-soft hover:bg-danger/12 hover:text-danger grid size-7 place-items-center rounded-md'
                                       data-hint={t('Удалить статью')}
                                       type='button'
                                       onClick={() => setRemoving(category)}
                                    >
                                       <Trash2 aria-hidden className='size-4' />
                                    </button>
                                 )
                              )}
                           </td>
                        </tr>
                     ))}
                  </Table>
               </div>
            </ModalBody>
            <ModalFooter
               note={
                  can
                     ? t(
                          'Изменения сохраняются сразу. Название меняется на языке панели.',
                       )
                     : t('Статьи меняет тот, у кого полный доступ к Финансам.')
               }
            >
               {can && (
                  <Button
                     hint={t('Добавить статью')}
                     loading={adding.pending}
                     variant='ghost'
                     onClick={() =>
                        adding.run(() => {
                           const name = t('Новая статья');
                           return finance.saveCategory(
                              null,
                              {
                                 names: { ru: name, uz: name, en: name },
                              },
                              user.id,
                           );
                        })
                     }
                  >
                     <Plus aria-hidden />
                     {t('Добавить статью')}
                  </Button>
               )}
               <Button hint={t('Закрыть окно')} onClick={onClose}>
                  {t('Готово')}
               </Button>
            </ModalFooter>
         </Modal>
         <ConfirmDialog
            disabled={used !== 0}
            open={removing !== null}
            subtitle={removing && categoryName(removing, language)}
            title={t('Удалить статью?')}
            onClose={() => setRemoving(null)}
            onConfirm={async () => {
               if (removing)
                  await finance.removeCategory(removing.key, user.id);
               setRemoving(null);
            }}
         >
            <p>
               {used === null
                  ? t('Проверяем, где используется…')
                  : used > 0
                    ? t(
                         'Операций и правил с этой статьёй: {{count}}. Удалить её нельзя: выключите её — новым операциям её не предложат, а отчёты сохранят.',
                         { count: used },
                      )
                    : t('Статья без операций исчезнет из списка.')}
            </p>
         </ConfirmDialog>
      </>
   );
};

export default CategoriesDialog;

import {
   Button,
   ConfirmDialog,
   InlineField,
   Modal,
   ModalBody,
   ModalFooter,
   Table,
   TD,
   TH,
} from '@shared/components';
import { toast } from '@shared/helpers/toast';
import { useCurrentUser, useRequest } from '@shared/hooks';
import type { FinanceState, FinRule } from '@shared/types/finance.types';
import clsx from 'clsx';
import { Plus, Trash2, WandSparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { categoryName } from '../helpers';
import finance from '../services';

interface RulesDialogProps {
   open: boolean;
   data: FinanceState;
   editable: boolean;
   onClose: () => void;
}

/* «Правила разнесения», as the design has them: when a counterparty or a
   payment's purpose holds a rule's text, an operation of a statement gets
   the rule's line item as it is loaded. «Применить» sorts the operations
   still unsorted by them. */
const RulesDialog = ({ open, data, editable, onClose }: RulesDialogProps) => {
   const { t, i18n } = useTranslation('finance');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const user = useCurrentUser();
   const [removing, setRemoving] = useState<FinRule | null>(null);
   const adding = useRequest({ kind: 'create' });
   const applying = useRequest({ success: false });
   const can = editable && data.stored;
   const options = data.categories
      .filter(({ active }) => active)
      .map((category) => ({
         value: category.key,
         label: categoryName(category, language),
      }));

   const apply = () =>
      applying.run(async () => {
         const count = await finance.applyRules();
         toast.success(
            count
               ? t('Разнесено операций: {{count}}', { count })
               : t('Новых совпадений нет'),
         );
      });

   return (
      <>
         <Modal
            open={open && !removing}
            size='lg'
            subtitle={t(
               'Если контрагент или назначение платежа содержит текст правила, операция при импорте сразу получает статью.',
            )}
            title={t('Правила разнесения')}
            onClose={onClose}
         >
            <ModalBody>
               <div className='border-line rounded-lg border'>
                  <Table
                     head={
                        <>
                           <th className={TH}>
                              {t('Текст в контрагенте или назначении')}
                           </th>
                           <th className={TH}>{t('Статья')}</th>
                           <th
                              aria-label={t('Действия')}
                              className={clsx(TH, 'w-10')}
                           />
                        </>
                     }
                  >
                     {data.rules.map((rule) => (
                        <tr key={rule.id}>
                           <td className={TD}>
                              <InlineField
                                 disabled={!can}
                                 label={t('Текст правила')}
                                 maxLength={120}
                                 placeholder={t('Например: Grant Audit')}
                                 value={rule.match}
                                 onSave={(match) =>
                                    finance.saveRule(
                                       rule.id,
                                       { match },
                                       user.id,
                                    )
                                 }
                              />
                           </td>
                           <td className={TD}>
                              <InlineField
                                 disabled={!can}
                                 kind='select'
                                 label={t('Статья правила: {{text}}', {
                                    text: rule.match,
                                 })}
                                 options={
                                    options.some(
                                       ({ value }) => value === rule.category,
                                    )
                                       ? options
                                       : [
                                            {
                                               value: rule.category,
                                               label: rule.category || '—',
                                            },
                                            ...options,
                                         ]
                                 }
                                 value={rule.category}
                                 onSave={(category) =>
                                    finance.saveRule(
                                       rule.id,
                                       { category },
                                       user.id,
                                    )
                                 }
                              />
                           </td>
                           <td className={TD}>
                              {can && (
                                 <button
                                    aria-label={t('Удалить правило: {{text}}', {
                                       text: rule.match,
                                    })}
                                    className='text-ink-soft hover:bg-danger/12 hover:text-danger grid size-7 place-items-center rounded-md'
                                    data-hint={t('Удалить правило')}
                                    type='button'
                                    onClick={() => setRemoving(rule)}
                                 >
                                    <Trash2 aria-hidden className='size-4' />
                                 </button>
                              )}
                           </td>
                        </tr>
                     ))}
                     {!data.rules.length && (
                        <tr>
                           <td
                              className='text-ink-soft px-4.5 py-8 text-center'
                              colSpan={3}
                           >
                              {t(
                                 'Правил пока нет. Их можно добавить здесь или галочкой «Запомнить» в окне операции.',
                              )}
                           </td>
                        </tr>
                     )}
                  </Table>
               </div>
            </ModalBody>
            <ModalFooter
               note={
                  can && (
                     <Button
                        hint={t('Добавить правило разнесения')}
                        loading={adding.pending}
                        size='sm'
                        variant='ghost'
                        onClick={() =>
                           adding.run(() =>
                              finance.saveRule(
                                 null,
                                 {
                                    match: '',
                                    category:
                                       data.categories.find(
                                          ({ key }) => key === 'other',
                                       )?.key ??
                                       options[0]?.value ??
                                       '',
                                 },
                                 user.id,
                              ),
                           )
                        }
                     >
                        <Plus aria-hidden />
                        {t('Добавить правило')}
                     </Button>
                  )
               }
            >
               <Button
                  hint={t('Закрыть окно')}
                  variant='ghost'
                  onClick={onClose}
               >
                  {t('Закрыть')}
               </Button>
               {can && (
                  <Button
                     hint={t(
                        'Разнести по правилам операции, у которых ещё нет статьи',
                     )}
                     loading={applying.pending}
                     onClick={apply}
                  >
                     <WandSparkles aria-hidden />
                     {t('Применить к неразнесённым')}
                  </Button>
               )}
            </ModalFooter>
         </Modal>
         <ConfirmDialog
            open={removing !== null}
            subtitle={removing?.match}
            title={t('Удалить правило?')}
            onClose={() => setRemoving(null)}
            onConfirm={async () => {
               if (removing) await finance.removeRule(removing.id, user.id);
               setRemoving(null);
            }}
         >
            <p>{t('Уже разнесённые операции сохранят свои статьи.')}</p>
         </ConfirmDialog>
      </>
   );
};

export default RulesDialog;

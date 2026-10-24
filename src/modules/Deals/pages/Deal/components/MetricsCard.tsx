import RowsEditor, {
   type EditableRow,
   emptyRow,
   filledRows,
} from '@modules/Deals/components/RowsEditor';
import deals from '@modules/Deals/services';
import {
   Button,
   Card,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import type { Deal } from '@shared/types/deals.types';
import clsx from 'clsx';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRequest } from '@shared/hooks';

interface MetricsCardProps {
   deal: Deal;
   editable: boolean;
}

/* «Метрики, проверенные DD»: the figures DD confirmed, each with a remark;
   what the company only claimed stays out. The owner enters them after DD. */
const MetricsCard = ({ deal, editable }: MetricsCardProps) => {
   const { t } = useTranslation('deals');
   const [editing, setEditing] = useState(false);
   const metrics = deal.metrics;

   return (
      <Card
         action={
            editable &&
            metrics && (
               <button
                  type='button'
                  className='link'
                  onClick={() => setEditing(true)}
               >
                  {t('Изменить')}
               </button>
            )
         }
         hint={metrics?.hint || undefined}
         title={t('Метрики, проверенные DD')}
      >
         {metrics ? (
            <div className='p-5'>
               <dl className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
                  {metrics.items.map((item) => (
                     <div
                        key={item.label}
                        className='bg-ground rounded-lg px-4 py-3'
                     >
                        <dt className='text-ink-soft text-xs'>{item.label}</dt>
                        <dd>
                           <div className='mt-1 text-xl leading-7 font-bold'>
                              {item.value}
                           </div>
                           <div
                              className={clsx(
                                 'mt-1 text-xs',
                                 item.warn
                                    ? 'text-warning-ink'
                                    : 'text-ink-soft',
                              )}
                           >
                              {item.note}
                           </div>
                        </dd>
                     </div>
                  ))}
               </dl>
               {metrics.note && (
                  <p className='text-ink-soft mt-3.5 text-xs'>{metrics.note}</p>
               )}
            </div>
         ) : (
            <div className='px-5 py-4'>
               <p className='text-ink-soft text-meta'>
                  {t(
                     'Сюда попадают только цифры, которые подтвердил DD: выручка, GMV, EBITDA, удержание. Заявленное компанией без проверки сюда не вносится.',
                  )}
               </p>
               {editable && (
                  <Button
                     className='mt-3'
                     variant='ghost'
                     onClick={() => setEditing(true)}
                  >
                     {t('Внести метрики')}
                  </Button>
               )}
            </div>
         )}
         <Modal
            open={editing}
            subtitle={deal.company}
            title={t('Метрики, проверенные DD')}
            onClose={() => setEditing(false)}
         >
            {editing && (
               <MetricsForm deal={deal} onClose={() => setEditing(false)} />
            )}
         </Modal>
      </Card>
   );
};

const MetricsForm = ({
   deal,
   onClose,
}: {
   deal: Deal;
   onClose: () => void;
}) => {
   const { t } = useTranslation('deals');
   const [hint, setHint] = useState(deal.metrics?.hint ?? '');
   const [note, setNote] = useState(deal.metrics?.note ?? '');
   const [rows, setRows] = useState<EditableRow[]>(() =>
      deal.metrics?.items.length
         ? deal.metrics.items.map((item) => ({ ...item }))
         : [emptyRow()],
   );
   const saving = useRequest();

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const items = filledRows(rows);
      if (
         await saving.run(async () => {
            await deals.setMetrics(deal.id, {
               hint: hint.trim(),
               items: items.map(({ label, value, note: remark, warn }) => ({
                  label,
                  value,
                  note: remark,
                  ...(warn && { warn }),
               })),
               note: note.trim(),
            });
         })
      )
         onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               <Field hint={t('например, «факт 2025»')} label={t('Период')}>
                  <input
                     data-autofocus
                     className='field-input sm:w-60'
                     maxLength={40}
                     value={hint}
                     onChange={(event) => setHint(event.target.value)}
                  />
               </Field>
               <div>
                  <p className='text-ink-soft mb-1.5 text-xs font-medium'>
                     {t('Показатели')}
                  </p>
                  <RowsEditor
                     max={8}
                     placeholders={{
                        label: t('Показатель'),
                        value: t('Значение'),
                        note: t('Комментарий'),
                     }}
                     rows={rows}
                     warnLabel={t('Выделить')}
                     onChange={setRows}
                  />
               </div>
               <Field
                  hint={t('чей DD и когда: так ИК видит, откуда цифры')}
                  label={t('Источник')}
               >
                  <input
                     className='field-input'
                     maxLength={200}
                     value={note}
                     onChange={(event) => setNote(event.target.value)}
                  />
               </Field>
            </div>
         </ModalBody>
         <ModalFooter
            note={t('Строки без показателя или значения не сохраняются.')}
         >
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button loading={saving.pending} type='submit'>
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

export default MetricsCard;

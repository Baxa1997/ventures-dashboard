import RowsEditor, {
   type EditableRow,
   emptyRow,
   filledRows,
} from '@modules/Deals/components/RowsEditor';
import deals from '@modules/Deals/services';
import {
   Button,
   Card,
   FactList,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import type { Deal } from '@shared/types/deals.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRequest } from '@shared/hooks';

interface SynergyCardProps {
   deal: Deal;
   editable: boolean;
}

/* «Синергия с SQB»: what the company could bring the bank (settlements,
   lending, jobs), as the company states it. */
const SynergyCard = ({ deal, editable }: SynergyCardProps) => {
   const { t } = useTranslation('deals');
   const [editing, setEditing] = useState(false);
   const rows = deal.synergy ?? [];

   return (
      <Card
         action={
            editable &&
            rows.length > 0 && (
               <button
                  type='button'
                  className='link'
                  onClick={() => setEditing(true)}
               >
                  {t('Изменить')}
               </button>
            )
         }
         // the note moves under the rows when the header has «Изменить»
         hint={rows.length && !editable ? t('заявлено компанией') : undefined}
         title={t('Синергия с SQB')}
      >
         {rows.length ? (
            <div className='text-meta px-5 py-1'>
               <FactList
                  divided
                  labelWidth='6.5rem'
                  rows={rows.map(([label, value, note]) => ({
                     label,
                     value,
                     note,
                  }))}
               />
               {editable && (
                  <p className='text-ink-soft border-line border-t py-3 text-xs'>
                     {t('Заявлено компанией.')}
                  </p>
               )}
            </div>
         ) : (
            <div className='px-5 py-4'>
               <p className='text-ink-soft text-meta'>
                  {t(
                     'Что компания даст банку: расчёты, кредитование, рабочие места.',
                  )}
               </p>
               {editable && (
                  <Button
                     className='mt-3'
                     variant='ghost'
                     onClick={() => setEditing(true)}
                  >
                     {t('Внести синергию')}
                  </Button>
               )}
            </div>
         )}
         <Modal
            open={editing}
            subtitle={deal.company}
            title={t('Синергия с SQB')}
            onClose={() => setEditing(false)}
         >
            {editing && (
               <SynergyForm deal={deal} onClose={() => setEditing(false)} />
            )}
         </Modal>
      </Card>
   );
};

const SynergyForm = ({
   deal,
   onClose,
}: {
   deal: Deal;
   onClose: () => void;
}) => {
   const { t } = useTranslation('deals');
   const [rows, setRows] = useState<EditableRow[]>(() =>
      deal.synergy?.length
         ? deal.synergy.map(([label, value, note]) => ({
              label,
              value,
              note: note ?? '',
           }))
         : [emptyRow()],
   );
   const saving = useRequest();

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (
         await saving.run(async () => {
            await deals.setSynergy(
               deal.id,
               filledRows(rows).map(({ label, value, note }) =>
                  note ? [label, value, note] : [label, value],
               ),
            );
         })
      )
         onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <RowsEditor
               max={6}
               placeholders={{
                  label: t('Направление'),
                  value: t('Что даёт банку'),
                  note: t('Комментарий'),
               }}
               rows={rows}
               onChange={setRows}
            />
         </ModalBody>
         <ModalFooter
            note={t('Строки без направления или сути не сохраняются.')}
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

export default SynergyCard;

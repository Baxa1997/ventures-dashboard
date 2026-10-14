import { METHOD_LABELS } from '@modules/Procurement/constants';
import procurements from '@modules/Procurement/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import type { Procurement } from '@shared/types/procurement.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface NewProcurementDialogProps {
   open: boolean;
   onClose: () => void;
   onCreated: (procurement: Procurement) => void;
}

// A procurement starts as planned and goes through the six steps of a tender.
const NewProcurementDialog = ({
   open,
   onClose,
   onCreated,
}: NewProcurementDialogProps) => {
   const { t } = useTranslation('procurement');
   const [title, setTitle] = useState('');
   const [scope, setScope] = useState('');
   const [method, setMethod] = useState<Procurement['method']>('e_tender');
   const [price, setPrice] = useState('');
   const [error, setError] = useState('');

   const close = () => {
      setTitle('');
      setScope('');
      setPrice('');
      setError('');
      onClose();
   };

   return (
      <Modal open={open} title={t('Новая закупка')} onClose={close}>
         <form
            className={MODAL_FORM}
            onSubmit={async (event) => {
               event.preventDefault();
               if (!title.trim()) {
                  setError(t('Укажите предмет закупки'));
                  return;
               }
               const procurement = await procurements.createProcurement({
                  title: title.trim(),
                  scope: scope.trim(),
                  method,
                  price: price.trim() || '—',
               });
               close();
               onCreated(procurement);
            }}
         >
            <ModalBody>
               <div className='flex flex-col gap-4'>
                  <Field error={error} label={t('Предмет закупки')}>
                     <input
                        data-autofocus
                        aria-invalid={!!error}
                        className='field-input'
                        value={title}
                        onChange={(event) => {
                           setTitle(event.target.value);
                           setError('');
                        }}
                     />
                  </Field>
                  <Field label={t('Описание')}>
                     <input
                        className='field-input'
                        value={scope}
                        onChange={(event) => setScope(event.target.value)}
                     />
                  </Field>
                  <div className='grid gap-4 sm:grid-cols-2'>
                     <Field label={t('Способ')}>
                        <select
                           className='field-input'
                           value={method}
                           onChange={(event) =>
                              setMethod(
                                 event.target.value as Procurement['method'],
                              )
                           }
                        >
                           {(
                              Object.keys(
                                 METHOD_LABELS,
                              ) as Procurement['method'][]
                           ).map((value) => (
                              <option key={value} value={value}>
                                 {t(METHOD_LABELS[value])}
                              </option>
                           ))}
                        </select>
                     </Field>
                     <Field label={t('Начальная цена')}>
                        <input
                           className='field-input'
                           placeholder={t('например, 950 млн сум с НДС')}
                           value={price}
                           onChange={(event) => setPrice(event.target.value)}
                        />
                     </Field>
                  </div>
               </div>
            </ModalBody>
            <ModalFooter note={t('Первый шаг — техническое задание')}>
               <Button variant='ghost' onClick={close}>
                  {t('Отмена')}
               </Button>
               <Button type='submit'>{t('Создать закупку')}</Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default NewProcurementDialog;

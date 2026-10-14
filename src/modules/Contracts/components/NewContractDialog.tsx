import { TYPE_LABELS } from '@modules/Contracts/constants';
import contracts from '@modules/Contracts/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { TEAM } from '@shared/constants';
import { shortName } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { Contract, ContractType } from '@shared/types/contracts.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface NewContractDialogProps {
   open: boolean;
   onClose: () => void;
   onCreated: (contract: Contract) => void;
}

// A contract enters the register as a draft under approval.
const NewContractDialog = ({
   open,
   onClose,
   onCreated,
}: NewContractDialogProps) => {
   const { t } = useTranslation('contracts');
   const user = useCurrentUser();
   const [title, setTitle] = useState('');
   const [party, setParty] = useState('');
   const [type, setType] = useState<ContractType>('services');
   const [amount, setAmount] = useState('');
   const [term, setTerm] = useState('');
   const [ownerId, setOwnerId] = useState(user.id);
   const [error, setError] = useState('');

   const close = () => {
      setTitle('');
      setParty('');
      setAmount('');
      setTerm('');
      setError('');
      onClose();
   };

   return (
      <Modal open={open} title={t('Новый договор')} onClose={close}>
         <form
            className={MODAL_FORM}
            onSubmit={async (event) => {
               event.preventDefault();
               if (!title.trim()) {
                  setError(t('Укажите номер или название договора'));
                  return;
               }
               const contract = await contracts.createContract({
                  title: title.trim(),
                  party: party.trim(),
                  type,
                  amount: amount.trim() || '—',
                  term: term.trim() || '—',
                  ownerId,
               });
               close();
               onCreated(contract);
            }}
         >
            <ModalBody>
               <div className='grid gap-4 sm:grid-cols-2'>
                  <Field
                     className='sm:col-span-2'
                     error={error}
                     label={t('Договор')}
                  >
                     <input
                        data-autofocus
                        aria-invalid={!!error}
                        className='field-input'
                        placeholder={t(
                           '№ и контрагент, например «ГПХ · И. Назаров»',
                        )}
                        value={title}
                        onChange={(event) => {
                           setTitle(event.target.value);
                           setError('');
                        }}
                     />
                  </Field>
                  <Field
                     className='sm:col-span-2'
                     label={t('Контрагент и предмет')}
                  >
                     <input
                        className='field-input'
                        value={party}
                        onChange={(event) => setParty(event.target.value)}
                     />
                  </Field>
                  <Field label={t('Тип')}>
                     <select
                        className='field-input'
                        value={type}
                        onChange={(event) =>
                           setType(event.target.value as ContractType)
                        }
                     >
                        {(Object.keys(TYPE_LABELS) as ContractType[]).map(
                           (value) => (
                              <option key={value} value={value}>
                                 {t(TYPE_LABELS[value])}
                              </option>
                           ),
                        )}
                     </select>
                  </Field>
                  <Field label={t('Ответственный')}>
                     <select
                        className='field-input'
                        value={ownerId}
                        onChange={(event) => setOwnerId(event.target.value)}
                     >
                        {TEAM.map((employee) => (
                           <option key={employee.id} value={employee.id}>
                              {shortName(employee.name)}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field label={t('Сумма или лимит')}>
                     <input
                        className='field-input'
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                     />
                  </Field>
                  <Field label={t('Срок')}>
                     <input
                        className='field-input'
                        placeholder={t('например, до 31.12.2026')}
                        value={term}
                        onChange={(event) => setTerm(event.target.value)}
                     />
                  </Field>
               </div>
            </ModalBody>
            <ModalFooter
               note={t(
                  'Договор появится в реестре со статусом «На согласовании»',
               )}
            >
               <Button variant='ghost' onClick={close}>
                  {t('Отмена')}
               </Button>
               <Button type='submit'>{t('Добавить в реестр')}</Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default NewContractDialog;

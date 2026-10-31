import { STATUS_INFO, CONTRACT_STATUSES } from '@modules/Contracts/constants';
import contracts from '@modules/Contracts/services';
import {
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
import { TEAM } from '@shared/constants';
import { personName } from '@shared/helpers';
import { useAction, useCurrentUser } from '@shared/hooks';
import type {
   Contract,
   ContractInput,
   ContractStatus,
} from '@shared/types/contracts.types';
import type { Deal } from '@shared/types/deals.types';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ContractDialogProps {
   open: boolean;
   contract: Contract | null; // null: a new one
   initial?: Partial<ContractInput>; // a new one started from a deal
   all: Contract[]; // to check its number is free
   deals: Deal[];
   onClose: () => void;
}

// The team, and the person named if they have left it since.
const people = (current: string) => [
   ...TEAM.map(({ id, name }) => ({ id, name })),
   ...(current && !TEAM.some(({ id }) => id === current)
      ? [{ id: current, name: personName(current) || current }]
      : []),
];

const ContractForm = ({
   contract,
   initial,
   all,
   deals,
   onClose,
}: Omit<ContractDialogProps, 'open'>) => {
   const { t } = useTranslation('contracts');
   const user = useCurrentUser();
   const partyList = useId();
   const [value, setValue] = useState<ContractInput>(() =>
      contract
         ? { ...contract }
         : {
              number: '',
              party: '',
              subject: '',
              type: 'service',
              status: 'draft',
              amount: 0,
              signedDate: '',
              validUntil: '',
              ownerId: user.id,
              approverId: '',
              dealId: '',
              ...initial,
           },
   );
   const [tried, setTried] = useState(false);
   const set = (patch: Partial<ContractInput>) =>
      setValue((prev) => ({ ...prev, ...patch }));

   const number = value.number.trim();
   const errors = {
      number: !number
         ? t('Укажите номер договора')
         : all.some((item) => item.number === number && item.id !== contract?.id)
           ? t('Договор с таким номером уже есть')
           : '',
      party: value.party.trim() ? '' : t('Укажите контрагента'),
      subject: value.subject.trim() ? '' : t('Укажите предмет договора'),
      validUntil:
         value.validUntil &&
         value.signedDate &&
         value.validUntil < value.signedDate
            ? t('Срок заканчивается раньше подписания')
            : '',
   };
   const valid = !Object.values(errors).some(Boolean);

   const save = useAction(
      async () => {
         const next = {
            ...value,
            number,
            party: value.party.trim(),
            subject: value.subject.trim(),
         };
         if (contract) await contracts.update(contract.id, next);
         else await contracts.create(next);
      },
      { success: t('Договор сохранён') },
   );

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setTried(true);
      if (valid && (await save.run())) onClose();
   };

   // the type a contract has even when it is turned off in Настройки
   const types = listOf('contractTypes', true).filter(
      (item) => item.active || item.key === value.type,
   );

   return (
      <form noValidate className={MODAL_FORM} onSubmit={handleSubmit}>
         <ModalBody>
            <div className='grid gap-4'>
               {contract?.decisionNote && contract.status === 'draft' && (
                  <Notice warning>
                     {t('Возвращён на доработку: {{note}}', {
                        note: contract.decisionNote,
                     })}
                  </Notice>
               )}
               <div className='grid gap-4 sm:grid-cols-2'>
                  <Field error={tried ? errors.number : ''} label={t('Номер')}>
                     <input
                        data-autofocus
                        aria-invalid={tried && !!errors.number}
                        className='field-input'
                        maxLength={40}
                        placeholder='УС-2026/09'
                        value={value.number}
                        onChange={(event) =>
                           set({ number: event.target.value })
                        }
                     />
                  </Field>
                  <Field error={tried ? errors.party : ''} label={t('Контрагент')}>
                     <input
                        aria-invalid={tried && !!errors.party}
                        className='field-input'
                        list={partyList}
                        maxLength={160}
                        value={value.party}
                        onChange={(event) => set({ party: event.target.value })}
                     />
                     <datalist id={partyList}>
                        {vendorsOf().map(({ id, name }) => (
                           <option key={id} value={name} />
                        ))}
                     </datalist>
                  </Field>
                  <Field
                     className='sm:col-span-2'
                     error={tried ? errors.subject : ''}
                     label={t('Предмет договора')}
                  >
                     <input
                        aria-invalid={tried && !!errors.subject}
                        className='field-input'
                        maxLength={240}
                        value={value.subject}
                        onChange={(event) =>
                           set({ subject: event.target.value })
                        }
                     />
                  </Field>
                  <Field label={t('Тип')}>
                     <select
                        className='field-input'
                        value={value.type}
                        onChange={(event) => set({ type: event.target.value })}
                     >
                        {types.map((item) => (
                           <option key={item.key} value={item.key}>
                              {nameOf(item)}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field label={t('Статус')}>
                     <select
                        className='field-input'
                        value={value.status}
                        onChange={(event) =>
                           set({ status: event.target.value as ContractStatus })
                        }
                     >
                        {CONTRACT_STATUSES.map((status) => (
                           <option key={status} value={status}>
                              {t(STATUS_INFO[status].label)}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field label={t('Сумма, USD')}>
                     <input
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
                  <Field label={t('Ответственный')}>
                     <select
                        className='field-input'
                        value={value.ownerId}
                        onChange={(event) =>
                           set({ ownerId: event.target.value })
                        }
                     >
                        {people(value.ownerId).map(({ id, name }) => (
                           <option key={id} value={id}>
                              {name}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field label={t('Дата подписания')}>
                     <input
                        className='field-input'
                        type='date'
                        value={value.signedDate}
                        onChange={(event) =>
                           set({ signedDate: event.target.value })
                        }
                     />
                  </Field>
                  <Field
                     error={tried ? errors.validUntil : ''}
                     label={t('Действует до')}
                  >
                     <input
                        aria-invalid={tried && !!errors.validUntil}
                        className='field-input'
                        type='date'
                        value={value.validUntil}
                        onChange={(event) =>
                           set({ validUntil: event.target.value })
                        }
                     />
                  </Field>
                  <Field label={t('Связанная сделка')}>
                     <select
                        className='field-input'
                        value={value.dealId}
                        onChange={(event) => set({ dealId: event.target.value })}
                     >
                        <option value=''>{t('Нет')}</option>
                        {deals.map(({ id, company }) => (
                           <option key={id} value={id}>
                              {company}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field label={t('Согласует')}>
                     <select
                        className='field-input'
                        value={value.approverId}
                        onChange={(event) =>
                           set({ approverId: event.target.value })
                        }
                     >
                        <option value=''>{t('Не требуется')}</option>
                        {people(value.approverId).map(({ id, name }) => (
                           <option key={id} value={id}>
                              {name}
                           </option>
                        ))}
                     </select>
                  </Field>
               </div>
            </div>
         </ModalBody>
         <ModalFooter>
            <Button variant='ghost' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button loading={save.pending} type='submit'>
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

/* A contract's form, as the design draws it. Sent for approval without anyone
   named, it goes to the director; signed without a date, it is signed today. */
const ContractDialog = ({ open, contract, ...form }: ContractDialogProps) => {
   const { t } = useTranslation('contracts');

   return (
      <Modal
         open={open}
         size='lg'
         title={
            contract
               ? t('Договор {{number}}', { number: contract.number })
               : t('Новый договор')
         }
         onClose={form.onClose}
      >
         {open && <ContractForm contract={contract} {...form} />}
      </Modal>
   );
};

export default ContractDialog;

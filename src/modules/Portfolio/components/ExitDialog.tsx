import { EXIT_TYPES } from '@modules/Portfolio/constants';
import { positionOf } from '@modules/Portfolio/helpers';
import portfolio from '@modules/Portfolio/services';
import {
   Button,
   ChoiceCards,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   Notice,
} from '@shared/components';
import { todayISO } from '@shared/helpers';
import { useAction } from '@shared/hooks';
import type {
   ExitInput,
   ExitType,
   PortfolioCompany,
} from '@shared/types/portfolio.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ExitDialogProps {
   company: PortfolioCompany | null; // null: the dialog is closed
   fields: boolean; // ucode keeps an exit's date, sum, kind and buyer
   onClose: () => void;
}

type Outcome = ExitInput['status'];

const ExitForm = ({
   company,
   fields,
   onClose,
}: {
   company: PortfolioCompany;
   fields: boolean;
   onClose: () => void;
}) => {
   const { t } = useTranslation('portfolio');
   const exit = company.exit;
   const worth = positionOf({ ...company, status: 'active' }).value;
   const [outcome, setOutcome] = useState<Outcome>(
      company.status === 'written_off' ? 'written_off' : 'exit',
   );
   const [proceeds, setProceeds] = useState(
      String(exit?.proceeds ?? (worth ? Math.round(worth) : '')),
   );
   const [date, setDate] = useState(exit?.date || todayISO());
   const [type, setType] = useState<ExitType | ''>(exit?.type || 'strategic');
   const [buyer, setBuyer] = useState(exit?.buyer ?? '');
   const [error, setError] = useState('');
   const sold = outcome === 'exit';
   const saving = useAction(
      (input: ExitInput) => portfolio.recordExit(company.id, input),
      {
         success: (input) =>
            input.status === 'exit'
               ? t('Выход зафиксирован')
               : t('Компания списана'),
      },
   );

   return (
      <form
         noValidate
         className={MODAL_FORM}
         onSubmit={async (event) => {
            event.preventDefault();
            const amount = Number(proceeds.replace(/[\s,]/g, ''));
            if (sold && (!Number.isFinite(amount) || amount < 0)) {
               setError(t('Укажите сумму в долларах'));
               return;
            }
            const done = await saving.run({
               status: outcome,
               date,
               proceeds: sold ? amount : 0,
               type: sold ? type : '',
               buyer: sold ? buyer.trim() : '',
            });
            if (done) onClose();
         }}
      >
         <ModalBody>
            <div className='grid gap-4'>
               <ChoiceCards<Outcome>
                  label={t('Итог')}
                  name='outcome'
                  options={[
                     {
                        value: 'exit',
                        label: t('Продажа доли'),
                        note: t('Фонд получил деньги за свою долю'),
                     },
                     {
                        value: 'written_off',
                        label: t('Списание'),
                        note: t('Компания закрылась, вложенное потеряно'),
                     },
                  ]}
                  value={outcome}
                  onChange={setOutcome}
               />
               <div className='grid gap-4 sm:grid-cols-2'>
                  {sold && (
                     <Field
                        error={error}
                        label={t('Сумма, полученная фондом, $')}
                     >
                        <input
                           aria-invalid={!!error}
                           className='field-input'
                           inputMode='numeric'
                           value={proceeds}
                           onChange={(event) => {
                              setProceeds(event.target.value);
                              setError('');
                           }}
                        />
                     </Field>
                  )}
                  <Field label={t('Дата закрытия')}>
                     <input
                        className='field-input'
                        type='date'
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                     />
                  </Field>
                  {sold && (
                     <>
                        <Field label={t('Тип выхода')}>
                           <select
                              className='field-input select-chevron'
                              value={type}
                              onChange={(event) =>
                                 setType(event.target.value as ExitType)
                              }
                           >
                              {Object.entries(EXIT_TYPES).map(
                                 ([value, label]) => (
                                    <option key={value} value={value}>
                                       {t(label)}
                                    </option>
                                 ),
                              )}
                           </select>
                        </Field>
                        <Field label={t('Покупатель')}>
                           <input
                              className='field-input'
                              value={buyer}
                              onChange={(event) => setBuyer(event.target.value)}
                           />
                        </Field>
                     </>
                  )}
               </div>
               {fields ? (
                  <Notice>
                     {t(
                        'Компания перейдёт в «Выходы», а MOIC будет считаться по полученной сумме.',
                     )}
                  </Notice>
               ) : (
                  <Notice warning>
                     {t(
                        'В ucode ещё нет полей выхода (партия 13): статус компании сохранится, а дата, сумма, тип и покупатель — только после того, как поля создадут.',
                     )}
                  </Notice>
               )}
            </div>
         </ModalBody>
         <ModalFooter>
            <Button
               hint={t('Закрыть окно, ничего не меняя')}
               variant='ghost'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               hint={
                  company.status === 'active'
                     ? t('Записать выход фонда из этой компании')
                     : t('Сохранить изменения в выходе')
               }
               loading={saving.pending}
               type='submit'
            >
               {company.status === 'active'
                  ? t('Зафиксировать выход')
                  : t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

/* The fund leaves a company: it sold its stake (what it received, when, how
   and to whom), or the company is written off. Recorded again, it changes
   what was recorded. */
const ExitDialog = ({ company, fields, onClose }: ExitDialogProps) => {
   const { t } = useTranslation('portfolio');
   return (
      <Modal
         open={company !== null}
         title={t('Выход: {{name}}', { name: company?.name ?? '' })}
         onClose={onClose}
      >
         {company && (
            <ExitForm
               key={company.id}
               company={company}
               fields={fields}
               onClose={onClose}
            />
         )}
      </Modal>
   );
};

export default ExitDialog;

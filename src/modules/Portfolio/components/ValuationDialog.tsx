import { valuationOf } from '@modules/Portfolio/helpers';
import portfolio from '@modules/Portfolio/services';
import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { useAction } from '@shared/hooks';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ValuationDialogProps {
   company: PortfolioCompany | null; // null: the dialog is closed
   onClose: () => void;
}

const ValuationForm = ({
   company,
   onClose,
}: {
   company: PortfolioCompany;
   onClose: () => void;
}) => {
   const { t } = useTranslation('portfolio');
   const known = valuationOf(company);
   const [value, setValue] = useState(known ? String(known) : '');
   const [error, setError] = useState('');
   const saving = useAction(
      (amount: number) => portfolio.setValuation(company.id, amount),
      { success: t('Оценка обновлена') },
   );

   return (
      <form
         noValidate
         className={MODAL_FORM}
         onSubmit={async (event) => {
            event.preventDefault();
            const amount = Number(value.replace(/[\s,]/g, ''));
            if (!amount || amount <= 0) {
               setError(t('Укажите оценку в долларах'));
               return;
            }
            if (await saving.run(amount)) onClose();
         }}
      >
         <ModalBody>
            <Field
               error={error}
               hint={t(
                  'Цена последнего раунда или внутренняя переоценка на отчётную дату. Стоимость доли и MOIC считаются от неё.',
               )}
               label={t('Оценка компании (post-money), $')}
            >
               <input
                  data-autofocus
                  aria-invalid={!!error}
                  className='field-input'
                  inputMode='numeric'
                  value={value}
                  onChange={(event) => {
                     setValue(event.target.value);
                     setError('');
                  }}
               />
            </Field>
         </ModalBody>
         <ModalFooter>
            <Button variant='ghost' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button loading={saving.pending} type='submit'>
               {t('Сохранить оценку')}
            </Button>
         </ModalFooter>
      </form>
   );
};

// The fund's valuation of a company, which its stake's worth comes from.
const ValuationDialog = ({ company, onClose }: ValuationDialogProps) => {
   const { t } = useTranslation('portfolio');
   return (
      <Modal
         open={company !== null}
         title={t('Оценка {{name}}', { name: company?.name ?? '' })}
         onClose={onClose}
      >
         {company && (
            <ValuationForm
               key={company.id}
               company={company}
               onClose={onClose}
            />
         )}
      </Modal>
   );
};

export default ValuationDialog;

import InvestmentFields from '@modules/Deals/components/InvestmentFields';
import {
   draftOf,
   type InvestmentErrors,
   readInvestment,
} from '@modules/Deals/helpers/investment';
import deals from '@modules/Deals/services';
import portfolio from '@modules/Portfolio/services';
import {
   Button,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { formatDayYear, formatUsd } from '@shared/helpers';
import { useAction } from '@shared/hooks';
import type {
   Investment,
   InvestmentRecord,
   PortfolioCompany,
} from '@shared/types/portfolio.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface InvestmentDialogProps {
   company: PortfolioCompany;
   investment: InvestmentRecord | null; // null: the dialog is closed
   onClose: () => void;
}

const InvestmentForm = ({
   company,
   investment,
   onClose,
}: {
   company: PortfolioCompany;
   investment: InvestmentRecord;
   onClose: () => void;
}) => {
   const { t, i18n } = useTranslation('portfolio');
   const { t: tDeals } = useTranslation('deals');
   const [draft, setDraft] = useState(() => draftOf(investment));
   const [errors, setErrors] = useState<InvestmentErrors>({});
   const saving = useAction(
      async (input: Investment) => {
         await portfolio.updateInvestment(company.id, investment, input);
         // the money's history stays with the deal it closed
         const dealId = investment.dealId || company.dealId;
         if (dealId)
            await deals.addNote(
               dealId,
               t('Инвестиция изменена: {{value}}', {
                  value: [
                     formatUsd(input.amount, i18n.language),
                     formatDayYear(input.date),
                     input.stakePct !== null && `${input.stakePct}%`,
                  ]
                     .filter(Boolean)
                     .join(' · '),
               }),
            );
      },
      {
         success: t('Платёж сохранён'),
         error: t('Не удалось сохранить платёж'),
      },
   );

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const read = readInvestment(tDeals, draft);
      if ('errors' in read) {
         setErrors(read.errors);
         return;
      }
      if (await saving.run(read.investment)) onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <InvestmentFields
               errors={errors}
               stakeHint={t('что купил этот платёж; доля фонда — сумма всех')}
               value={draft}
               onChange={(value) => {
                  setDraft(value);
                  setErrors({});
               }}
            />
         </ModalBody>
         <ModalFooter>
            <Button
               hint={t('Закрыть окно, ничего не меняя')}
               type='button'
               variant='ghost'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               hint={t('Сохранить: от платежа считаются вложения, доля и MOIC')}
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

/* A payment of the fund as it really went: a correction, or its stake and
   valuation once known, as when a SAFE converts. */
const InvestmentDialog = ({
   company,
   investment,
   onClose,
}: InvestmentDialogProps) => {
   const { t } = useTranslation('portfolio');
   return (
      <Modal
         open={investment !== null}
         subtitle={company.name}
         title={t('Платёж фонда')}
         onClose={onClose}
      >
         {investment && (
            <InvestmentForm
               key={investment.id}
               company={company}
               investment={investment}
               onClose={onClose}
            />
         )}
      </Modal>
   );
};

export default InvestmentDialog;

import {
   Button,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { useAction } from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import deals from '../services';
import InvestmentFields, {
   type InvestmentErrors,
   investmentDraft,
   readInvestment,
} from './InvestmentFields';

interface PortfolioDialogProps {
   deal: Deal | null; // null: the dialog is closed
   onClose: () => void;
}

/* A deal that reached the portfolio before the panel made its company there:
   the owner enters the fund's investment, and the company appears in
   Портфель. A deal moved from Закрытие gets its company in TransferDialog. */
const PortfolioDialog = ({ deal, onClose }: PortfolioDialogProps) => {
   const { t } = useTranslation('deals');
   const [draft, setDraft] = useState(() => deal && investmentDraft(deal));
   const [errors, setErrors] = useState<InvestmentErrors>({});
   const joining = useAction(
      (id: string, investment: Parameters<typeof deals.joinPortfolio>[1]) =>
         deals.joinPortfolio(id, investment),
      { kind: 'create', success: t('Компания добавлена в «Портфель»') },
   );

   useEffect(() => {
      if (deal) setDraft(investmentDraft(deal));
      setErrors({});
      // a fresh form each time it opens
   }, [deal?.id]);

   const submit = async () => {
      if (!deal || !draft) return;
      const read = readInvestment(t, draft);
      if ('errors' in read) {
         setErrors(read.errors);
         return;
      }
      if (await joining.run(deal.id, read.investment)) onClose();
   };

   return (
      <Modal
         open={deal !== null}
         subtitle={t('Компания появится в «Портфеле» с первой инвестицией')}
         title={
            deal
               ? t('Добавить {{company}} в «Портфель»', {
                    company: deal.company,
                 })
               : ''
         }
         onClose={onClose}
      >
         <form
            className={MODAL_FORM}
            onSubmit={(event) => {
               event.preventDefault();
               submit();
            }}
         >
            <ModalBody>
               {draft && (
                  <InvestmentFields
                     errors={errors}
                     value={draft}
                     onChange={(value) => {
                        setDraft(value);
                        setErrors({});
                     }}
                  />
               )}
            </ModalBody>
            <ModalFooter>
               <Button variant='text' onClick={onClose}>
                  {t('Отмена')}
               </Button>
               <Button loading={joining.pending} type='submit'>
                  {t('Добавить в портфель')}
               </Button>
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default PortfolioDialog;

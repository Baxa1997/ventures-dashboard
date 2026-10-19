import { quarterLabel, hasAllDocs } from '@modules/Portfolio/helpers';
import type { PortfolioData } from '@modules/Portfolio/hooks';
import portfolio from '@modules/Portfolio/services';
import { Button, Modal, ModalBody, ModalFooter } from '@shared/components';
import { formatDate } from '@shared/helpers';
import { useTranslation } from 'react-i18next';

interface RemindDialogProps {
   data: PortfolioData;
   open: boolean;
   onClose: () => void;
}

// Asks the companies that have not sent all their documents for them again.
const RemindDialog = ({ data, open, onClose }: RemindDialogProps) => {
   const { t } = useTranslation('portfolio');
   const { companies, cycle } = data;
   const missing = companies.filter(
      (company) => !hasAllDocs(company, cycle.quarter),
   );

   return (
      <Modal
         open={open}
         subtitle={t('Срок сдачи — {{date}}', { date: formatDate(cycle.due) })}
         title={t('Отчёты за {{quarter}}', {
            quarter: quarterLabel(t, cycle.quarter, true),
         })}
         onClose={onClose}
      >
         <ModalBody>
            {missing.length ? (
               <>
                  <p>
                     {t(
                        'Эти компании ещё не сдали все документы. Панель запишет дату напоминания, а написать им нужно самим:',
                     )}
                  </p>
                  <ul className='mt-3 flex flex-wrap gap-2'>
                     {missing.map((company) => (
                        <li
                           key={company.id}
                           className='bg-ground rounded-md px-2.5 py-1 font-medium'
                        >
                           {company.name}
                        </li>
                     ))}
                  </ul>
                  {cycle.remindedAt && (
                     <p className='text-ink-soft mt-3 text-xs'>
                        {t(
                           'Последнее напоминание — {{date}}. Следующее уйдёт автоматически {{auto}}.',
                           {
                              date: formatDate(cycle.remindedAt),
                              auto: formatDate(cycle.autoReminderAt),
                           },
                        )}
                     </p>
                  )}
               </>
            ) : (
               <p>{t('Все компании сдали документы за квартал.')}</p>
            )}
         </ModalBody>
         <ModalFooter>
            <Button variant='ghost' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button
               disabled={!missing.length}
               onClick={async () => {
                  await portfolio.remind();
                  onClose();
               }}
            >
               {t('Отправить напоминание')}
            </Button>
         </ModalFooter>
      </Modal>
   );
};

export default RemindDialog;

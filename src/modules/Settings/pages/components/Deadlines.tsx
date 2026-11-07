import { Notice } from '@shared/components';
import type { FundRules } from '@shared/types/settings.types';
import { useTranslation } from 'react-i18next';
import RuleRows from './RuleRows';

interface DeadlinesProps {
   rules: FundRules;
   editable: boolean;
   stored: boolean; // ucode has batch 25's fields
}

/* The deadlines the panel counts by: when a portfolio company's quarterly
   reports are due and the reminder before it, when a company's request to
   the fund turns red, and how long before its end a contract is flagged. */
const Deadlines = ({ rules, editable, stored }: DeadlinesProps) => {
   const { t } = useTranslation('settings');

   return (
      <>
         {!stored && (
            <Notice className='mb-4' warning>
               {t(
                  'Сроки отчётов и договоров можно будет менять, когда в ucode будет партия 25; пока действуют числа ниже.',
               )}
            </Notice>
         )}
         <RuleRows
            editable={editable}
            footer={t(
               'Срок отчёта — это число месяца после квартала: при 25 отчёт за III квартал ждут 25 октября.',
            )}
            rows={[
               {
                  key: 'reportsDueDay',
                  label: t('Квартальные отчёты компаний ждут'),
                  unit: t('числа месяца после квартала'),
                  min: 1,
                  max: 28,
                  stored,
               },
               {
                  key: 'reportsReminderDays',
                  label: t('Напоминание об отчёте'),
                  unit: t('дней до срока'),
                  min: 0,
                  max: 27,
                  stored,
               },
               {
                  key: 'requestAnswerDays',
                  label: t('Запрос компании без ответа краснеет через'),
                  unit: t('дней'),
                  min: 1,
                  max: 90,
               },
               {
                  key: 'contractExpiringDays',
                  label: t('Договор отмечается как истекающий за'),
                  unit: t('дней до конца'),
                  min: 1,
                  max: 365,
                  stored,
               },
            ]}
            rules={rules}
         />
      </>
   );
};

export default Deadlines;

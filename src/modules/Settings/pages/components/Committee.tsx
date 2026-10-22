import { IC_RULES } from '@modules/Committee/constants';
import { Card, FactList } from '@shared/components';
import { useTranslation } from 'react-i18next';

// The committee's rules: the quorum, the materials and how votes become a
// decision. They follow the IC regulation and change with it.
const Committee = () => {
   const { t } = useTranslation('settings');

   return (
      <Card className='flex flex-col'>
         <FactList
            className='max-w-xl px-5 py-2'
            labelWidth='9rem'
            rows={[
               {
                  label: t('Кворум'),
                  value: t('{{count}} член', { count: IC_RULES.quorum }),
               },
               {
                  label: t('Материалы за'),
                  value: t('{{count}} рабочий день', {
                     count: IC_RULES.materialsDays,
                  }),
               },
               {
                  label: t('1 голос «против»'),
                  value: t('обсуждение, решает спонсор'),
               },
               { label: t('2 и более «против»'), value: t('отказ') },
               { label: t('Особое мнение'), value: t('вето') },
            ]}
         />
         <p className='text-ink-soft border-line mt-auto border-t px-5 py-3 text-xs'>
            {t(
               'Источник: «Чек-лист ИК» в Notion. Сверить с Положением об ИК — числа в положении главнее.',
            )}
         </p>
      </Card>
   );
};

export default Committee;

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface NoDataProps {
   children?: ReactNode;
}

const NoData = ({ children }: NoDataProps) => {
   const { t } = useTranslation('components');
   return (
      <p className='text-ink-soft my-auto px-5 py-12 text-center'>
         {children ?? t('Нет данных')}
      </p>
   );
};

export default NoData;

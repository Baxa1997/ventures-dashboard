import { useTranslation } from 'react-i18next';

const Loading = () => {
   const { t } = useTranslation('components');
   return (
      <p role='status' className='text-ink-soft px-4 py-8 text-center'>
         {t('Загрузка…')}
      </p>
   );
};

export default Loading;

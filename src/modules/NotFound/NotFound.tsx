import { buttonClass } from '@shared/components';
import { MY_DAY_PATH } from '@shared/constants';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

const NotFound = () => {
   const { t } = useTranslation('layout');
   return (
      <div className='mx-auto flex max-w-md flex-col items-center gap-3 px-5 py-20 text-center'>
         <h1 className='text-display font-bold'>{t('Страница не найдена')}</h1>
         <p className='text-ink-soft'>
            {t('Такой страницы нет или она была перемещена')}
         </p>
         <Link
            className={buttonClass('primary', 'mt-2')}
            data-hint={t('Открыть страницу «Мой день»')}
            to={MY_DAY_PATH}
         >
            {t('К моему дню')}
         </Link>
      </div>
   );
};

export default NotFound;

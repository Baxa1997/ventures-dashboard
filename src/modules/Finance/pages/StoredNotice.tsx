import { Notice } from '@shared/components';
import { useTranslation } from 'react-i18next';

// Until batch 27 has made the tables, a page says why it is empty and
// offers nothing to save.
const StoredNotice = ({ stored }: { stored: boolean }) => {
   const { t } = useTranslation('finance');
   if (stored) return null;
   return (
      <Notice warning className='mb-3.5'>
         {t(
            'Финансы ещё нельзя вести: в ucode нет их таблиц (партия 27 в docs/ucode-migration.md).',
         )}
      </Notice>
   );
};

export default StoredNotice;

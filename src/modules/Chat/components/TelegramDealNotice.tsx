import { Notice } from '@shared/components';
import { SETTINGS_PATH } from '@shared/constants';
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../services/telegram';

/* In «Новая сделка»: what happens to the new deal's Telegram group. With the
   fund's account it opens by itself; with the bot alone a person links it in
   «Чат и письма»; without the bot's server, the form asks to set it up. */
const TelegramDealNotice = () => {
   const { t } = useTranslation('chat');
   const state = useTelegram();
   if (!state) return null;

   if (state.connected)
      return (
         <Notice className='mb-4' icon={Send}>
            {state.mode === 'account'
               ? t('Группа сделки откроется в Telegram сама, как только сделка будет создана.')
               : t(
                    'После создания откройте сделку в «Чат и письма» и нажмите «Подключить группу»: бот станет админом пустой группы, которую вы создадите в Telegram.',
                 )}
         </Notice>
      );

   return (
      <Notice className='mb-4' icon={Send}>
         {t(
            'Telegram не подключён: группа сделки откроется в «Чат и письма», а в Telegram — когда фонд подключит Telegram.',
         )}{' '}
         <a
            className='text-accent font-semibold hover:underline'
            data-hint={t(
               'Открыть Настройки → Интеграции в новой вкладке: эта форма останется открытой',
            )}
            href={`${SETTINGS_PATH}/integrations`}
            rel='noreferrer'
            target='_blank'
         >
            {t('Настроить Telegram')}
         </a>
      </Notice>
   );
};

export default TelegramDealNotice;

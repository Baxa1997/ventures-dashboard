import {
   CHANNELS,
   INTEGRATION_STATES,
   INTEGRATIONS,
} from '@modules/Settings/constants';
import { Badge, Card } from '@shared/components';
import { useTranslation } from 'react-i18next';

/* Where the platform's data comes from and goes to. The channels it will use
   by itself — mail, the Telegram bot, AI, the content sources — and the
   systems the fund works with today. Their keys live on the platform's
   server, so each is connected by the developer, not typed in here. */
const Integrations = () => {
   const { t } = useTranslation('settings');

   const card = (
      item: (typeof CHANNELS)[number] | (typeof INTEGRATIONS)[number],
   ) => (
      <Card key={item.id} className='p-5'>
         <div className='flex items-start justify-between gap-3'>
            <h3 className='text-title font-bold'>{t(item.title)}</h3>
            <Badge tone={INTEGRATION_STATES[item.state].tone}>
               {t(INTEGRATION_STATES[item.state].label)}
            </Badge>
         </div>
         <p className='text-ink-soft mt-2'>{t(item.text)}</p>
         {'needs' in item && (
            <p className='text-meta mt-3'>
               <span className='text-ink-soft'>
                  {t('Нужно для подключения:')}
               </span>{' '}
               {t(item.needs)}
            </p>
         )}
      </Card>
   );

   return (
      <div className='flex flex-col gap-section'>
         <section>
            <h2 className='text-ink-soft mb-2 text-xs font-semibold tracking-wide uppercase'>
               {t('Каналы платформы')}
            </h2>
            <div className='gap-section stagger grid md:grid-cols-2'>
               {CHANNELS.map(card)}
            </div>
         </section>
         <section>
            <h2 className='text-ink-soft mb-2 text-xs font-semibold tracking-wide uppercase'>
               {t('Системы фонда')}
            </h2>
            <div className='gap-section stagger grid md:grid-cols-2 2xl:grid-cols-3'>
               {INTEGRATIONS.map(card)}
            </div>
         </section>
         <p className='text-ink-soft text-xs'>
            {t(
               'Пароли и ключи (почта, бот, ИИ) хранятся на сервере платформы, не в браузере, поэтому их подключает разработчик. Банк, налоговая и etender пока работают через файлы.',
            )}
         </p>
      </div>
   );
};

export default Integrations;

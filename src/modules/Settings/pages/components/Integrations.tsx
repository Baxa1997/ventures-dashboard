import {
   CHANNELS,
   INTEGRATION_STATES,
   INTEGRATIONS,
} from '@modules/Settings/constants';
import { Badge, Card, Notice } from '@shared/components';
import {
   BookOpen,
   Gavel,
   Globe,
   Landmark,
   type LucideIcon,
   Mail,
   Receipt,
   Rss,
   Send,
   ShieldCheck,
   Sparkles,
   UsersRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Item = (typeof CHANNELS)[number] | (typeof INTEGRATIONS)[number];

const ICONS: Record<Item['id'], LucideIcon> = {
   mail: Mail,
   telegram: Send,
   ai: Sparkles,
   content: Rss,
   bank: Landmark,
   etender: Gavel,
   soliq: Receipt,
   site: Globe,
   notion: BookOpen,
   cabinets: UsersRound,
};

/* Where the platform's data comes from and goes to. The channels it will use
   by itself — mail, the Telegram bot, AI, the content sources — and the
   systems the fund works with today. Their keys live on the platform's
   server, so each is connected by the developer, not typed in here. */
const Integrations = () => {
   const { t } = useTranslation('settings');

   const card = (item: Item) => {
      const Icon = ICONS[item.id];
      return (
         <Card key={item.id} className='p-4'>
            <div className='flex items-start gap-3'>
               <span className='bg-accent-tint text-accent grid size-8 shrink-0 place-items-center rounded-lg'>
                  <Icon aria-hidden className='size-4' />
               </span>
               <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-1'>
                     <h3 className='text-title font-bold'>{t(item.title)}</h3>
                     <Badge tone={INTEGRATION_STATES[item.state].tone}>
                        {t(INTEGRATION_STATES[item.state].label)}
                     </Badge>
                  </div>
                  <p className='text-ink-soft mt-1.5'>{t(item.text)}</p>
                  {'needs' in item && (
                     <p className='text-meta mt-2.5'>
                        <span className='text-ink-soft'>
                           {t('Нужно для подключения:')}
                        </span>{' '}
                        {t(item.needs)}
                     </p>
                  )}
               </div>
            </div>
         </Card>
      );
   };

   return (
      <div className='gap-section flex flex-col'>
         <section>
            <h2 className='text-ink-faint mb-2 text-[11px] font-semibold'>
               {t('Каналы платформы')}
            </h2>
            <div className='gap-section stagger grid md:grid-cols-2'>
               {CHANNELS.map(card)}
            </div>
         </section>
         <section>
            <h2 className='text-ink-faint mb-2 text-[11px] font-semibold'>
               {t('Системы фонда')}
            </h2>
            <div className='gap-section stagger grid md:grid-cols-2'>
               {INTEGRATIONS.map(card)}
            </div>
         </section>
         <Notice icon={ShieldCheck}>
            {t(
               'Пароли и ключи (почта, бот, ИИ) хранятся на сервере платформы, не в браузере, поэтому их подключает разработчик. Банк, налоговая и etender пока работают через файлы.',
            )}
         </Notice>
      </div>
   );
};

export default Integrations;

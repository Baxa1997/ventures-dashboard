import { useRights } from '@modules/Settings/hooks/rights';
import { Badge, Button, Card, ConfirmDialog } from '@shared/components';
import { CHAT_PATH } from '@shared/constants';
import dayjs from 'dayjs';
import { Bot, ChevronRight, Send, Server, UserRound } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import telegram, { useTelegram } from '../services/telegram';
import AccountDialog from './AccountDialog';
import DealGroups from './DealGroups';

// A step's «how to», opened on demand under its card.
const HowTo = ({ title, steps }: { title: string; steps: ReactNode[] }) => (
   <details className='group mt-auto'>
      <summary
         className='text-accent flex cursor-pointer list-none items-center gap-1 text-xs font-semibold'
         data-hint={title}
      >
         <ChevronRight aria-hidden className='size-3.5 transition-transform group-open:rotate-90' />
         {title}
      </summary>
      <ol className='text-ink-soft text-meta mt-2 grid list-decimal gap-1 pl-5'>
         {steps.map((step, index) => (
            <li key={index}>{step}</li>
         ))}
      </ol>
   </details>
);

/* Настройки → Интеграции, Telegram only for now: what connecting it does,
   its three parts with where each stands and how to set it up (the bot, the
   fund's account — connected here — and the bot's server), the deals'
   groups, and how it all works. The state is the bot's server's, read from
   ucode (fund_settings, tg_chats; batch 26). */
const TelegramSetup = () => {
   const { t } = useTranslation('chat');
   const rights = useRights();
   const canEdit = rights('settings') === 'full';
   const state = useTelegram();
   const [connecting, setConnecting] = useState(false);
   const [disconnecting, setDisconnecting] = useState(false);
   const running = !!state?.connected;
   const withAccount = running && state?.mode === 'account';
   const seen = state?.seenAt ? dayjs(state.seenAt).format('DD.MM HH:mm') : '';

   const overall = withAccount
      ? { label: t('Подключено'), tone: 'success' as const }
      : running
        ? { label: t('Работает по ссылке'), tone: 'warning' as const }
        : { label: t('Не подключено'), tone: 'neutral' as const };

   const part = (
      index: number,
      icon: typeof Bot,
      title: string,
      done: boolean,
      where: string,
      text: string,
      action: ReactNode,
      howTo: ReactNode,
   ) => {
      const Icon = icon;
      return (
         <li className='border-line bg-ground flex flex-col gap-2.5 rounded-lg border p-3.5'>
            <div className='flex flex-wrap items-center gap-2'>
               <span className='text-ink-faint text-xs font-bold tabular-nums'>{index}</span>
               <Icon aria-hidden className='text-ink-soft size-4 shrink-0' />
               <span className='font-semibold'>{title}</span>
               <span className='ml-auto'>
                  <Badge tone={done ? 'success' : 'neutral'}>{where}</Badge>
               </span>
            </div>
            <p className='text-ink-soft text-meta'>{text}</p>
            {action}
            {howTo}
         </li>
      );
   };

   return (
      <div className='gap-section flex flex-col'>
         <Card className='p-4.5'>
            <div className='flex items-start gap-3'>
               <span className='grid size-9 shrink-0 place-items-center rounded-lg bg-[#2AABEE] text-white'>
                  <Send aria-hidden className='size-4.5' />
               </span>
               <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-1'>
                     <h3 className='text-title font-bold'>{t('Telegram: группы сделок')}</h3>
                     <Badge tone={overall.tone}>{overall.label}</Badge>
                  </div>
                  <p className='text-ink-soft mt-1.5'>
                     {t(
                        'Каждая новая сделка — с сайта или из «Новой сделки» — открывает свою группу в Telegram, «Сделка: …», с ботом фонда. В группу можно добавить кого угодно. Все сообщения группы видны в «Чат и письма», а ответ из платформы уходит в группу.',
                     )}{' '}
                     <Link
                        className='text-accent font-semibold hover:underline'
                        data-hint={t('Открыть группы сделок в «Чат и письма»')}
                        to={CHAT_PATH}
                     >
                        {t('Чат и письма')}
                     </Link>
                  </p>
               </div>
            </div>
            <ol className='mt-4 grid gap-3 lg:grid-cols-3'>
               {part(
                  1,
                  Bot,
                  t('Бот фонда'),
                  running && !!state?.bot,
                  running && state?.bot ? `@${state.bot}` : t('Ждёт'),
                  t('Бот сидит в каждой группе сделки админом: переносит сообщения в платформу и пишет в группу ответы команды.'),
                  null,
                  <HowTo
                     steps={[
                        t('В Telegram с аккаунта фонда откройте @BotFather и отправьте /newbot.'),
                        t('Имя — «SQB Ventures», имя пользователя — например SQBVenturesBot (должно кончаться на bot).'),
                        t('BotFather пришлёт токен. Передайте его разработчику: он кладёт его в настройки сервера бота. Не присылайте токен в чаты.'),
                        t('Для проверки сделайте второго бота (например SQBVenturesTestBot): один бот работает только на одном сервере.'),
                        t('Когда сервер запущен, здесь появится имя бота.'),
                     ]}
                     title={t('Как зарегистрировать бота')}
                  />,
               )}
               {part(
                  2,
                  UserRound,
                  t('Аккаунт фонда'),
                  withAccount,
                  withAccount
                     ? state?.account?.phone || t('Подключён')
                     : running
                       ? t('Не подключён')
                       : t('Ждёт'),
                  withAccount
                     ? t('Аккаунт создаёт группу каждой новой сделки сам и остаётся её владельцем.')
                     : t('Без аккаунта бот не может создать группу сам: у каждой сделки появляется ссылка «Подключить группу», и группу подключают вручную.'),
                  withAccount ? (
                     state?.account && (
                        <Button
                           disabled={!canEdit}
                           hint={
                              canEdit
                                 ? t('Отключить аккаунт фонда: группы снова будут подключать по ссылке')
                                 : t('Аккаунт отключает директор')
                           }
                           size='sm'
                           variant='danger'
                           onClick={() => setDisconnecting(true)}
                        >
                           {t('Отключить аккаунт')}
                        </Button>
                     )
                  ) : (
                     <Button
                        disabled={!running || !canEdit}
                        hint={
                           !running
                              ? t('Сначала нужен работающий сервер бота (шаг 3)')
                              : !canEdit
                                ? t('Аккаунт подключает директор')
                                : t('Показать QR-код: телефон с Telegram фонда сканирует его, как при входе в Telegram Desktop')
                        }
                        size='sm'
                        onClick={() => setConnecting(true)}
                     >
                        {t('Подключить аккаунт фонда')}
                     </Button>
                  ),
                  <HowTo
                     steps={[
                        t('Нужен номер Telegram, которым владеет фонд (не личный: сервер видит всё в этом аккаунте), открытый на телефоне.'),
                        t('Нажмите «Подключить аккаунт фонда»: появится QR-код.'),
                        t('На телефоне: Telegram → Настройки → Устройства → «Подключить устройство», наведите камеру на код и подтвердите. Если включена двухэтапная проверка, введите её пароль в окне.'),
                        t('Пароль шифруется в браузере и виден только серверу бота. Аккаунт может состоять не более чем в 500 группах (1000 с Premium) и не должен выходить из старых групп.'),
                     ]}
                     title={t('Как подключить аккаунт')}
                  />,
               )}
               {part(
                  3,
                  Server,
                  t('Сервер бота'),
                  running,
                  running
                     ? t('Работает · {{time}}', { time: seen })
                     : seen
                       ? t('Не на связи с {{time}}', { time: seen })
                       : t('Ждёт'),
                  t('Сервис бота работает постоянно: открывает группы, переносит сообщения и раз в минуту отмечается здесь.'),
                  null,
                  <HowTo
                     steps={[
                        t('Разработчик запускает сервис venture/telegram-bot с токеном бота, ключом ucode, секретом сервера (TELEGRAM_SECRET) и ключами приложения Telegram (api_id и api_hash с my.telegram.org — один раз, с любого номера).'),
                        t('Сервис не нужен адрес в интернете: он сам читает Telegram и ucode. Один бот — один запущенный сервис.'),
                        t('Пока сервис не на связи больше трёх минут, Telegram здесь считается не подключённым.'),
                     ]}
                     title={t('Как запустить сервер')}
                  />,
               )}
            </ol>
         </Card>

         <DealGroups canEdit={canEdit} />

         <Card title={t('Как это работает')}>
            <ol className='text-ink-soft grid list-decimal gap-2 py-3.5 pr-4.5 pl-9.5'>
               <li>
                  <b className='text-ink'>{t('Группа открывается сама.')}</b>{' '}
                  {t('Сделка пришла с сайта или создана в «Новой сделке» — аккаунт фонда создаёт группу «Сделка: …», добавляет бота админом, ставит логотип сделки и делает ссылку-приглашение.')}
               </li>
               <li>
                  <b className='text-ink'>{t('Без аккаунта — по ссылке.')}</b>{' '}
                  {t('Создайте в Telegram пустую группу, нажмите «Подключить группу» у сделки (здесь или в «Чат и письма») и выберите её: бот станет админом и переименует её.')}
               </li>
               <li>
                  <b className='text-ink'>{t('Для уже открытых сделок')}</b>{' '}
                  {t('— «Открыть группу» в таблице выше или в «Чат и письма»; «Открыть группы» — сразу для всех сделок в работе без группы.')}
               </li>
               <li>
                  <b className='text-ink'>{t('Люди в группе.')}</b>{' '}
                  {t('Любой участник добавляет кого угодно, как обычно в Telegram, или отправляет ссылку-приглашение («Пригласить по ссылке» в «Чат и письма»). Регистрироваться в боте никому не нужно.')}
               </li>
               <li>
                  <b className='text-ink'>{t('Сообщения.')}</b>{' '}
                  {t('Всё, что пишут в группе, с файлами до 20 МБ, появляется в «Чат и письма» с именем автора. Ответ из платформы бот отправляет в группу с именем сотрудника. Удалённое в Telegram остаётся в платформе.')}
               </li>
               <li>
                  <b className='text-ink'>{t('Сделка закрыта.')}</b>{' '}
                  {t('Группа остаётся как есть; отказ её не закрывает.')}
               </li>
            </ol>
         </Card>

         <AccountDialog open={connecting} onClose={() => setConnecting(false)} />
         <ConfirmDialog
            confirmLabel={t('Отключить')}
            open={disconnecting}
            subtitle={state?.account?.phone}
            success={t('Аккаунт фонда отключается')}
            title={t('Отключить аккаунт фонда?')}
            onClose={() => setDisconnecting(false)}
            onConfirm={() => telegram.logout()}
         >
            <p>
               {t('Сервер бота выйдет из аккаунта. Уже открытые группы останутся, но новые сделки будут подключать группы по ссылке, пока аккаунт не подключат снова.')}
            </p>
         </ConfirmDialog>
      </div>
   );
};

export default TelegramSetup;

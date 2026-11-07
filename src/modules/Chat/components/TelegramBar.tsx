import { useRights } from '@modules/Settings/hooks/rights';
import { Button, buttonClass } from '@shared/components';
import { SETTINGS_PATH } from '@shared/constants';
import { toast } from '@shared/helpers/toast';
import { useAction, useCurrentUser } from '@shared/hooks';
import { Send } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Chat } from '../helpers';
import telegram, { useTelegram } from '../services/telegram';
import AccountDialog from './AccountDialog';

interface TelegramBarProps {
   chat: Chat;
   name: string; // «Сделка: …»
}

/* The line under the open group's head: where its Telegram group stands and
   what to do about it. A deal without a group (one made before Telegram was
   connected, opened from its card's «Чат») is offered the step it needs: the
   setup while the bot's server does not run, the fund's account while it is
   not linked (or a group by link meanwhile), and its group once it is. */
const TelegramBar = ({ chat, name }: TelegramBarProps) => {
   const { t } = useTranslation('chat');
   const user = useCurrentUser();
   const state = useTelegram();
   const asking = useAction(
      () => telegram.requestGroup(chat.deal.id, name, user.id),
      {
         kind: 'create',
         success: t('Группа запрошена: бот откроет её в течение минуты'),
         error: t('Не удалось запросить группу'),
      },
   );
   const rights = useRights();
   const canSetUp = rights('settings') === 'full';
   const [linking, setLinking] = useState(false);
   if (!state) return null;
   const group = chat.group;
   const setupLink = (
      <Link
         className={buttonClass('primary', undefined, false, 'sm')}
         data-hint={t('Открыть Настройки → Интеграции: бот, аккаунт фонда и сервер бота')}
         to={`${SETTINGS_PATH}/integrations`}
      >
         {t('Настроить Telegram')}
      </Link>
   );

   const copy = async (link: string, what: string) => {
      try {
         await navigator.clipboard.writeText(link);
         toast.success(what);
      } catch {
         toast.error(t('Не удалось скопировать ссылку'));
      }
   };

   const bar = (children: ReactNode, warning = false) => (
      <div
         className={
            warning
               ? 'border-line bg-warning-tint text-meta flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4.5 py-2'
               : 'border-line text-meta flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-[#2AABEE]/8 px-4.5 py-2'
         }
      >
         <Send aria-hidden className='size-4 shrink-0 text-[#1d7fb3]' />
         {children}
      </div>
   );

   const request = (label: string) => (
      <Button
         hint={t('Попросить бота открыть группу этой сделки в Telegram')}
         loading={asking.pending}
         size='sm'
         onClick={() => void asking.run()}
      >
         {label}
      </Button>
   );

   // Telegram not running: the setup is the step, whatever the group's state
   if (!state.connected)
      return bar(
         <>
            <span className='min-w-0 flex-1'>
               {group
                  ? t('Сервер бота не на связи: сообщения из Telegram придут, когда он снова заработает.')
                  : t('У этой сделки ещё нет группы в Telegram, а Telegram не подключён.')}
            </span>
            {setupLink}
         </>,
         true,
      );

   if (!group) {
      // the fund's account creates it by itself
      if (state.mode === 'account')
         return bar(
            <>
               <span className='min-w-0 flex-1'>
                  {t('У этой сделки ещё нет группы в Telegram. Аккаунт фонда создаст её сам.')}
               </span>
               {request(t('Открыть группу в Telegram'))}
            </>,
         );
      // no account: link it (here, or in Настройки), or add the bot by hand
      return bar(
         <>
            <span className='min-w-[14rem] flex-1'>
               {t(
                  'У этой сделки ещё нет группы в Telegram. Чтобы группы открывались сами, подключите аккаунт фонда; или подключите группу этой сделки по ссылке.',
               )}
            </span>
            {canSetUp ? (
               <Button
                  hint={t('Показать QR-код: телефон с Telegram фонда сканирует его, как при входе в Telegram Desktop')}
                  size='sm'
                  onClick={() => setLinking(true)}
               >
                  {t('Подключить аккаунт фонда')}
               </Button>
            ) : (
               setupLink
            )}
            <Button
               hint={t('Появится ссылка «Подключить группу» для этой сделки')}
               loading={asking.pending}
               size='sm'
               variant='ghost'
               onClick={() => void asking.run()}
            >
               {t('Подключить группу по ссылке')}
            </Button>
            <AccountDialog open={linking} onClose={() => setLinking(false)} />
         </>,
      );
   }

   if (group.status === 'requested' || group.status === 'creating')
      return bar(
         <span className='min-w-0 flex-1'>
            {t('Группа в Telegram открывается…')}
         </span>,
      );

   if (group.status === 'waiting_bot') {
      const link = telegram.linkOf(state, group);
      return bar(
         <>
            <span className='min-w-[14rem] flex-1'>
               {t(
                  'Группа в Telegram ещё не подключена. Создайте в Telegram пустую группу, нажмите «Подключить группу» и выберите её: бот станет её админом и назовёт её «{{name}}».',
                  { name },
               )}
               {group.error && (
                  <span className='text-ink-soft block text-xs'>{group.error}</span>
               )}
            </span>
            {link && (
               <>
                  <a
                     className={buttonClass('primary', undefined, false, 'sm')}
                     data-hint={t(
                        'Открыть Telegram и выбрать группу для бота. Лучше с телефона: в Telegram Desktop на Mac такая ссылка иногда не срабатывает',
                     )}
                     href={link}
                     rel='noreferrer'
                     target='_blank'
                  >
                     {t('Подключить группу')}
                  </a>
                  <Button
                     hint={t('Скопировать ссылку, чтобы открыть её на телефоне')}
                     size='sm'
                     variant='ghost'
                     onClick={() => void copy(link, t('Ссылка для бота скопирована'))}
                  >
                     {t('Скопировать ссылку')}
                  </Button>
               </>
            )}
         </>,
      );
   }

   if (group.status === 'active')
      return bar(
         <>
            <span className='min-w-0 flex-1'>
               {t('Группа открыта в Telegram: сообщения уходят туда и приходят оттуда.')}
            </span>
            {group.inviteLink && (
               <>
                  <a
                     className={buttonClass('ghost', undefined, false, 'sm')}
                     data-hint={t('Открыть группу «{{name}}» в Telegram', { name })}
                     href={group.inviteLink}
                     rel='noreferrer'
                     target='_blank'
                  >
                     {t('Открыть в Telegram')}
                  </a>
                  <Button
                     hint={t('Скопировать ссылку-приглашение в группу, чтобы добавить людей')}
                     size='sm'
                     variant='ghost'
                     onClick={() =>
                        void copy(group.inviteLink, t('Ссылка-приглашение скопирована'))
                     }
                  >
                     {t('Пригласить по ссылке')}
                  </Button>
               </>
            )}
         </>,
      );

   return bar(
      <>
         <span className='min-w-0 flex-1'>
            {group.status === 'lost'
               ? t('Бота убрали из группы в Telegram: сообщения больше не доходят.')
               : t('Группа в Telegram не открылась.')}
            {group.error && (
               <span className='text-ink-soft block text-xs'>{group.error}</span>
            )}
         </span>
         {request(t('Подключить заново'))}
      </>,
      true,
   );
};

export default TelegramBar;

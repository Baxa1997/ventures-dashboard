import { openNewTask } from '@modules/Work/hooks/useTaskDialog';
import { ActionMenu, buttonClass } from '@shared/components';
import { SECTION_PATHS } from '@shared/constants';
import { useCurrentUser } from '@shared/hooks';
import { Handshake, ListPlus, MailWarning } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { type Chat, fullName, membersOf } from '../helpers';
import chatRead from '../services/read';
import ChatAvatar, { MemberMark } from './ChatAvatar';
import Composer from './Composer';
import MembersDialog from './MembersDialog';
import MessageLog from './MessageLog';
import TelegramBar from './TelegramBar';

interface ChatThreadProps {
   chat: Chat;
   onLeave: () => void; // after «Отметить непрочитанным»: open another chat
}

const SHOWN_MEMBERS = 4;

/* The open group: its head (the mark, the name, who is in it, the deal and
   «⋯»), the conversation, and the line to write in. */
const ChatThread = ({ chat, onLeave }: ChatThreadProps) => {
   const { t } = useTranslation('chat');
   const { t: tDeals } = useTranslation('deals');
   const user = useCurrentUser();
   const navigate = useNavigate();
   const log = useRef<HTMLDivElement>(null);
   const [membersOpen, setMembersOpen] = useState(false);
   const { deal, messages } = chat;
   const name = t('Сделка: {{company}}', { company: deal.company });
   const dealPath = `${SECTION_PATHS.deals}/${deal.id}`;
   const members = useMemo(
      () => membersOf(tDeals, deal, messages),
      [tDeals, deal, messages],
   );
   const names = members.map(({ id }) => fullName(id));

   // the newest line in view, as the chat opens and as messages come
   useEffect(() => {
      log.current?.scrollTo({ top: log.current.scrollHeight });
   }, [deal.id, messages.length]);

   return (
      <div className='flex min-h-0 flex-col'>
         <div className='border-line flex flex-wrap items-center gap-3 border-b px-4.5 py-3'>
            <ChatAvatar
               large
               channel={chat.telegram ? 'telegram' : 'deal'}
               name={name}
            />
            <div className='min-w-0 flex-[1_1_12rem]'>
               <h2 className='truncate text-base font-bold'>{name}</h2>
               <p className='text-ink-soft text-meta truncate'>
                  {members.length
                     ? `${t('{{count}} участник', { count: members.length })} · ${names
                          .slice(0, SHOWN_MEMBERS)
                          .map((full) => full.split(' ')[0])
                          .join(
                             ', ',
                          )}${members.length > SHOWN_MEMBERS ? '…' : ''}`
                     : t('Участников пока нет')}
               </p>
            </div>
            <div className='flex items-center gap-2'>
               {members.length > 0 && (
                  <button
                     type='button'
                     aria-label={t('Участники группы')}
                     className='hover:bg-hover flex rounded-full p-0.5'
                     data-hint={t('Показать участников группы')}
                     onClick={() => setMembersOpen(true)}
                  >
                     {names.slice(0, SHOWN_MEMBERS).map((full, index) => (
                        <MemberMark
                           key={members[index].id}
                           className={index ? '-ml-2' : undefined}
                           name={full}
                        />
                     ))}
                     {members.length > SHOWN_MEMBERS && (
                        <span className='bg-neutral -ml-2 grid size-7 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white'>
                           +{members.length - SHOWN_MEMBERS}
                        </span>
                     )}
                  </button>
               )}
               <Link
                  className={buttonClass('ghost')}
                  data-hint={t('Открыть карточку сделки «{{company}}»', {
                     company: deal.company,
                  })}
                  to={dealPath}
               >
                  <Handshake aria-hidden />
                  <span className='max-w-40 truncate'>{deal.company}</span>
               </Link>
               <ActionMenu
                  actions={[
                     {
                        label: t('Создать задачу из чата'),
                        icon: ListPlus,
                        hint: t('Новая задача по сделке «{{company}}»', {
                           company: deal.company,
                        }),
                        onSelect: () =>
                           openNewTask({
                              title: t('Ответить: {{name}}', { name }),
                              relation: 'deal',
                              relationId: deal.id,
                           }),
                     },
                     {
                        label: t('Отметить непрочитанным'),
                        icon: MailWarning,
                        hint: t(
                           'Вернуть группе метку непрочитанного и открыть другой чат',
                        ),
                        onSelect: () => {
                           chatRead.markUnread(user.id, deal.id);
                           onLeave();
                        },
                     },
                     {
                        label: t('Открыть сделку'),
                        icon: Handshake,
                        hint: t('Открыть карточку сделки «{{company}}»', {
                           company: deal.company,
                        }),
                        onSelect: () => navigate(dealPath),
                     },
                  ]}
                  label={t('Ещё: {{name}}', { name })}
                  name={name}
               />
            </div>
         </div>
         <TelegramBar chat={chat} name={name} />
         <div
            ref={log}
            className='bg-ground min-h-[22.5rem] flex-1 overflow-y-auto overscroll-contain px-4 py-4.5 lg:min-h-0 lg:px-6'
         >
            <MessageLog chatName={name} messages={messages} userId={user.id} />
         </div>
         <Composer
            key={deal.id}
            chatName={name}
            dealId={deal.id}
            telegram={chat.telegram}
         />
         <MembersDialog
            chatName={name}
            members={members}
            open={membersOpen}
            onClose={() => setMembersOpen(false)}
         />
      </div>
   );
};

export default ChatThread;

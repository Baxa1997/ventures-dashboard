import { NoData } from '@shared/components';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { MessagesSquare, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Chat, ChatFilter } from '../helpers';
import ChatAvatar from './ChatAvatar';
import { useLineText } from './MessageLog';

interface ChatListProps {
   chats: Chat[]; // all of them, for the filters' counts
   shown: Chat[]; // those the filter and the search leave
   activeId: string;
   userId: string;
   query: string;
   filter: ChatFilter;
   onQuery: (query: string) => void;
   onFilter: (filter: ChatFilter) => void;
   onOpen: (dealId: string) => void;
}

// Today's messages by their time, older ones by their day.
const whenOf = (at: string) =>
   dayjs(at).isSame(dayjs(), 'day')
      ? dayjs(at).format('HH:mm')
      : dayjs(at).format('DD.MM');

/* The left column: «Чаты», the search, the filters with the unread groups
   each holds, and the groups, the latest conversation first. */
const ChatList = ({
   chats,
   shown,
   activeId,
   userId,
   query,
   filter,
   onQuery,
   onFilter,
   onOpen,
}: ChatListProps) => {
   const { t } = useTranslation('chat');
   const lineText = useLineText();

   const filters: { id: ChatFilter; label: string; count: number }[] = [
      { id: 'all', label: t('Все'), count: 0 },
      {
         id: 'unread',
         label: t('Непрочитанные'),
         count: chats.filter(({ unread }) => unread).length,
      },
   ];

   return (
      <div className='border-line flex min-h-0 flex-col border-b lg:border-r lg:border-b-0'>
         <div className='flex items-center justify-between px-3.5 pt-4 pb-3'>
            <h2 className='flex items-center gap-2 text-[1.1875rem] font-bold'>
               <MessagesSquare aria-hidden className='size-5' />
               {t('Чаты')}
            </h2>
         </div>
         <div className='relative mx-3.5 mb-2.5'>
            <Search
               aria-hidden
               className='text-ink-soft pointer-events-none absolute top-2.5 left-3 size-4'
            />
            <input
               aria-label={t('Поиск по чатам')}
               className='field-input text-meta h-9 w-full pl-9'
               placeholder={t('Поиск по чатам')}
               type='search'
               value={query}
               onChange={(event) => onQuery(event.target.value)}
            />
         </div>
         <div
            role='group'
            aria-label={t('Какие чаты показать')}
            className='bg-ground mx-3.5 mb-2.5 flex flex-wrap gap-0.5 rounded-lg p-0.75'
         >
            {filters.map(({ id, label, count }) => (
               <button
                  key={id}
                  type='button'
                  aria-pressed={id === filter}
                  className={clsx(
                     'flex items-center gap-1.5 rounded-md px-2.25 py-1.25 text-[0.78125rem] font-semibold whitespace-nowrap transition-colors',
                     id === filter
                        ? 'text-ink-strong bg-white shadow-[0_1px_2px_rgba(38,47,112,0.12)]'
                        : 'text-ink-soft hover:text-ink',
                  )}
                  data-hint={
                     id === filter
                        ? t('Сейчас показано: {{name}}', { name: label })
                        : t('Показать: {{name}}', { name: label })
                  }
                  onClick={() => onFilter(id)}
               >
                  {label}
                  {count > 0 && <UnreadBadge count={count} />}
               </button>
            ))}
         </div>
         <div className='border-line min-h-0 flex-1 overflow-y-auto overscroll-contain border-t max-lg:max-h-[21.25rem]'>
            {shown.length ? (
               shown.map((chat) => {
                  const name = t('Сделка: {{company}}', {
                     company: chat.deal.company,
                  });
                  const active = chat.deal.id === activeId;
                  const mine =
                     chat.last.kind !== 'site' && chat.last.userId === userId;
                  return (
                     <button
                        key={chat.deal.id}
                        type='button'
                        aria-current={active || undefined}
                        className={clsx(
                           'border-line flex w-full items-center gap-3 border-b px-3.5 py-3 text-left transition-colors',
                           active ? 'bg-accent-tint' : 'hover:bg-hover',
                        )}
                        data-hint={t('Открыть чат «{{name}}»', { name })}
                        onClick={() => onOpen(chat.deal.id)}
                     >
                        <ChatAvatar
                           channel={chat.telegram ? 'telegram' : 'deal'}
                           name={name}
                        />
                        <div className='min-w-0 flex-1'>
                           <div className='flex items-center justify-between gap-2'>
                              <b className='truncate'>{name}</b>
                              <span className='text-ink-faint shrink-0 text-xs'>
                                 {whenOf(chat.last.at)}
                              </span>
                           </div>
                           <div className='mt-0.5 flex items-center justify-between gap-2'>
                              <span className='text-ink-soft text-meta truncate'>
                                 {mine && (
                                    <span className='text-ink-faint'>
                                       {t('Вы:')}{' '}
                                    </span>
                                 )}
                                 {lineText(chat.last, name)}
                              </span>
                              {chat.unread > 0 && (
                                 <UnreadBadge count={chat.unread} />
                              )}
                           </div>
                        </div>
                     </button>
                  );
               })
            ) : (
               <div className='p-4'>
                  <NoData>
                     {query
                        ? t('Ничего не найдено')
                        : filter === 'unread'
                          ? t('Всё прочитано')
                          : t(
                               'Групп пока нет. Группа сделки появится здесь, как только откроется в Telegram (Настройки → Интеграции → «Группы сделок»).',
                            )}
                  </NoData>
               </div>
            )}
         </div>
      </div>
   );
};

export const UnreadBadge = ({ count }: { count: number }) => (
   <span className='bg-accent grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-bold text-white'>
      {count}
   </span>
);

export default ChatList;

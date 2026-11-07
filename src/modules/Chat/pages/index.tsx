import useDeals from '@modules/Deals/hooks/useDeals';
import deals from '@modules/Deals/services';
import { Loading, NoData, PageHeader } from '@shared/components';
import { useCurrentUser, useServiceData } from '@shared/hooks';
import attachments from '@shared/services/attachments';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import ChatList from '../components/ChatList';
import ChatThread from '../components/ChatThread';
import { type ChatFilter, chatsOf, hasGroup } from '../helpers';
import chatRead, { useChatRead } from '../services/read';
import telegram, { useTelegram } from '../services/telegram';

// How often the open page reads the groups' messages again.
const REFRESH_MS = 10_000;

const loadFiles = () => attachments.getAll();
const watchFiles = (listener: () => void) => attachments.subscribe(listener);

const FILTERS: ChatFilter[] = ['all', 'unread'];

/* «Чат и письма» (prototype: Работа › Чат и письма): every deal's group in
   one place, the list on the left and the open group on the right. The
   address keeps the open group and the filter (`?chat=<deal>&ch=deals`). For
   now the groups are the deals' own (the deal card's «Чат команды»); the
   Telegram groups join once the fund's account is wired in
   (docs/telegram.md). */
const ChatPage = () => {
   const { t } = useTranslation('chat');
   const user = useCurrentUser();
   const { deals: visible, loading } = useDeals();
   const files = useServiceData(loadFiles, watchFiles);
   const read = useChatRead(user.id);
   const tg = useTelegram();
   const [params, setParams] = useSearchParams();
   const [query, setQuery] = useState('');
   const filter = FILTERS.find((id) => id === params.get('ch')) ?? 'all';

   const every = useMemo(
      () => chatsOf(visible, files ?? [], user.id, read, tg?.groups),
      [visible, files, user.id, read, tg],
   );
   // the list holds only the deals whose Telegram group exists
   const chats = useMemo(() => every.filter(({ group }) => hasGroup(group)), [every]);
   const needle = query.trim().toLowerCase();
   const shown = chats.filter(
      (chat) =>
         (filter !== 'unread' || chat.unread > 0) &&
         (!needle ||
            `${chat.deal.company} ${chat.deal.number}`
               .toLowerCase()
               .includes(needle)),
   );
   /* the group asked for in the address; a deal without a group yet (from its
      card's «Чат») opens too, with the bar to open its group in Telegram */
   const current =
      every.find(({ deal }) => deal.id === params.get('chat')) ??
      shown[0] ??
      null;

   const open = (dealId: string) =>
      setParams(
         (previous) => {
            const next = new URLSearchParams(previous);
            if (dealId) next.set('chat', dealId);
            else next.delete('chat');
            return next;
         },
         { replace: true },
      );

   // the groups' messages and their files, and the groups' state, read again
   const refresh = useCallback(
      () =>
         Promise.all([
            deals
               .refreshMessages()
               .then((added) => (added ? attachments.reload() : undefined)),
            telegram.reload(),
         ]).catch((error: unknown) => console.error(error)),
      [],
   );

   // a filter picked shows what came in up to now
   const pick = (id: ChatFilter) => {
      void refresh();
      setParams(
         (previous) => {
            const next = new URLSearchParams(previous);
            if (id === 'all') next.delete('ch');
            else next.set('ch', id);
            next.delete('chat');
            return next;
         },
         { replace: true },
      );
   };

   // others' messages and their files, while the page is open
   useEffect(() => {
      void refresh();
      const timer = setInterval(() => void refresh(), REFRESH_MS);
      return () => clearInterval(timer);
   }, [refresh]);

   // the open group is read up to its last line
   const currentId = current?.deal.id;
   const lastAt = current?.last.at;
   useEffect(() => {
      if (currentId && lastAt && document.visibilityState === 'visible')
         chatRead.markRead(user.id, currentId, lastAt);
   }, [user.id, currentId, lastAt]);

   return (
      <>
         <PageHeader bare title={t('Чат и письма')} />
         {loading ? (
            <Loading />
         ) : (
            <div className='lg:px-page flex flex-1 flex-col px-4 py-5 lg:h-[calc(100dvh-3.375rem)] lg:flex-none'>
               <div className='border-line shadow-card animate-rise grid min-h-0 flex-1 overflow-hidden rounded-xl border bg-white lg:grid-cols-[21.25rem_minmax(0,1fr)]'>
                  <ChatList
                     activeId={current?.deal.id ?? ''}
                     chats={chats}
                     filter={filter}
                     query={query}
                     shown={
                        current && !shown.includes(current)
                           ? [current, ...shown]
                           : shown
                     }
                     userId={user.id}
                     onFilter={pick}
                     onOpen={open}
                     onQuery={setQuery}
                  />
                  {current ? (
                     <ChatThread
                        key={current.deal.id}
                        chat={current}
                        onLeave={() =>
                           open(
                              shown.find(
                                 ({ deal }) => deal.id !== current.deal.id,
                              )?.deal.id ?? '',
                           )
                        }
                     />
                  ) : (
                     <div className='bg-ground grid min-h-[22.5rem] place-items-center p-6'>
                        <NoData>{t('Выберите чат слева')}</NoData>
                     </div>
                  )}
               </div>
            </div>
         )}
      </>
   );
};

export default ChatPage;

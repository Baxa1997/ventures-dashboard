import deals from '@modules/Deals/services';
import { Avatar, Button, Modal, NoData } from '@shared/components';
import { formatDate, personName, todayISO } from '@shared/helpers';
import { useAction, useCurrentUser } from '@shared/hooks';
import type { Deal, JournalEntry } from '@shared/types/deals.types';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { Send } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DealChatProps {
   deal: Deal;
   open: boolean;
   onClose: () => void;
}

type Message = Extract<JournalEntry, { kind: 'message' }>;

// How often the open chat reads the journal again for others' messages.
const REFRESH_MS = 15_000;

/* The team's chat about the deal, as the prototype's «Группа сделки»: the
   fund's people write to each other here, oldest first, mine on the right.
   Each message is an entry of the deal's journal, so it stays in «История»;
   while the window is open it reads the journal again every 15 seconds.
   The startup does not see it. */
const DealChat = ({ deal, open, onClose }: DealChatProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   const [text, setText] = useState('');
   const log = useRef<HTMLDivElement>(null);
   const sending = useAction(
      (message: string) => deals.sendMessage(deal.id, message, user.id),
      { kind: 'send', success: false, error: t('Сообщение не отправлено') },
   );
   const messages = deal.journal
      .filter((entry): entry is Message => entry.kind === 'message')
      .reverse();

   useEffect(() => {
      if (!open) return;
      const read = () => void deals.refreshJournal(deal.id).catch(() => {});
      read();
      const timer = setInterval(read, REFRESH_MS);
      return () => clearInterval(timer);
   }, [open, deal.id]);

   // the newest message in view
   useEffect(() => {
      if (open) log.current?.scrollTo({ top: log.current.scrollHeight });
   }, [open, messages.length]);

   const send = async (event?: FormEvent) => {
      event?.preventDefault();
      const message = text.trim();
      if (message && (await sending.run(message))) setText('');
   };

   const today = todayISO();
   const dayLabel = (date: string) =>
      date === today
         ? t('Сегодня')
         : date === dayjs(today).subtract(1, 'day').format('YYYY-MM-DD')
           ? t('Вчера')
           : formatDate(date);

   return (
      <Modal
         open={open}
         subtitle={t('Сделка: {{company}} · видят только сотрудники фонда', {
            company: deal.company,
         })}
         title={t('Чат команды')}
         onClose={onClose}
      >
         <div
            ref={log}
            className='h-[min(28rem,calc(100dvh-16rem))] overflow-y-auto overscroll-contain px-5 py-4'
         >
            {messages.length ? (
               <ol className='grid gap-2.5'>
                  {messages.map((message, index) => {
                     const mine = message.userId === user.id;
                     const newDay =
                        index === 0 ||
                        messages[index - 1].date !== message.date;
                     return (
                        <li key={message.id} className='grid gap-2.5'>
                           {newDay && (
                              <div className='text-ink-faint text-center text-xs'>
                                 {dayLabel(message.date)}
                              </div>
                           )}
                           <div
                              className={clsx(
                                 'flex items-end gap-2',
                                 mine && 'flex-row-reverse',
                              )}
                           >
                              {!mine && (
                                 <Avatar
                                    name={personName(message.userId)}
                                    size='sm'
                                 />
                              )}
                              <div
                                 className={clsx(
                                    'max-w-[80%] rounded-xl px-3 py-2',
                                    mine
                                       ? 'bg-accent text-white'
                                       : 'bg-ground text-ink',
                                 )}
                              >
                                 {!mine && (
                                    <div className='text-ink-soft text-xs font-semibold'>
                                       {personName(message.userId)}
                                    </div>
                                 )}
                                 <p className='text-meta break-words whitespace-pre-wrap'>
                                    {message.text}
                                 </p>
                                 <div
                                    className={clsx(
                                       'mt-0.5 text-right text-[11px] tabular-nums',
                                       mine
                                          ? 'text-white/75'
                                          : 'text-ink-faint',
                                    )}
                                 >
                                    {message.at
                                       ? dayjs(message.at).format('HH:mm')
                                       : ''}
                                 </div>
                              </div>
                           </div>
                        </li>
                     );
                  })}
               </ol>
            ) : (
               <NoData>
                  {t(
                     'Сообщений пока нет. Напишите команде: сообщение увидят сотрудники фонда, оно останется в истории сделки.',
                  )}
               </NoData>
            )}
         </div>
         <form
            className='border-line bg-ground flex items-end gap-2.5 border-t px-5 py-3.5'
            onSubmit={send}
         >
            <textarea
               data-autofocus
               aria-label={t('Сообщение')}
               className='field-input field-sizing-content max-h-36 min-h-9 flex-1 resize-none bg-white'
               maxLength={2000}
               placeholder={t(
                  'Сообщение… (Enter — отправить, Shift+Enter — новая строка)',
               )}
               rows={1}
               value={text}
               onChange={(event) => setText(event.target.value)}
               onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                     event.preventDefault();
                     void send();
                  }
               }}
            />
            <Button
               disabled={!text.trim()}
               hint={t('Отправить сообщение команде')}
               loading={sending.pending}
               type='submit'
            >
               <Send aria-hidden />
               {t('Отправить')}
            </Button>
         </form>
      </Modal>
   );
};

export default DealChat;

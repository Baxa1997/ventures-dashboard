import { fileUrl } from '@shared/api/ucode';
import { formatDate, todayISO } from '@shared/helpers';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { CheckCheck, CircleAlert, Clock, Paperclip } from 'lucide-react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { type ChatMessage, fullName } from '../helpers';

// What a line says: a message's text, or the group's opening.
export const useLineText = () => {
   const { t } = useTranslation('chat');
   return (message: ChatMessage, chatName: string) =>
      message.kind === 'created'
         ? t('Создал группу «{{name}}»', { name: chatName })
         : message.kind === 'site'
           ? t('Группа открыта по заявке с сайта')
           : message.text ||
             message.files.map(({ title }) => title).join(', ') ||
             t('Файл');
};

interface MessageLogProps {
   messages: ChatMessage[]; // oldest first
   userId: string;
   chatName: string;
}

/* The conversation, as the prototype draws it: a day's pill before its first
   line, others' messages on the left with their author's name, the person's
   own on the right in navy, each with its time and files. */
const MessageLog = ({ messages, userId, chatName }: MessageLogProps) => {
   const { t } = useTranslation('chat');
   const lineText = useLineText();
   const today = todayISO();
   const dayLabel = (date: string) =>
      date === today
         ? t('Сегодня')
         : date === dayjs(today).subtract(1, 'day').format('YYYY-MM-DD')
           ? t('Вчера')
           : formatDate(date);

   return (
      <ol className='grid gap-2'>
         {messages.map((message, index) => {
            const newDay =
               index === 0 || messages[index - 1].date !== message.date;
            const mine = message.kind !== 'site' && message.userId === userId;
            return (
               <Fragment key={message.id}>
                  {newDay && (
                     <li className='flex justify-center py-1.5'>
                        <span className='border-line text-ink-faint rounded-full border bg-white px-2.5 py-0.5 text-xs'>
                           {dayLabel(message.date)}
                        </span>
                     </li>
                  )}
                  {message.kind === 'site' ? (
                     <li className='flex justify-center'>
                        <span className='text-ink-soft rounded-full bg-white/70 px-3 py-1 text-xs'>
                           {lineText(message, chatName)} ·{' '}
                           {dayjs(message.at).format('HH:mm')}
                        </span>
                     </li>
                  ) : (
                     <li
                        className={clsx(
                           'flex',
                           mine ? 'justify-end' : 'justify-start',
                        )}
                     >
                        <div
                           className={clsx(
                              'max-w-[min(70%,35rem)] rounded-[0.875rem] px-3.5 pt-2.5 pb-1.5 leading-normal shadow-[0_1px_1px_rgba(38,47,112,0.06)] max-lg:max-w-[88%]',
                              mine ? 'bg-navy text-white' : 'text-ink bg-white',
                           )}
                        >
                           {!mine && (
                              <div className='mb-0.5 flex items-center gap-1.5 text-[0.6875rem] font-semibold'>
                                 <span className='opacity-75'>
                                    {message.author ||
                                       fullName(message.userId) ||
                                       t('Сотрудник')}
                                 </span>
                                 {message.author && (
                                    <span className='rounded-full bg-[#2AABEE]/15 px-1.5 text-[0.625rem] text-[#1d7fb3]'>
                                       Telegram
                                    </span>
                                 )}
                              </div>
                           )}
                           {(message.kind === 'created' || message.text) && (
                              <p className='break-words whitespace-pre-wrap'>
                                 {lineText(message, chatName)}
                              </p>
                           )}
                           {message.files.map((file) => (
                              <a
                                 key={file.id}
                                 className={clsx(
                                    'mt-1.5 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.78125rem] font-semibold hover:underline',
                                    mine ? 'bg-white/15' : 'bg-[#7f89b4]/14',
                                 )}
                                 data-hint={t('Открыть файл «{{name}}»', {
                                    name: file.title,
                                 })}
                                 href={fileUrl(file.url)}
                                 rel='noreferrer'
                                 target='_blank'
                              >
                                 <Paperclip
                                    aria-hidden
                                    className='size-3.5 shrink-0'
                                 />
                                 <span className='min-w-0 truncate'>
                                    {file.title}
                                 </span>
                              </a>
                           ))}
                           <span className='mt-0.5 flex items-center justify-end gap-1 text-[0.6875rem] opacity-60'>
                              {dayjs(message.at).format('HH:mm')}
                              {mine && message.tgState === 'pending' ? (
                                 <span
                                    className='flex'
                                    data-hint={t('Отправляется в группу в Telegram')}
                                 >
                                    <Clock aria-hidden className='size-3.25' />
                                 </span>
                              ) : mine && message.tgState === 'failed' ? (
                                 <span
                                    className='flex items-center gap-0.5 font-semibold text-[#ffb4b4] opacity-100'
                                    data-hint={t(
                                       'Бот не смог отправить сообщение в группу в Telegram: оно есть только в платформе',
                                    )}
                                 >
                                    <CircleAlert aria-hidden className='size-3.25' />
                                    {t('не ушло в Telegram')}
                                 </span>
                              ) : (
                                 mine && (
                                    <CheckCheck
                                       aria-hidden
                                       className='size-3.25'
                                    />
                                 )
                              )}
                           </span>
                        </div>
                     </li>
                  )}
               </Fragment>
            );
         })}
      </ol>
   );
};

export default MessageLog;

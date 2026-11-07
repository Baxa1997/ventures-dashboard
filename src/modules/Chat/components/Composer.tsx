import deals from '@modules/Deals/services';
import { Button } from '@shared/components';
import { useAction, useCurrentUser } from '@shared/hooks';
import { Paperclip, Send, X } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ComposerProps {
   dealId: string;
   chatName: string;
   telegram: boolean; // the deal's group is open in Telegram: it goes there too
}

const MAX_HEIGHT = 140; // px: the field grows with the text up to this

/* The line under the conversation: a file to attach, the message (Enter
   sends it, Shift+Enter starts a new line) and «Отправить». The files go
   with the message; the field stays as it was if sending fails. */
const Composer = ({ dealId, chatName, telegram }: ComposerProps) => {
   const { t } = useTranslation('chat');
   const user = useCurrentUser();
   const [text, setText] = useState('');
   const [files, setFiles] = useState<File[]>([]);
   const field = useRef<HTMLTextAreaElement>(null);
   const sending = useAction(
      (message: string, attached: File[]) =>
         deals.sendMessage(dealId, message, user.id, attached, { telegram }),
      { kind: 'send', success: false, error: t('Сообщение не отправлено') },
   );

   const fit = () => {
      const area = field.current;
      if (!area) return;
      area.style.height = 'auto';
      area.style.height = `${Math.min(area.scrollHeight, MAX_HEIGHT)}px`;
   };

   const send = async (event?: FormEvent) => {
      event?.preventDefault();
      const message = text.trim();
      if (!message && !files.length) return;
      if (await sending.run(message, files)) {
         setText('');
         setFiles([]);
         requestAnimationFrame(fit);
         field.current?.focus();
      }
   };

   return (
      <form className='border-line border-t bg-white' onSubmit={send}>
         {files.length > 0 && (
            <ul className='flex flex-wrap gap-1.5 px-4 pt-3'>
               {files.map((file, index) => (
                  <li
                     key={`${file.name}-${index}`}
                     className='border-line bg-ground flex max-w-full min-w-0 items-center gap-1.5 rounded-lg border py-1 pr-1 pl-2 text-xs'
                  >
                     <Paperclip aria-hidden className='size-3.5 shrink-0' />
                     <span className='min-w-0 truncate'>{file.name}</span>
                     <button
                        type='button'
                        aria-label={t('Убрать файл «{{name}}»', {
                           name: file.name,
                        })}
                        className='text-ink-soft hover:bg-hover hover:text-ink grid size-5 shrink-0 place-items-center rounded'
                        data-hint={t('Убрать файл «{{name}}»', {
                           name: file.name,
                        })}
                        onClick={() =>
                           setFiles((list) =>
                              list.filter((_, at) => at !== index),
                           )
                        }
                     >
                        <X aria-hidden className='size-3.5' />
                     </button>
                  </li>
               ))}
            </ul>
         )}
         <div className='flex items-end gap-2 px-4 py-3'>
            <label
               className='text-ink-soft hover:bg-hover hover:text-ink grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors'
               data-hint={t('Прикрепить файл к сообщению')}
            >
               <Paperclip aria-hidden className='size-5' />
               <input
                  multiple
                  aria-label={t('Прикрепить файл к сообщению')}
                  className='sr-only'
                  type='file'
                  onChange={(event) => {
                     const picked = [...(event.target.files ?? [])];
                     event.target.value = '';
                     if (picked.length)
                        setFiles((list) => [...list, ...picked]);
                  }}
               />
            </label>
            <textarea
               ref={field}
               aria-label={t('Сообщение в группу «{{name}}»', {
                  name: chatName,
               })}
               className='field-input text-meta min-h-9 flex-1 resize-none py-2 leading-5'
               placeholder={t('Сообщение… (Enter — отправить)')}
               rows={1}
               value={text}
               onChange={(event) => {
                  setText(event.target.value);
                  fit();
               }}
               onKeyDown={(event) => {
                  if (
                     event.key === 'Enter' &&
                     !event.shiftKey &&
                     !event.nativeEvent.isComposing
                  ) {
                     event.preventDefault();
                     void send();
                  }
               }}
            />
            <Button
               disabled={!text.trim() && !files.length}
               hint={
                  !text.trim() && !files.length
                     ? t('Напишите сообщение или прикрепите файл')
                     : t('Отправить сообщение в группу «{{name}}»', {
                          name: chatName,
                       })
               }
               loading={sending.pending}
               type='submit'
            >
               <Send aria-hidden />
               {t('Отправить')}
            </Button>
         </div>
      </form>
   );
};

export default Composer;

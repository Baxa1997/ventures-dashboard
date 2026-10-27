import { queueWording, relativeDue } from '@modules/Work/helpers';
import work from '@modules/Work/services';
import { MY_DAY_PATH, SECTION_PATHS } from '@shared/constants';
import { formatNumericDate, personName } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { Notice } from '@shared/types/work.types';
import clsx from 'clsx';
import type { TFunction } from 'i18next';
import {
   AlarmClock,
   Bell,
   Gavel,
   Inbox,
   type LucideIcon,
   Stamp,
   UserPlus,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

const ICONS: Record<Notice['kind'], LucideIcon> = {
   decision: Stamp,
   overdue: AlarmClock,
   assigned: UserPlus,
   application: Inbox,
   meeting: Gavel,
};

// What the person has seen, kept in this browser: their notices' ids.
const seenKey = (userId: string) => `sqbv_seen_notices_${userId}`;

const readSeen = (userId: string): string[] => {
   try {
      return JSON.parse(localStorage.getItem(seenKey(userId)) ?? '[]');
   } catch {
      return [];
   }
};

const writeSeen = (userId: string, ids: string[]) => {
   try {
      localStorage.setItem(seenKey(userId), JSON.stringify(ids));
   } catch {
      // storage unavailable: the badge comes back after a reload
   }
};

// A notice's line, the line under it, and where it leads.
const wordingOf = (
   t: TFunction<'layout'>,
   tWork: TFunction<'work'>,
   tDeals: TFunction<'deals'>,
   notice: Notice,
) => {
   const task = (id: string) => `${SECTION_PATHS.tasks}?task=${id}`;
   switch (notice.kind) {
      case 'decision':
         return {
            text: t('Ждёт вашего решения: {{title}}', {
               title: queueWording(tWork, tDeals, notice.item).title,
            }),
            meta: notice.item.subject,
            to: notice.item.dealId
               ? `${SECTION_PATHS.deals}/${notice.item.dealId}`
               : `${MY_DAY_PATH}?tab=approve`,
         };
      case 'overdue':
         return {
            text: t('Просрочена задача: {{title}}', { title: notice.title }),
            meta: t('срок {{date}}', {
               date: formatNumericDate(notice.dueDate),
            }),
            to: task(notice.taskId),
         };
      case 'assigned':
         return {
            text: t('Вам назначена задача: {{title}}', { title: notice.title }),
            meta: t('от {{name}}', { name: personName(notice.fromId) }),
            to: task(notice.taskId),
         };
      case 'application':
         return {
            text: t('Новая заявка: {{company}}', { company: notice.company }),
            meta: t('подана {{date}}', {
               date: formatNumericDate(notice.date),
            }),
            to: `${SECTION_PATHS.deals}/${notice.dealId}`,
         };
      case 'meeting':
         return {
            text: t('Заседание ИК № {{number}}', { number: notice.number }),
            meta: [
               formatNumericDate(notice.date),
               relativeDue(tWork, notice.date),
            ]
               .filter(Boolean)
               .join(' · '),
            to: `${SECTION_PATHS.committee}/${notice.meetingId}`,
         };
   }
};

/* The bell of the top bar: what needs the person's attention — decisions
   waiting for them, their overdue and newly given tasks, new applications
   and the committee's coming meeting. The badge counts what they have not
   seen; opening the list marks it all seen. */
const Notifications = () => {
   const { t } = useTranslation('layout');
   const { t: tWork } = useTranslation('work');
   const { t: tDeals } = useTranslation('deals');
   const user = useCurrentUser();
   const [notices, setNotices] = useState<Notice[]>([]);
   const [seen, setSeen] = useState<string[]>([]);
   // what was seen before the list was opened, for its unread dots
   const [seenBefore, setSeenBefore] = useState<string[]>([]);
   const [open, setOpen] = useState(false);
   const ref = useRef<HTMLDivElement>(null);

   useEffect(() => {
      setSeen(readSeen(user.id));
      let active = true;
      const load = () =>
         work.getNotices(user.id).then((loaded) => {
            if (active) setNotices(loaded);
         });
      load();
      const unsubscribe = work.subscribe(load);
      return () => {
         active = false;
         unsubscribe();
      };
   }, [user.id]);

   useEffect(() => {
      if (!open) return;
      const onPointerDown = (event: PointerEvent) => {
         if (!ref.current?.contains(event.target as Node)) setOpen(false);
      };
      const onKeyDown = (event: KeyboardEvent) => {
         if (event.key === 'Escape') setOpen(false);
      };
      document.addEventListener('pointerdown', onPointerDown);
      document.addEventListener('keydown', onKeyDown);
      return () => {
         document.removeEventListener('pointerdown', onPointerDown);
         document.removeEventListener('keydown', onKeyDown);
      };
   }, [open]);

   const unseen = notices.filter(({ id }) => !seen.includes(id)).length;

   const toggle = () => {
      if (!open) {
         const ids = notices.map(({ id }) => id);
         setSeenBefore(seen);
         setSeen(ids);
         writeSeen(user.id, ids);
      }
      setOpen((prev) => !prev);
   };

   return (
      <div ref={ref} className='relative shrink-0'>
         <button
            type='button'
            aria-expanded={open}
            aria-label={
               unseen
                  ? t('Уведомления: {{count}} новое', { count: unseen })
                  : t('Уведомления')
            }
            className='text-ink-soft hover:bg-hover hover:text-ink relative grid size-8 place-items-center rounded-lg'
            onClick={toggle}
         >
            <Bell aria-hidden className='size-4' />
            {unseen > 0 && (
               <span className='bg-danger absolute top-0.5 right-0.5 min-w-3.5 rounded-full px-1 text-[9px] leading-3.5 text-white tabular-nums'>
                  {unseen > 9 ? '9+' : unseen}
               </span>
            )}
         </button>
         {open && (
            <div className='border-line-strong shadow-popup animate-pop absolute top-full right-0 z-50 mt-1.5 max-h-[70vh] w-90 max-w-[calc(100vw-1.5rem)] origin-top-right overflow-auto rounded-xl border bg-white'>
               <div className='border-line flex items-center justify-between border-b px-3.5 py-3'>
                  <span className='font-semibold'>{t('Уведомления')}</span>
                  {notices.length > 0 && (
                     <span className='text-ink-faint text-xs'>
                        {t('{{count}} событие', { count: notices.length })}
                     </span>
                  )}
               </div>
               {notices.length ? (
                  notices.map((notice) => {
                     const Icon = ICONS[notice.kind];
                     const { text, meta, to } = wordingOf(
                        t,
                        tWork,
                        tDeals,
                        notice,
                     );
                     return (
                        <Link
                           key={notice.id}
                           className='border-line hover:bg-hover flex gap-2.5 border-b px-3.5 py-2.5'
                           to={to}
                           onClick={() => setOpen(false)}
                        >
                           <span
                              aria-hidden
                              className={clsx(
                                 'mt-1.5 size-1.75 shrink-0 rounded-full',
                                 !seenBefore.includes(notice.id) &&
                                    'bg-accent',
                              )}
                           />
                           <Icon
                              aria-hidden
                              className='text-ink-faint mt-0.5 size-4 shrink-0'
                           />
                           <span className='min-w-0'>
                              <span className='block'>{text}</span>
                              <span className='text-ink-faint block text-[11px]'>
                                 {meta}
                              </span>
                           </span>
                        </Link>
                     );
                  })
               ) : (
                  <p className='text-ink-faint px-3.5 py-5.5 text-center text-meta'>
                     {t('Новых уведомлений нет')}
                  </p>
               )}
               <div className='px-3.5 py-2.5 text-center'>
                  <Link
                     className='text-accent-strong text-xs hover:underline'
                     to={MY_DAY_PATH}
                     onClick={() => setOpen(false)}
                  >
                     {t('Всё, что ждёт вас, — в «Мой день»')}
                  </Link>
               </div>
            </div>
         )}
      </div>
   );
};

export default Notifications;

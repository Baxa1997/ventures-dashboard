import markWhite from '@assets/images/mark-white.png';
import { Avatar } from '@shared/components';
import { ROLE_LABELS } from '@shared/constants';
import { useCurrentUser } from '@shared/hooks';
import clsx from 'clsx';
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { NAV_GROUPS, type NavLabel, SETTINGS_ITEM } from './constants';
import useCounters from './useCounters';

interface SidebarProps {
   open: boolean;
   onClose: () => void;
}

// The open section has a lighter row and a sky-blue line on its left edge.
const itemClass = ({ isActive }: { isActive: boolean }) =>
   clsx(
      'flex h-8.5 shrink-0 items-center gap-2.5 rounded-lg px-2.5 font-medium transition-colors',
      isActive
         ? 'bg-white/16 text-white shadow-[inset_3px_0_0_var(--color-sky)]'
         : 'text-on-dark-soft hover:bg-white/9 hover:text-white',
   );

// Always visible from the lg breakpoint; below it, a drawer opened from the
// top bar.
const Sidebar = ({ open, onClose }: SidebarProps) => {
   const { t } = useTranslation('layout');
   const user = useCurrentUser();
   const counters = useCounters(user.id);
   const [query, setQuery] = useState('');
   const SettingsIcon = SETTINGS_ITEM.icon;

   // «Найти в меню» keeps the items whose name holds the text
   const shown = (label: NavLabel) =>
      t(label).toLowerCase().includes(query.trim().toLowerCase());
   const groups = NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => shown(item.label)),
   })).filter((group) => group.items.length);

   return (
      <>
         {open && (
            <button
               type='button'
               aria-label={t('Закрыть меню')}
               className='bg-navy-deep/45 animate-fade fixed inset-0 z-40 cursor-default lg:hidden'
               onClick={onClose}
            />
         )}
         <aside
            className={clsx(
               'print-hidden bg-navy fixed inset-y-0 left-0 z-50 flex w-60 flex-col text-white transition-[translate,visibility] duration-200 lg:visible lg:translate-x-0',
               open ? 'translate-x-0' : 'invisible -translate-x-full',
            )}
         >
            <div className='flex h-13.5 shrink-0 items-center justify-between gap-2 border-b border-white/16 px-3.5'>
               <span className='flex min-w-0 items-center gap-2.5 text-sm font-extrabold whitespace-nowrap'>
                  <img alt='' className='size-6 shrink-0' src={markWhite} />
                  SQB Ventures
               </span>
               <span className='text-on-dark-faint text-xs max-lg:hidden'>
                  {t('Портал')}
               </span>
               <button
                  type='button'
                  aria-label={t('Закрыть меню')}
                  className='text-on-dark-soft -mr-1.5 grid size-8 place-items-center rounded-lg hover:bg-white/9 hover:text-white lg:hidden'
                  onClick={onClose}
               >
                  <X aria-hidden className='size-4' />
               </button>
            </div>
            <label className='text-on-dark-faint m-3 flex h-8.5 shrink-0 items-center gap-2 rounded-lg border border-white/16 bg-white/8 px-2.5'>
               <Search aria-hidden className='size-4 shrink-0' />
               <input
                  aria-label={t('Найти в меню')}
                  className='placeholder:text-on-dark-faint min-w-0 flex-1 bg-transparent text-white outline-none'
                  placeholder={t('Найти в меню')}
                  type='text'
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
               />
            </label>
            <nav
               aria-label={t('Основная навигация')}
               className='scrollbar-none flex flex-1 flex-col overflow-y-auto px-2 pb-2.5'
            >
               {groups.map((group) => (
                  <div key={group.label} className='mb-2.5'>
                     <div className='text-on-dark-faint px-2.5 pt-2 pb-1.5 text-[10.5px] font-semibold tracking-[0.06em] uppercase'>
                        {t(group.label)}
                     </div>
                     <div className='flex flex-col gap-0.5'>
                        {group.items.map((item) => {
                           const { label, to, icon: Icon, counter } = item;
                           const count = counter ? counters[counter] : 0;
                           return (
                              <NavLink
                                 key={to}
                                 to={to}
                                 className={itemClass}
                                 onClick={onClose}
                              >
                                 <Icon aria-hidden className='size-4 shrink-0' />
                                 <span className='min-w-0 flex-1 truncate'>
                                    {t(label)}
                                 </span>
                                 {!!count && (
                                    <span className='shrink-0 rounded-full bg-white/16 px-1.75 text-[11px] leading-4.5 text-white tabular-nums'>
                                       {count}
                                    </span>
                                 )}
                              </NavLink>
                           );
                        })}
                     </div>
                  </div>
               ))}
               {shown(SETTINGS_ITEM.label) && (
                  <NavLink
                     to={SETTINGS_ITEM.to}
                     className={(state) =>
                        clsx(itemClass(state), 'mt-auto')
                     }
                     onClick={onClose}
                  >
                     <SettingsIcon aria-hidden className='size-4 shrink-0' />
                     <span className='truncate'>
                        {t(SETTINGS_ITEM.label)}
                     </span>
                  </NavLink>
               )}
            </nav>
            <div className='flex shrink-0 items-center gap-2.5 border-t border-white/16 px-3.5 py-3'>
               <Avatar name={user.fullName || user.name} size='md' onDark />
               <span className='min-w-0 leading-tight'>
                  <span className='text-meta block truncate font-semibold'>
                     {user.fullName || user.name}
                  </span>
                  <span className='text-on-dark-faint mt-0.5 block truncate text-[11px]'>
                     {t(ROLE_LABELS[user.role])}
                  </span>
               </span>
            </div>
         </aside>
      </>
   );
};

export default Sidebar;

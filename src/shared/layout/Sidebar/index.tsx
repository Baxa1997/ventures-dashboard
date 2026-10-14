import { useCurrentUser } from '@shared/hooks';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { NAV_GROUPS, SETTINGS_ITEM } from './constants';
import useCounters from './useCounters';
import UserMenu from './UserMenu';

interface SidebarProps {
   open: boolean;
   onClose: () => void;
}

const itemClass = ({ isActive }: { isActive: boolean }) =>
   clsx(
      'flex h-9 shrink-0 items-center gap-3 rounded-lg px-3 transition-colors',
      isActive
         ? 'bg-navy-raised font-semibold text-white'
         : 'text-on-dark-soft hover:bg-white/5 hover:text-white',
   );

// Always visible from the lg breakpoint; below it, a drawer opened from the
// top bar.
const Sidebar = ({ open, onClose }: SidebarProps) => {
   const { t } = useTranslation('layout');
   const user = useCurrentUser();
   const counters = useCounters(user.id);
   const SettingsIcon = SETTINGS_ITEM.icon;

   return (
      <>
         {open && (
            <button
               type='button'
               aria-label={t('Закрыть меню')}
               className='bg-navy/50 animate-fade fixed inset-0 z-40 cursor-default lg:hidden'
               onClick={onClose}
            />
         )}
         <aside
            className={clsx(
               'print-hidden bg-navy fixed inset-y-0 left-0 z-50 flex w-64 flex-col text-white transition-[translate,visibility] duration-200 lg:visible lg:translate-x-0',
               open ? 'translate-x-0' : 'invisible -translate-x-full',
            )}
         >
            <div className='flex shrink-0 items-start pt-5 pr-4 pb-1 pl-6'>
               <div className='min-w-0 flex-1'>
                  <div className='text-title leading-5 font-bold'>
                     SQB Ventures
                  </div>
                  <div className='text-on-dark-faint mt-1 truncate text-[11.5px] leading-4'>
                     {t('Операционная платформа фонда')}
                  </div>
               </div>
               <button
                  type='button'
                  aria-label={t('Закрыть меню')}
                  className='text-on-dark-soft -mt-1 -mr-3 grid size-8 place-items-center rounded-lg hover:bg-white/10 hover:text-white lg:hidden'
                  onClick={onClose}
               >
                  <X aria-hidden className='size-4' />
               </button>
            </div>
            <nav
               aria-label={t('Основная навигация')}
               className='flex-1 overflow-y-auto px-3 pb-3'
            >
               {NAV_GROUPS.map((group) => (
                  <div key={group.label}>
                     <div className='text-on-dark-faint px-3 pt-5 pb-2 text-xs leading-4'>
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
                                 <Icon
                                    aria-hidden
                                    className='size-4.5 shrink-0'
                                    strokeWidth={1.75}
                                 />
                                 <span className='min-w-0 flex-1 truncate'>
                                    {t(label)}
                                 </span>
                                 {!!count && (
                                    <span className='bg-navy-pill text-on-dark-soft -mr-0.5 -ml-1.5 grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1 text-[11px] font-medium tabular-nums'>
                                       {count}
                                    </span>
                                 )}
                              </NavLink>
                           );
                        })}
                     </div>
                  </div>
               ))}
            </nav>
            <div className='flex shrink-0 flex-col px-3'>
               <NavLink
                  to={SETTINGS_ITEM.to}
                  className={itemClass}
                  onClick={onClose}
               >
                  <SettingsIcon
                     aria-hidden
                     className='size-4.5 shrink-0'
                     strokeWidth={1.75}
                  />
                  <span className='truncate'>{t(SETTINGS_ITEM.label)}</span>
               </NavLink>
            </div>
            <div className='border-navy-line mx-3 mt-px shrink-0 border-t' />
            <UserMenu />
         </aside>
      </>
   );
};

export default Sidebar;

import { Avatar } from '@shared/components';
import { INTERFACE_LANGUAGES, ROLE_LABELS } from '@shared/constants';
import { signOut, useCurrentUser } from '@shared/hooks';
import { LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Language from '../Language';

const HEADING = 'text-ink-faint px-2.5 pt-1.5 pb-1 text-xs';

// The signed-in person, at the right of the top bar. The button opens a menu
// with the interface language and signing out.
const UserMenu = () => {
   const { t } = useTranslation('layout');
   const user = useCurrentUser();
   const [open, setOpen] = useState(false);
   const ref = useRef<HTMLDivElement>(null);
   const role = t(ROLE_LABELS[user.role]);
   const name = user.fullName || user.name;

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

   return (
      <div ref={ref} className='relative shrink-0'>
         <button
            type='button'
            aria-expanded={open}
            aria-label={name}
            className='hover:bg-hover flex items-center gap-2 rounded-lg px-2 py-1 text-left'
            data-hint={t('Открыть меню профиля и выхода')}
            onClick={() => setOpen((prev) => !prev)}
         >
            <Avatar name={name} size='md' />
            <span className='leading-tight max-lg:hidden'>
               <span className='block max-w-40 truncate text-xs font-semibold'>
                  {name}
               </span>
               <span className='text-ink-faint block max-w-40 truncate text-[10px]'>
                  {role}
               </span>
            </span>
         </button>
         {open && (
            <div className='border-line-strong shadow-popup animate-pop absolute top-full right-0 z-50 mt-1.5 w-65 origin-top-right overflow-hidden rounded-xl border bg-white'>
               <div className='flex items-center gap-3 p-3.5'>
                  <Avatar name={name} size='lg' />
                  <div className='min-w-0'>
                     <div className='truncate font-semibold'>{name}</div>
                     <span className='bg-accent/12 text-accent-strong mt-1 inline-block rounded-full px-2 py-px text-[10px]'>
                        {role}
                     </span>
                  </div>
               </div>
               {/* hidden while the interface has one language */}
               {INTERFACE_LANGUAGES.length > 1 && (
                  <div className='border-line border-t px-1.5 py-1.5'>
                     <div className={HEADING}>{t('Язык')}</div>
                     <div className='px-1 pb-0.5'>
                        <Language />
                     </div>
                  </div>
               )}
               <div className='border-line border-t p-1.5'>
                  <button
                     type='button'
                     className='text-danger hover:bg-hover flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left'
                     data-hint={t('Выйти из панели')}
                     onClick={signOut}
                  >
                     <LogOut aria-hidden className='size-4' />
                     {t('Выйти')}
                  </button>
               </div>
            </div>
         )}
      </div>
   );
};

export default UserMenu;

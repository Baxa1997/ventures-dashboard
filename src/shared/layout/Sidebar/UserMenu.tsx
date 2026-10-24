import { Avatar } from '@shared/components';
import { INTERFACE_LANGUAGES, ROLE_LABELS } from '@shared/constants';
import { signOut, useCurrentUser } from '@shared/hooks';
import clsx from 'clsx';
import { LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Language from '../Language';

const HEADING = 'text-on-dark-faint px-2.5 pt-1.5 pb-1 text-xs';

// The signed-in person. The block opens a menu with the interface language
// and signing out.
const UserMenu = () => {
   const { t } = useTranslation('layout');
   const user = useCurrentUser();
   const [open, setOpen] = useState(false);
   const ref = useRef<HTMLDivElement>(null);

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
      <div ref={ref} className='relative'>
         {open && (
            <div className='bg-navy-raised shadow-popup animate-pop absolute inset-x-3 bottom-full mb-1 origin-bottom rounded-lg p-1'>
               {/* hidden while the interface has one language */}
               {INTERFACE_LANGUAGES.length > 1 && (
                  <>
                     <div className={HEADING}>{t('Язык')}</div>
                     <div className='px-1 pb-1.5'>
                        <Language />
                     </div>
                  </>
               )}
               <div
                  className={clsx(
                     INTERFACE_LANGUAGES.length > 1 &&
                        'mt-1 border-t border-white/10 pt-1',
                  )}
               >
                  <button
                     type='button'
                     className='text-meta text-on-dark-soft flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left font-medium hover:bg-white/10 hover:text-white'
                     onClick={signOut}
                  >
                     <LogOut aria-hidden className='size-4' />
                     {t('Выйти')}
                  </button>
               </div>
            </div>
         )}
         <button
            type='button'
            aria-expanded={open}
            className='flex h-16 w-full items-center gap-2.5 px-6 text-left hover:bg-white/5'
            onClick={() => setOpen((prev) => !prev)}
         >
            <Avatar name={user.name} size='md' onDark />
            <span className='min-w-0 leading-tight'>
               <span className='text-meta block truncate font-semibold'>
                  {user.name}
               </span>
               <span className='text-on-dark-faint mt-0.5 block truncate text-xs'>
                  {t(ROLE_LABELS[user.role])}
               </span>
            </span>
         </button>
      </div>
   );
};

export default UserMenu;

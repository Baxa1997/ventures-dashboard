import { ucodeSignIn } from '@shared/api/ucode';
import { Avatar } from '@shared/components';
import { ROLE_LABELS, SIGN_IN_IDS, TEAM } from '@shared/constants';
import { setCurrentUser, signOut, useCurrentUser } from '@shared/hooks';
import clsx from 'clsx';
import { LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Language from '../Language';

const ACCOUNTS = TEAM.filter(({ id }) => SIGN_IN_IDS.includes(id));

const HEADING = 'text-on-dark-faint px-2.5 pt-1.5 pb-1 text-xs';

// The signed-in person. The block opens a menu with the interface language,
// signing out and, without staff sign-in, a short list of people to look at
// the pages as.
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
               <div className={HEADING}>{t('Язык')}</div>
               <div className='px-1 pb-1.5'>
                  <Language />
               </div>
               {!ucodeSignIn && (
                  <div className={clsx(HEADING, 'border-t border-white/10')}>
                     {t('Войти как')}
                  </div>
               )}
               {(ucodeSignIn ? [] : ACCOUNTS).map((account) => (
                  <button
                     key={account.id}
                     type='button'
                     aria-pressed={account.id === user.id}
                     className={clsx(
                        'flex w-full flex-col rounded-md px-2.5 py-1.5 text-left hover:bg-white/10',
                        account.id === user.id && 'bg-white/10',
                     )}
                     onClick={() => {
                        setCurrentUser(account.id);
                        setOpen(false);
                     }}
                  >
                     <span className='text-meta font-semibold'>
                        {account.name}
                     </span>
                     <span className='text-on-dark-soft text-xs'>
                        {t(ROLE_LABELS[account.role])}
                     </span>
                  </button>
               ))}
               <div className='mt-1 border-t border-white/10 pt-1'>
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

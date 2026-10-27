import { openNewTask } from '@modules/Work/hooks';
import { CirclePlus, Menu, Search as SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Notifications from './Notifications';
import Search, { KBD } from './Search';
import UserMenu from './UserMenu';

interface HeaderProps {
   onMenuClick: () => void;
   crumbsRef: (element: HTMLElement | null) => void; // PageHeader draws there
}

const ICON_BUTTON =
   'text-ink-soft hover:bg-hover hover:text-ink grid size-8 shrink-0 place-items-center rounded-lg';

// The top bar: the breadcrumbs of the open page, the search, a new task, the
// notifications and the signed-in person. Below the lg breakpoint the search
// is an icon, and the bar also opens the sidebar, which is a drawer there.
const Header = ({ onMenuClick, crumbsRef }: HeaderProps) => {
   const { t } = useTranslation('layout');
   const [searching, setSearching] = useState(false);

   return (
      <header className='print-hidden border-line sticky top-0 z-30 flex h-13.5 shrink-0 items-center gap-4 border-b bg-white px-3 lg:px-5'>
         <div className='flex min-w-0 flex-1 items-center gap-2.5'>
            <button
               type='button'
               aria-label={t('Меню')}
               className={`${ICON_BUTTON} lg:hidden`}
               onClick={onMenuClick}
            >
               <Menu aria-hidden className='size-4' />
            </button>
            <nav
               ref={crumbsRef}
               aria-label={t('Навигационная цепочка')}
               className='flex min-w-0 flex-1 items-center gap-1.5 whitespace-nowrap'
            />
         </div>
         <button
            type='button'
            className='bg-ground border-line text-ink-faint hover:border-line-strong hidden h-9 min-w-55 flex-[0_1_23.75rem] items-center gap-2 rounded-lg border px-2.5 text-left lg:flex'
            onClick={() => setSearching(true)}
         >
            <SearchIcon aria-hidden className='text-indigo size-4 shrink-0' />
            <span className='min-w-0 flex-1 truncate'>
               {t('Поиск по сделкам, задачам и разделам')}
            </span>
            <kbd className={KBD}>⌘</kbd>
            <kbd className={KBD}>K</kbd>
         </button>
         <div className='flex flex-1 items-center justify-end gap-1.5 lg:gap-2.5'>
            <button
               type='button'
               aria-label={t('Поиск')}
               className={`${ICON_BUTTON} lg:hidden`}
               onClick={() => setSearching(true)}
            >
               <SearchIcon aria-hidden className='size-4' />
            </button>
            <button
               type='button'
               aria-label={t('Новая задача')}
               className={ICON_BUTTON}
               title={t('Новая задача')}
               onClick={openNewTask}
            >
               <CirclePlus aria-hidden className='size-4' />
            </button>
            <Notifications />
            <UserMenu />
         </div>
         <Search open={searching} setOpen={setSearching} />
      </header>
   );
};

export default Header;

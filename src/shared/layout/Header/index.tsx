import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
   onMenuClick: () => void;
}

// Top bar for narrow screens, where the sidebar is a drawer. From the lg
// breakpoint the sidebar is always visible and each page shows its own header.
const Header = ({ onMenuClick }: HeaderProps) => {
   const { t } = useTranslation('layout');

   return (
      <header className='print-hidden bg-navy sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 px-3 text-white lg:hidden'>
         <button
            type='button'
            aria-label={t('Меню')}
            className='text-on-dark-soft grid size-9 place-items-center rounded-lg hover:bg-white/10 hover:text-white'
            onClick={onMenuClick}
         >
            <Menu aria-hidden className='size-5' />
         </button>
         <span className='text-title font-bold'>SQB Ventures</span>
      </header>
   );
};

export default Header;

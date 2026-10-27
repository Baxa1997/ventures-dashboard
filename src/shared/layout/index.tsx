import { NewTaskDialog } from '@modules/Work/components';
import { type PropsWithChildren, useState } from 'react';
import Header from './Header';
import { CrumbsContext } from './Header/crumbs';
import Sidebar from './Sidebar';

const Layout = ({ children }: PropsWithChildren) => {
   const [menuOpen, setMenuOpen] = useState(false);
   const [crumbs, setCrumbs] = useState<HTMLElement | null>(null);

   return (
      <CrumbsContext value={crumbs}>
         <div className='print-full min-h-dvh lg:pl-60'>
            <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
            <div className='flex min-h-dvh min-w-0 flex-col'>
               <Header
                  crumbsRef={setCrumbs}
                  onMenuClick={() => setMenuOpen(true)}
               />
               <main className='flex flex-1 flex-col'>{children}</main>
            </div>
         </div>
         <NewTaskDialog />
      </CrumbsContext>
   );
};

export default Layout;

import { type PropsWithChildren, useState } from 'react';
import Failure from './Failure';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = ({ children }: PropsWithChildren) => {
   const [menuOpen, setMenuOpen] = useState(false);

   return (
      <div className='print-full min-h-dvh lg:pl-64'>
         <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
         <div className='flex min-h-dvh min-w-0 flex-col'>
            <Header onMenuClick={() => setMenuOpen(true)} />
            <main className='flex flex-1 flex-col'>{children}</main>
         </div>
         <Failure />
      </div>
   );
};

export default Layout;

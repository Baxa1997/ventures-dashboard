import { Button, Loading } from '@shared/components';
import { LOGIN_PATH, OVERVIEW_PATH } from '@shared/constants';
import { retryTeam, signOut, useSession, useTeamStatus } from '@shared/hooks';
import Layout from '@shared/layout';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation, useRoutes } from 'react-router';
import Auth from './Auth';
import Committee from './Committee';
import Contracts from './Contracts';
import Deals from './Deals';
import Documents from './Documents';
import NotFound from './NotFound/NotFound';
import Portfolio from './Portfolio';
import Procurement from './Procurement';
import Settings from './Settings';
import Work from './Work';

// The pages inside the sidebar layout are for signed-in people. Anybody else
// goes to the sign-in page, which sends them back here afterwards. The pages
// wait for the fund's team, since their names and roles come from it.
const SignedIn = () => {
   const { t } = useTranslation('layout');
   const session = useSession();
   const team = useTeamStatus();
   const { pathname, search } = useLocation();

   if (!session)
      return (
         <Navigate
            replace
            state={{ from: pathname + search }}
            to={LOGIN_PATH}
         />
      );
   return (
      <Layout>
         {team === 'ready' ? (
            <Outlet />
         ) : team === 'failed' ? (
            <div className='grid flex-1 place-content-center gap-4 p-8 text-center'>
               <p role='alert'>
                  {t('Не удалось загрузить сотрудников фонда из ucode')}
               </p>
               <div className='flex justify-center gap-2'>
                  <Button
                     hint={t('Выйти из панели')}
                     variant='ghost'
                     onClick={signOut}
                  >
                     {t('Выйти')}
                  </Button>
                  <Button
                     hint={t('Загрузить сотрудников ещё раз')}
                     onClick={retryTeam}
                  >
                     {t('Повторить')}
                  </Button>
               </div>
            </div>
         ) : (
            <Loading />
         )}
      </Layout>
   );
};

// Финансы and Корреспонденция (phase 3) come back when their tables exist in
// ucode (docs/ERP.md §1).
const Modules = () => {
   const routes = useRoutes([
      { path: '/', element: <Navigate to={OVERVIEW_PATH} replace /> },
      ...Auth,
      {
         element: <SignedIn />,
         children: [
            { path: 'work', element: <Outlet />, children: Work },
            { path: 'deals', element: <Outlet />, children: Deals },
            { path: 'committee', element: <Outlet />, children: Committee },
            { path: 'portfolio', element: <Outlet />, children: Portfolio },
            { path: 'documents', element: <Outlet />, children: Documents },
            { path: 'contracts', element: <Outlet />, children: Contracts },
            { path: 'procurement', element: <Outlet />, children: Procurement },
            { path: 'settings', element: <Outlet />, children: Settings },
            { path: '*', element: <NotFound /> },
         ],
      },
   ]);
   return routes;
};

export default Modules;

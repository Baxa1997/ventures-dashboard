import { sectionOfPath, useRights } from '@modules/Settings/hooks/rights';
import { setReadOnly } from '@shared/api/ucode';
import { Button, Loading, Notice } from '@shared/components';
import { LOGIN_PATH, OVERVIEW_PATH } from '@shared/constants';
import { refreshStores } from '@shared/helpers';
import {
   retryTeam,
   signOut,
   useRefreshOnReturn,
   useSession,
   useTeamStatus,
} from '@shared/hooks';
import Layout from '@shared/layout';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, Outlet, useLocation, useRoutes } from 'react-router';
import Auth from './Auth';
import Chat from './Chat';
import Committee from './Committee';
import Contracts from './Contracts';
import Deals from './Deals';
import Documents from './Documents';
import Finance from './Finance';
import NotFound from './NotFound/NotFound';
import Portfolio from './Portfolio';
import Procurement from './Procurement';
import Settings from './Settings';
import Site from './Site';
import Work from './Work';

/* A section as Настройки → Роли open it to the person: «Нет» shows only why,
   «Чтение» shows it while the panel refuses every write from it (the tasks
   aside, which open over any page). */
const SectionGate = () => {
   const { t } = useTranslation('layout');
   // every section reads ucode again on return to the tab and every few minutes
   useRefreshOnReturn(refreshStores);
   const { pathname } = useLocation();
   const rights = useRights();
   const section = sectionOfPath(pathname);
   const right = section ? rights(section) : 'full';

   useEffect(() => {
      setReadOnly(right === 'read');
      return () => setReadOnly(false);
   }, [right]);

   if (right === 'none')
      return (
         <div className='grid flex-1 place-content-center gap-4 p-8 text-center'>
            <Notice>
               {t(
                  'Этот раздел вам закрыт. Права даёт директор в Настройках → Роли.',
               )}
            </Notice>
            <Link className='link' to={OVERVIEW_PATH}>
               {t('На дашборд')}
            </Link>
         </div>
      );
   return <Outlet />;
};

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
   if (team === 'closed')
      return (
         <div className='grid min-h-dvh place-content-center gap-4 p-8 text-center'>
            <p role='alert'>
               {t('Ваш доступ к панели закрыт. Обратитесь к директору фонда.')}
            </p>
            <div className='flex justify-center'>
               <Button hint={t('Выйти из панели')} onClick={signOut}>
                  {t('Выйти')}
               </Button>
            </div>
         </div>
      );
   return (
      <Layout>
         {team === 'ready' ? (
            <SectionGate />
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

// Финансы work from batch 27's tables (docs/ucode-migration.md); until they
// exist the pages say so.
const Modules = () => {
   const routes = useRoutes([
      { path: '/', element: <Navigate to={OVERVIEW_PATH} replace /> },
      ...Auth,
      {
         element: <SignedIn />,
         children: [
            { path: 'work', element: <Outlet />, children: Work },
            { path: 'chat', element: <Outlet />, children: Chat },
            { path: 'deals', element: <Outlet />, children: Deals },
            { path: 'committee', element: <Outlet />, children: Committee },
            { path: 'portfolio', element: <Outlet />, children: Portfolio },
            { path: 'documents', element: <Outlet />, children: Documents },
            { path: 'contracts', element: <Outlet />, children: Contracts },
            { path: 'procurement', element: <Outlet />, children: Procurement },
            { path: 'finance', element: <Outlet />, children: Finance },
            { path: 'site', element: <Outlet />, children: Site },
            { path: 'settings', element: <Outlet />, children: Settings },
            { path: '*', element: <NotFound /> },
         ],
      },
   ]);
   return routes;
};

export default Modules;

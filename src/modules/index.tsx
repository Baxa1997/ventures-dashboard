import { LOGIN_PATH, OVERVIEW_PATH } from '@shared/constants';
import { useSession } from '@shared/hooks';
import Layout from '@shared/layout';
import { Navigate, Outlet, useLocation, useRoutes } from 'react-router';
import Auth from './Auth';
import Committee from './Committee';
import Contracts from './Contracts';
import Correspondence from './Correspondence';
import Deals from './Deals';
import Documents from './Documents';
import Finance from './Finance';
import NotFound from './NotFound/NotFound';
import Portfolio from './Portfolio';
import Procurement from './Procurement';
import Settings from './Settings';
import Work from './Work';

// The pages inside the sidebar layout are for signed-in people. Anybody else
// goes to the sign-in page, which sends them back here afterwards.
const SignedIn = () => {
   const session = useSession();
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
         <Outlet />
      </Layout>
   );
};

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
            { path: 'finance', element: <Outlet />, children: Finance },
            { path: 'contracts', element: <Outlet />, children: Contracts },
            { path: 'procurement', element: <Outlet />, children: Procurement },
            {
               path: 'correspondence',
               element: <Outlet />,
               children: Correspondence,
            },
            { path: 'documents', element: <Outlet />, children: Documents },
            { path: 'settings', element: <Outlet />, children: Settings },
            { path: '*', element: <NotFound /> },
         ],
      },
   ]);
   return routes;
};

export default Modules;

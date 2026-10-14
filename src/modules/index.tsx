import { LOGIN_PATH, OVERVIEW_PATH } from '@shared/constants';
import { useSession } from '@shared/hooks';
import Layout from '@shared/layout';
import { Navigate, Outlet, useLocation, useRoutes } from 'react-router';
import Auth from './Auth';
import ComingSoon from './ComingSoon/ComingSoon';
import { UPCOMING_SECTIONS } from './ComingSoon/constants';
import Deals from './Deals';
import NotFound from './NotFound/NotFound';
import Work from './Work';

// The pages inside the sidebar layout are for signed-in people. Anybody else
// goes to the sign-in page, which sends them back here afterwards.
const SignedIn = () => {
   const session = useSession();
   const { pathname, search } = useLocation();

   if (!session)
      return (
         <Navigate replace state={{ from: pathname + search }} to={LOGIN_PATH} />
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
            ...UPCOMING_SECTIONS.map((section) => ({
               path: section.path,
               element: <ComingSoon section={section} />,
            })),
            { path: '*', element: <NotFound /> },
         ],
      },
   ]);
   return routes;
};

export default Modules;

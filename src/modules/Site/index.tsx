import { SITE_PATH } from '@shared/constants';
import { Navigate, type RouteObject } from 'react-router';
import { DEFAULT_SITE_SECTION } from './constants';
import SitePage from './pages';

const SiteModule: RouteObject[] = [
   {
      index: true,
      element: <Navigate replace to={`${SITE_PATH}/${DEFAULT_SITE_SECTION}`} />,
   },
   { path: ':section', element: <SitePage /> },
];

export default SiteModule;

import { SITE_PATH } from '@shared/constants';
import { Navigate, type RouteObject } from 'react-router';
import { DEFAULT_SITE_SECTION } from './constants';
import SitePage from './pages';
import NewsEditor from './pages/NewsEditor';

const SiteModule: RouteObject[] = [
   {
      index: true,
      element: <Navigate replace to={`${SITE_PATH}/${DEFAULT_SITE_SECTION}`} />,
   },
   { path: ':section', element: <SitePage /> },
   // a news on its own page: `new`, or its id
   { path: 'news/:id', element: <NewsEditor /> },
];

export default SiteModule;

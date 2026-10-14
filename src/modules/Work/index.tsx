import { Navigate, type RouteObject } from 'react-router';
import MyDay from './pages/MyDay';
import Overview from './pages/Overview';
import Tasks from './pages/Tasks';

const WorkModule: RouteObject[] = [
   { index: true, element: <Navigate to='overview' replace /> },
   { path: 'overview', element: <Overview /> },
   { path: 'my-day', element: <MyDay /> },
   { path: 'tasks', element: <Tasks /> },
];

export default WorkModule;

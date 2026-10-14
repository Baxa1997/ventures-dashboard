import type { RouteObject } from 'react-router';
import CommitteeList from './pages/List';
import MeetingPage from './pages/Meeting';

const CommitteeModule: RouteObject[] = [
   { index: true, element: <CommitteeList /> },
   { path: ':id', element: <MeetingPage /> },
];

export default CommitteeModule;

import type { RouteObject } from 'react-router';
import DealCard from './pages/Deal';
import DealsList from './pages/List';

const DealsModule: RouteObject[] = [
   { index: true, element: <DealsList /> },
   { path: ':id', element: <DealCard /> },
];

export default DealsModule;

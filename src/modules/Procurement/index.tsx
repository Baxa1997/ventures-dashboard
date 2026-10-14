import type { RouteObject } from 'react-router';
import ProcurementPage from './pages';

const ProcurementModule: RouteObject[] = [
   { index: true, element: <ProcurementPage /> },
];

export default ProcurementModule;

import type { RouteObject } from 'react-router';
import ContractsPage from './pages';

const ContractsModule: RouteObject[] = [
   { index: true, element: <ContractsPage /> },
];

export default ContractsModule;

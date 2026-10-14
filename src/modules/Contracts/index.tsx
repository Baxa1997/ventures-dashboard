import type { RouteObject } from 'react-router';
import ContractCard from './pages/Card';
import ContractsList from './pages/List';

const ContractsModule: RouteObject[] = [
   { index: true, element: <ContractsList /> },
   { path: ':id', element: <ContractCard /> },
];

export default ContractsModule;

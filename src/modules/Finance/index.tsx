import type { RouteObject } from 'react-router';
import FinancePage from './pages';

const FinanceModule: RouteObject[] = [
   { index: true, element: <FinancePage /> },
];

export default FinanceModule;

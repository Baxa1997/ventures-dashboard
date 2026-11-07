import { Navigate, type RouteObject } from 'react-router';
import CashFlow from './pages/CashFlow';
import Pnl from './pages/Pnl';
import Transactions from './pages/Transactions';

// Финансы: P&L, Cash Flow and the operations they are counted from.
const FinanceModule: RouteObject[] = [
   { index: true, element: <Navigate to='pnl' replace /> },
   { path: 'pnl', element: <Pnl /> },
   { path: 'cash-flow', element: <CashFlow /> },
   { path: 'transactions', element: <Transactions /> },
];

export default FinanceModule;

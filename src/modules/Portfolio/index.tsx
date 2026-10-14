import type { RouteObject } from 'react-router';
import CompanyCard from './pages/Company';
import PortfolioList from './pages/List';

const PortfolioModule: RouteObject[] = [
   { index: true, element: <PortfolioList /> },
   { path: ':id', element: <CompanyCard /> },
];

export default PortfolioModule;

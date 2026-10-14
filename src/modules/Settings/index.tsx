import type { RouteObject } from 'react-router';
import SettingsPage from './pages';

const SettingsModule: RouteObject[] = [
   { index: true, element: <SettingsPage /> },
];

export default SettingsModule;

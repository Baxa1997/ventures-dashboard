import { SETTINGS_PATH } from '@shared/constants';
import { Navigate, type RouteObject, useSearchParams } from 'react-router';
import { DEFAULT_SECTION, OLD_TABS } from './constants';
import SettingsPage from './pages';

// /settings opens the first section; an old ?tab= link opens its section.
const SettingsIndex = () => {
   const [params] = useSearchParams();
   const section = OLD_TABS[params.get('tab') ?? ''] ?? DEFAULT_SECTION;
   return <Navigate replace to={`${SETTINGS_PATH}/${section}`} />;
};

const SettingsModule: RouteObject[] = [
   { index: true, element: <SettingsIndex /> },
   { path: ':section', element: <SettingsPage /> },
];

export default SettingsModule;

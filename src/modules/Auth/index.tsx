import { LOGIN_PATH } from '@shared/constants';
import type { RouteObject } from 'react-router';
import Login from './pages/Login';

// Pages a person sees before signing in; they are shown without the sidebar.
const AuthModule: RouteObject[] = [{ path: LOGIN_PATH, element: <Login /> }];

export default AuthModule;

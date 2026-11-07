import type { RouteObject } from 'react-router';
import ChatPage from './pages';

const ChatModule: RouteObject[] = [{ index: true, element: <ChatPage /> }];

export default ChatModule;

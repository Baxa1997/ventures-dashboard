import type { RouteObject } from 'react-router';
import DocumentsPage from './pages';

const DocumentsModule: RouteObject[] = [
   { index: true, element: <DocumentsPage /> },
];

export default DocumentsModule;

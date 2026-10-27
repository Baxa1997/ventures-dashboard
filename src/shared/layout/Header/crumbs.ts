import { createContext } from 'react';

// Where the top bar draws its breadcrumbs. The layout passes the element down,
// and each page's PageHeader draws its section and title into it.
export const CrumbsContext = createContext<HTMLElement | null>(null);

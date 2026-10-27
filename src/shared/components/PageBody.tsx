import clsx from 'clsx';
import type { ReactNode } from 'react';

interface PageBodyProps {
   className?: string;
   children: ReactNode;
}

/* The area under a PageHeader, with the page padding beside and below it;
   blocks inside it are set `gap-section` apart.
   It takes the rest of the page height, so a page with little content can
   stretch its cards to the bottom instead of leaving the page half empty:
   give it `flex flex-col` (or make it a grid) and let the main card grow. */
const PageBody = ({ className, children }: PageBodyProps) => (
   <div className={clsx('lg:px-page flex-1 px-4 pb-12', className)}>
      {children}
   </div>
);

export default PageBody;

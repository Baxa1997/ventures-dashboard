import { OVERVIEW_PATH } from '@shared/constants';
import { CrumbsContext } from '@shared/layout/Header/crumbs';
import { ChevronRight } from 'lucide-react';
import { type ReactNode, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

const Chevron = () => (
   <ChevronRight aria-hidden className='text-ink-faint size-4 shrink-0' />
);

interface PageHeaderProps {
   section?: ReactNode; // where the page is, for the top bar's breadcrumbs
   title: string;
   label?: string; // the name in the breadcrumbs and the tab, if not the title
   badge?: ReactNode; // shown after the title, e.g. the stage of a deal
   meta?: ReactNode;
   actions?: ReactNode;
   children?: ReactNode; // tabs, on a line of their own
}

// The page's title on the page ground, its buttons on the right. The top
// bar's breadcrumbs show «Портал» (the dashboard), the section and the page.
const PageHeader = ({
   section,
   title,
   label = title,
   badge,
   meta,
   actions,
   children,
}: PageHeaderProps) => {
   const { t } = useTranslation('layout');
   const crumbs = useContext(CrumbsContext);

   useEffect(() => {
      document.title = `${label} — SQB Ventures`;
   }, [label]);

   return (
      <>
         {crumbs &&
            createPortal(
               <>
                  <Link
                     className='text-ink-soft hover:text-ink shrink-0'
                     to={OVERVIEW_PATH}
                  >
                     {t('Портал')}
                  </Link>
                  <Chevron />
                  {section && (
                     <>
                        <span className='text-ink-soft min-w-0 truncate'>
                           {section}
                        </span>
                        <Chevron />
                     </>
                  )}
                  <span
                     aria-current='page'
                     className='min-w-0 truncate font-semibold'
                  >
                     {label}
                  </span>
               </>,
               crumbs,
            )}
         <header className='lg:px-page px-4 pt-5'>
            <div className='flex flex-wrap items-end justify-between gap-x-4 gap-y-3'>
               <div className='min-w-0 flex-[1_1_20rem]'>
                  <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                     <h1 className='text-display font-bold'>{title}</h1>
                     {badge}
                  </div>
                  {meta && (
                     <p className='text-ink-soft mt-0.5 max-w-[72ch]'>{meta}</p>
                  )}
               </div>
               {actions && (
                  <div className='print-hidden flex max-w-full flex-wrap gap-2 lg:shrink-0'>
                     {actions}
                  </div>
               )}
            </div>
            {children ? (
               <div className='border-line mt-4 mb-4.5 border-b'>
                  {children}
               </div>
            ) : (
               <div className='h-4' />
            )}
         </header>
      </>
   );
};

export default PageHeader;

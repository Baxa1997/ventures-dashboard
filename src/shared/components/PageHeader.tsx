import { type ReactNode, useEffect } from 'react';

interface PageHeaderProps {
   section: ReactNode; // where the page is: a section name or breadcrumbs
   title: string;
   badge?: ReactNode; // shown after the title, e.g. the stage of a deal
   meta?: ReactNode;
   actions?: ReactNode;
   children?: ReactNode; // tabs, flush with the bottom edge
}

const PageHeader = ({
   section,
   title,
   badge,
   meta,
   actions,
   children,
}: PageHeaderProps) => {
   useEffect(() => {
      document.title = `${title} — SQB Ventures`;
   }, [title]);

   return (
      <header className='border-line px-page border-b bg-white pt-5'>
         <div className='flex flex-wrap items-center justify-between gap-x-6 gap-y-3'>
            <div className='min-w-0'>
               <p className='text-ink-soft text-xs leading-4'>{section}</p>
               <div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1'>
                  <h1 className='text-display font-bold'>{title}</h1>
                  {badge}
               </div>
               {meta && <p className='text-ink-soft text-meta mt-1'>{meta}</p>}
            </div>
            {actions && (
               <div className='print-hidden flex shrink-0 flex-wrap gap-2.5'>
                  {actions}
               </div>
            )}
         </div>
         {children ? (
            <div className='mt-6'>{children}</div>
         ) : (
            <div className='h-5' />
         )}
      </header>
   );
};

export default PageHeader;

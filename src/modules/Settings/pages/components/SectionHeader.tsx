import type { ReactNode } from 'react';

interface SectionHeaderProps {
   title: string;
   meta: string; // what the section is for
   actions?: ReactNode;
}

// A section's title and what it is for, its buttons on the right: the page
// has no heading of its own, so this is it.
const SectionHeader = ({ title, meta, actions }: SectionHeaderProps) => (
   <header className='mb-4 flex shrink-0 flex-wrap items-end justify-between gap-x-4 gap-y-3'>
      <div className='min-w-0 flex-[1_1_20rem]'>
         <h1 className='text-base leading-6 font-bold'>{title}</h1>
         <p className='text-ink-soft text-meta mt-0.5 max-w-[72ch]'>{meta}</p>
      </div>
      {actions && <div className='flex flex-wrap gap-2'>{actions}</div>}
   </header>
);

export default SectionHeader;

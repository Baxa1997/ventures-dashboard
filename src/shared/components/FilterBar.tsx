import type { ReactNode } from 'react';

interface FilterBarProps {
   children: ReactNode;
}

// The panel that holds the search and the filters above a list. Every page
// with filters puts them here, so they read as one block on the page ground.
const FilterBar = ({ children }: FilterBarProps) => (
   <div className='border-line animate-rise flex flex-wrap items-center gap-2.5 rounded-lg border bg-white p-3'>
      {children}
   </div>
);

export default FilterBar;

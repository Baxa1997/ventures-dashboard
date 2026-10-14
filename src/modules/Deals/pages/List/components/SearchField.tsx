import { Search } from 'lucide-react';

interface SearchFieldProps {
   label: string;
   value: string;
   onChange: (value: string) => void;
}

const SearchField = ({ label, value, onChange }: SearchFieldProps) => (
   <div className='relative w-full sm:w-64'>
      <Search
         aria-hidden
         className='text-ink-soft pointer-events-none absolute top-2.5 left-3 size-4'
      />
      <input
         aria-label={label}
         className='field-input text-meta h-9 pl-9'
         placeholder={label}
         type='search'
         value={value}
         onChange={(event) => onChange(event.target.value)}
      />
   </div>
);

export default SearchField;

import { getInitials } from './Avatar';

interface CompanyMarkProps {
   name: string;
}

// A company's initials on a rounded square, where a list shows its logo.
const CompanyMark = ({ name }: CompanyMarkProps) => (
   <span
      aria-hidden
      className='bg-accent-tint text-accent-strong grid size-8 shrink-0 place-items-center rounded-[7px] text-xs font-extrabold'
   >
      {getInitials(name)}
   </span>
);

export default CompanyMark;

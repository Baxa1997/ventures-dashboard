import clsx from 'clsx';
import { getInitials } from './Avatar';

interface CompanyMarkProps {
   name: string;
   logo?: string; // its logo's link; the initials without one
   large?: boolean; // 48px, at the head of a card
}

// A company's logo on a rounded square, or its initials while it has none.
const CompanyMark = ({ name, logo, large = false }: CompanyMarkProps) => (
   <span
      aria-hidden
      className={clsx(
         'grid shrink-0 place-items-center overflow-hidden font-extrabold',
         logo
            ? 'border-line border bg-white'
            : 'bg-accent-tint text-accent-strong',
         large
            ? 'size-12 rounded-[10px] text-[15px]'
            : 'size-8 rounded-[7px] text-xs',
      )}
   >
      {logo ? (
         <img alt='' className='size-full object-contain' src={logo} />
      ) : (
         getInitials(name)
      )}
   </span>
);

export default CompanyMark;

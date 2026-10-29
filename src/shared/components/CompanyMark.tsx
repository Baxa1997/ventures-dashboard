import clsx from 'clsx';
import { getInitials } from './Avatar';

interface CompanyMarkProps {
   name: string;
   large?: boolean; // 48px, at the head of a card
}

// A company's initials on a rounded square, where a list shows its logo.
const CompanyMark = ({ name, large = false }: CompanyMarkProps) => (
   <span
      aria-hidden
      className={clsx(
         'bg-accent-tint text-accent-strong grid shrink-0 place-items-center font-extrabold',
         large
            ? 'size-12 rounded-[10px] text-[15px]'
            : 'size-8 rounded-[7px] text-xs',
      )}
   >
      {getInitials(name)}
   </span>
);

export default CompanyMark;

import clsx from 'clsx';

interface AvatarProps {
   name: string;
   size?: 'sm' | 'md' | 'lg';
   onDark?: boolean;
}

// "Дилшод Мирзаев" → "ДМ"; a single word gives its first two letters
export const getInitials = (name: string) => {
   const words = name.trim().split(/\s+/);
   return (words.length > 1 ? words.map((word) => word[0]).join('') : words[0])
      .slice(0, 2)
      .toUpperCase();
};

const SIZES = {
   sm: 'size-5.5 text-[9px]', // in a row of a list or a table
   md: 'size-7.5 text-[11px]', // the signed-in person
   lg: 'size-10.5 text-sm', // the head of a menu or a card
};

const Avatar = ({ name, size = 'sm', onDark = false }: AvatarProps) => (
   <span
      aria-hidden
      className={clsx(
         'grid shrink-0 place-items-center rounded-full font-semibold text-white',
         SIZES[size],
         onDark ? 'bg-sky' : 'bg-accent',
      )}
   >
      {getInitials(name)}
   </span>
);

export default Avatar;

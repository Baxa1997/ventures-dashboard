import clsx from 'clsx';

interface AvatarProps {
   name: string;
   size?: 'sm' | 'md';
   onDark?: boolean;
}

const getInitials = (name: string) =>
   name
      .split(/\s+/)
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

const Avatar = ({ name, size = 'sm', onDark = false }: AvatarProps) => (
   <span
      aria-hidden
      className={clsx(
         'grid shrink-0 place-items-center rounded-full font-semibold',
         size === 'sm' ? 'size-6 text-[10px]' : 'size-8 text-xs',
         onDark
            ? 'bg-navy-raised text-accent-soft'
            : 'bg-accent-tint text-accent',
      )}
   >
      {getInitials(name)}
   </span>
);

export default Avatar;

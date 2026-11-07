import { getInitials } from '@shared/components/Avatar';
import clsx from 'clsx';
import { Handshake } from 'lucide-react';
import { CHANNELS, type ChatChannel, colorOf } from '../helpers';

interface ChatAvatarProps {
   name: string;
   channel: ChatChannel;
   large?: boolean; // the head of the open chat
}

// A group's mark, as the prototype draws it: a handshake on the name's own
// colour, and the letter of where it comes from in the corner.
const ChatAvatar = ({ name, channel, large = false }: ChatAvatarProps) => {
   const mark = CHANNELS[channel];
   return (
      <span
         aria-hidden
         className={clsx(
            'relative grid shrink-0 place-items-center rounded-full text-white',
            large ? 'size-12.5' : 'size-11',
         )}
         style={{ background: colorOf(name) }}
      >
         <Handshake className={large ? 'size-5.5' : 'size-5'} />
         <b
            className='absolute -right-0.5 -bottom-0.5 grid size-4.5 place-items-center rounded-full border-2 border-white text-[9px] leading-none'
            style={{ background: mark.color }}
         >
            {mark.letter}
         </b>
      </span>
   );
};

// A person's small round mark with their initials, in a row of members.
export const MemberMark = ({
   name,
   className,
}: {
   name: string;
   className?: string;
}) => (
   <span
      aria-hidden
      className={clsx(
         'grid size-7 shrink-0 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white',
         className,
      )}
      style={{ background: colorOf(name) }}
   >
      {getInitials(name)}
   </span>
);

export default ChatAvatar;

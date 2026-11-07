import {
   formatName,
   meetingTitle,
   meetingType,
   statusBadge,
} from '@modules/Committee/helpers';
import { Badge, HEAD_BUTTON } from '@shared/components';
import clsx from 'clsx';
import type { Meeting } from '@shared/types/committee.types';
import dayjs from 'dayjs';
import { Gavel, type LucideIcon, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface MeetingHeaderProps {
   meeting: Meeting;
   editable: boolean; // the secretary or the director looks
   removable: boolean; // the same: in any state, its decisions go with it
   actions: ReactNode; // what the meeting's state allows: open it, a break…
   onEdit: () => void;
   onDelete: () => void;
}


/* The meeting's head, as the design draws it: the committee's mark, the
   meeting's name and status, when and how it is held; the meeting, in any
   state, is changed or deleted by its icon buttons, and the buttons of its
   state follow them. */
const MeetingHeader = ({
   meeting,
   editable,
   actions,
   onEdit,
   removable,
   onDelete,
}: MeetingHeaderProps) => {
   const { t } = useTranslation('committee');
   const badge = statusBadge(t, meeting);

   // a head button: its name on it, what it does on hover
   const icon = (
      name: string,
      hint: string,
      Icon: LucideIcon,
      onClick: () => void,
      danger = false,
   ) => (
      <button
         type='button'
         className={clsx(HEAD_BUTTON, danger && 'hover:text-danger')}
         data-hint={hint}
         onClick={onClick}
      >
         <Icon aria-hidden className='text-ink-soft size-4' />
         {name}
      </button>
   );

   return (
      <header className='print-hidden mb-4 flex flex-wrap items-center gap-x-4 gap-y-3'>
         <span className='bg-accent-tint text-accent-strong grid size-12 shrink-0 place-items-center rounded-[10px]'>
            <Gavel aria-hidden className='size-5.5' />
         </span>
         <div className='min-w-0 flex-[1_1_18rem]'>
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
               <h1 className='text-xl leading-7 font-bold'>
                  {meetingTitle(t, meeting)}
               </h1>
               <Badge tone={badge.tone}>{badge.label}</Badge>
            </div>
            <p className='text-ink-soft text-meta mt-0.5'>
               {[
                  dayjs(meeting.date).format('D MMMM YYYY'),
                  meeting.time,
                  formatName(t, meeting.format),
                  meetingType(t, meeting),
               ]
                  .filter(Boolean)
                  .join(' · ')}
            </p>
         </div>
         <div className='flex max-w-full flex-wrap items-center gap-2'>
            {editable &&
               icon(t('Изменить'), t('Изменить заседание'), Pencil, onEdit)}
            {removable &&
               icon(
                  t('Удалить'),
                  t('Удалить заседание'),
                  Trash2,
                  onDelete,
                  true,
               )}
            {actions}
         </div>
      </header>
   );
};

export default MeetingHeader;

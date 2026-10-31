import {
   formatName,
   meetingTitle,
   meetingType,
   statusBadge,
} from '@modules/Committee/helpers';
import { Badge } from '@shared/components';
import type { Meeting } from '@shared/types/committee.types';
import dayjs from 'dayjs';
import { Gavel, type LucideIcon, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface MeetingHeaderProps {
   meeting: Meeting;
   editable: boolean; // planned, and the secretary or the director looks
   removable: boolean; // no decision came from it
   actions: ReactNode; // what the meeting's state allows: open it, a break…
   onEdit: () => void;
   onDelete: () => void;
}

const ICON_BUTTON =
   'border-line text-ink-soft hover:bg-hover hover:text-ink grid size-9 shrink-0 place-items-center rounded-lg border bg-white transition-colors';

/* The meeting's head, as the design draws it: the committee's mark, the
   meeting's name and status, when and how it is held; a planned meeting is
   changed or deleted by its icon buttons, and the buttons of its state
   follow them. */
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

   const icon = (label: string, Icon: LucideIcon, onClick: () => void) => (
      <button
         type='button'
         aria-label={label}
         className={ICON_BUTTON}
         data-hint={label}
         onClick={onClick}
      >
         <Icon aria-hidden className='size-4' />
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
            {editable && icon(t('Изменить заседание'), Pencil, onEdit)}
            {removable && icon(t('Удалить заседание'), Trash2, onDelete)}
            {actions}
         </div>
      </header>
   );
};

export default MeetingHeader;

import { VOTES } from '@modules/Committee/constants';
import type { VoteChoice } from '@shared/types/committee.types';
import clsx from 'clsx';
import { UserX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VoteButtonsProps {
   label: string; // whose vote on what, for screen readers
   value: VoteChoice | null;
   onChange: (value: VoteChoice | null) => void;
   busy?: boolean; // the vote is being saved
}

// The buttons of a vote, as the design draws them: the short word on the
// button, the full one on hover; a pressed one fills with its colour.
const CHOICES = [
   { choice: 'for', short: 'За', on: 'bg-success text-white' },
   { choice: 'against', short: 'Против', on: 'bg-danger text-white' },
   { choice: 'dissent', short: 'Особое', on: 'bg-danger-ink text-white' },
   { choice: 'absent', short: null, on: 'bg-neutral text-white' },
] as const satisfies {
   choice: VoteChoice;
   short: string | null; // none: an icon
   on: string;
}[];

/* A member's vote on a question, recorded by the secretary: За, Против,
   Особое мнение (a veto) or absent. Pressing the vote already given takes
   it back. */
const VoteButtons = ({ label, value, onChange, busy }: VoteButtonsProps) => {
   const { t } = useTranslation('committee');

   return (
      <div
         role='group'
         aria-busy={busy || undefined}
         aria-label={label}
         className={clsx(
            'border-line inline-flex overflow-hidden rounded-lg border bg-white transition-opacity',
            busy && 'pointer-events-none opacity-50',
         )}
      >
         {CHOICES.map(({ choice, short, on }) => {
            const pressed = value === choice;
            return (
               <button
                  key={choice}
                  type='button'
                  aria-pressed={pressed}
                  className={clsx(
                     'border-line flex h-7 items-center border-r px-2 text-xs font-semibold last:border-r-0',
                     pressed ? on : 'text-ink-soft hover:bg-hover',
                  )}
                  title={t(VOTES[choice].label)}
                  onClick={() => onChange(pressed ? null : choice)}
               >
                  {short ? (
                     t(short)
                  ) : (
                     <UserX
                        aria-label={t(VOTES[choice].label)}
                        className='size-3.5'
                     />
                  )}
               </button>
            );
         })}
      </div>
   );
};

export default VoteButtons;

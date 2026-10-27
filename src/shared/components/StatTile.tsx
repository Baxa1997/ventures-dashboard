import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import Card from './Card';

export type StatTone = 'ink' | 'warning' | 'success' | 'danger';
export type StatColor = 'sky' | 'success' | 'indigo' | 'warning' | 'info';

interface StatTileProps {
   label: string;
   value: string;
   note?: ReactNode;
   tone?: StatTone; // the figure's colour
   icon?: LucideIcon;
   color?: StatColor; // the icon's tile
}

const TONES: Record<StatTone, string> = {
   ink: 'text-ink',
   warning: 'text-warning-ink',
   success: 'text-success-ink',
   danger: 'text-danger',
};

const COLORS: Record<StatColor, string> = {
   sky: 'bg-sky/16 text-sky',
   success: 'bg-success/16 text-success',
   indigo: 'bg-indigo/16 text-indigo',
   warning: 'bg-warning/16 text-warning',
   info: 'bg-info/16 text-info',
};

// One headline figure with what it is and where it comes from.
const StatTile = ({
   label,
   value,
   note,
   tone = 'ink',
   icon: Icon,
   color = 'sky',
}: StatTileProps) => (
   <Card className='flex min-w-0 gap-3 p-4'>
      {Icon && (
         <span
            aria-hidden
            className={clsx(
               'grid size-9.5 shrink-0 place-items-center rounded-[10px]',
               COLORS[color],
            )}
         >
            <Icon className='size-4' />
         </span>
      )}
      <div className='min-w-0'>
         <p className='text-ink-soft text-xs'>{label}</p>
         <p
            className={clsx(
               'mt-0.5 text-2xl leading-tight font-extrabold',
               TONES[tone],
            )}
         >
            {value}
         </p>
         {note && <p className='text-ink-faint mt-0.5 text-[11px]'>{note}</p>}
      </div>
   </Card>
);

export default StatTile;

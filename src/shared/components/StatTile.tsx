import clsx from 'clsx';
import type { ReactNode } from 'react';
import Card from './Card';

export type StatTone = 'ink' | 'warning' | 'success' | 'danger';

interface StatTileProps {
   label: string;
   value: string;
   note?: ReactNode;
   tone?: StatTone;
}

const TONES: Record<StatTone, string> = {
   ink: 'text-ink',
   warning: 'text-warning-ink',
   success: 'text-success-ink',
   danger: 'text-danger',
};

// One headline figure with what it is and where it comes from.
const StatTile = ({ label, value, note, tone = 'ink' }: StatTileProps) => (
   <Card className='px-5 py-4'>
      <p className='text-ink-soft text-meta'>{label}</p>
      <p className={clsx('text-display mt-1.5 font-bold', TONES[tone])}>
         {value}
      </p>
      {note && <p className='text-ink-soft mt-1.5 text-xs'>{note}</p>}
   </Card>
);

export default StatTile;

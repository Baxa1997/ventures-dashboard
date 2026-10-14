import { useTranslation } from 'react-i18next';

export interface BarListItem {
   id: string;
   label: string;
   value: number;
   overdue: number; // the part of the value that is late
}

interface BarListProps {
   items: BarListItem[];
}

// Horizontal bars for comparing a few counts. The late part of a bar is drawn
// in red at its end and is also written out, so it does not rest on colour alone.
const BarList = ({ items }: BarListProps) => {
   const { t } = useTranslation('work');
   const max = Math.max(1, ...items.map((item) => item.value));
   const share = (value: number) => `${(value / max) * 100}%`;

   return (
      <ul className='px-5 pt-2'>
         {items.map((item) => (
            <li
               key={item.id}
               className='grid h-7.25 grid-cols-[minmax(0,10.125rem)_minmax(3rem,1fr)_2.25rem_6rem] items-center'
            >
               <span className='text-ink-soft truncate' title={item.label}>
                  {item.label}
               </span>
               <span
                  aria-hidden
                  className='bg-track flex h-2 overflow-hidden rounded-full'
               >
                  <span
                     className='bg-accent'
                     style={{ width: share(item.value - item.overdue) }}
                  />
                  <span
                     className='bg-danger'
                     style={{ width: share(item.overdue) }}
                  />
               </span>
               <span className='text-right font-semibold tabular-nums'>
                  {item.value}
               </span>
               <span className='text-danger pl-3 text-xs whitespace-nowrap'>
                  {item.overdue > 0 &&
                     t('{{count}} просрочена', { count: item.overdue })}
               </span>
            </li>
         ))}
      </ul>
   );
};

export default BarList;

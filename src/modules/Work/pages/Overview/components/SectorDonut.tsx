import { listName } from '@modules/Settings/services';
import { useTranslation } from 'react-i18next';
import { OTHER_SECTORS_COLOR, SECTOR_COLORS } from '../constants';
import { formatMoneyShort } from '../helpers';

interface SectorDonutProps {
   sectors: { key: string; invested: number }[]; // largest first
}

const SIZE = 200;
const OUTER = 100;
const INNER = 62; // the hole, as a share of the radius

// A point on a circle round the centre; the angle starts at the top.
const point = (radius: number, angle: number) => [
   SIZE / 2 + radius * Math.sin(angle),
   SIZE / 2 - radius * Math.cos(angle),
];

// A ring's piece between two angles.
const piece = (from: number, to: number) => {
   const large = to - from > Math.PI ? 1 : 0;
   const [ax, ay] = point(OUTER, from);
   const [bx, by] = point(OUTER, to);
   const [cx, cy] = point(INNER, to);
   const [dx, dy] = point(INNER, from);
   return `M ${ax} ${ay} A ${OUTER} ${OUTER} 0 ${large} 1 ${bx} ${by} L ${cx} ${cy} A ${INNER} ${INNER} 0 ${large} 0 ${dx} ${dy} Z`;
};

const sumOf = (items: { invested: number }[]) =>
   items.reduce((sum, { invested }) => sum + invested, 0);

/* The money invested by sector as a ring with its legend, as the design
   draws it. Each piece's sum and share is in its title; past five sectors
   the rest are one piece, «Другие». */
const SectorDonut = ({ sectors }: SectorDonutProps) => {
   const { t } = useTranslation('work');
   const total = sumOf(sectors);
   // a sum with its share of the whole: $1.5M (61%)
   const amount = (invested: number) =>
      `${formatMoneyShort(invested)} (${Math.round((invested / total) * 100)}%)`;
   const named = sectors.slice(0, SECTOR_COLORS.length);
   const rest = sectors.slice(SECTOR_COLORS.length);
   const pieces = [
      ...named.map(({ key, invested }, index) => ({
         id: key || 'none',
         label: key ? listName('industries', key) : t('Без отрасли'),
         invested,
         color: SECTOR_COLORS[index],
      })),
      ...(rest.length
         ? [
              {
                 id: 'other',
                 label: t('Другие'),
                 invested: sumOf(rest),
                 color: OTHER_SECTORS_COLOR,
              },
           ]
         : []),
   ];

   // a single sector is a whole ring, drawn as two halves
   let angle = 0;
   const arcs = pieces.flatMap((item) => {
      const from = angle;
      angle += (item.invested / total) * 2 * Math.PI;
      const paths =
         angle - from >= 2 * Math.PI - 1e-6
            ? [piece(from, from + Math.PI), piece(from + Math.PI, angle)]
            : [piece(from, angle)];
      return paths.map((d, index) => ({
         key: `${item.id}-${index}`,
         d,
         item,
         title: `${item.label}: ${amount(item.invested)}`,
      }));
   });

   return (
      <div className='flex h-65 flex-wrap items-center justify-center gap-x-8 gap-y-3 p-3.5'>
         <svg
            aria-hidden
            className='h-full max-h-58 min-h-40 w-auto'
            viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`}
         >
            {arcs.map(({ key, d, item, title }) => (
               <path
                  key={key}
                  d={d}
                  fill={item.color}
                  stroke='#fff'
                  strokeWidth={2}
               >
                  <title>{title}</title>
               </path>
            ))}
         </svg>
         <ul className='text-ink-soft grid gap-2 text-xs'>
            {pieces.map((item) => (
               <li
                  key={item.id}
                  className='flex items-center gap-2'
                  title={amount(item.invested)}
               >
                  <span
                     aria-hidden
                     className='h-3 w-10 shrink-0'
                     style={{ background: item.color }}
                  />
                  {item.label}
                  <span className='sr-only'>
                     {formatMoneyShort(item.invested)}
                  </span>
               </li>
            ))}
         </ul>
      </div>
   );
};

export default SectorDonut;

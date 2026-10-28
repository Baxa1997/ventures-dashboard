// The place a card carried across a board would drop into: the height of the
// card, opening from nothing.
const BoardGap = ({ height }: { height: number }) => (
   <li
      aria-hidden
      className='animate-open border-accent/45 bg-accent-tint rounded-lg border-2 border-dashed'
      style={{ height }}
   />
);

export default BoardGap;

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

interface ColorInputProps {
   value: string; // #rrggbb
   label: string; // for screen readers and the tooltip
   onChange: (color: string) => void; // once the picker closes
   disabled?: boolean;
   className?: string;
}

/* The browser's colour picker, as the prototype has it: a swatch in a frame
   that opens the palette, the eyedropper and the RGB fields. The colour
   shows as it is picked and is given once the picker closes, so a drag
   across the palette is one change, not hundreds. */
const ColorInput = ({
   value,
   label,
   onChange,
   disabled = false,
   className,
}: ColorInputProps) => {
   const input = useRef<HTMLInputElement>(null);
   // the colour being picked, until the picker closes
   const [picking, setPicking] = useState<string | null>(null);
   const latest = useRef({ value, onChange });
   latest.current = { value, onChange };

   // the input's own «change» comes when the picker closes; React's onChange
   // comes with every move
   useEffect(() => {
      const field = input.current;
      if (!field) return;
      const done = () => {
         setPicking(null);
         if (field.value.toLowerCase() !== latest.current.value.toLowerCase())
            latest.current.onChange(field.value);
      };
      field.addEventListener('change', done);
      return () => field.removeEventListener('change', done);
   }, []);

   return (
      <input
         ref={input}
         aria-label={label}
         className={clsx('color-input', className)}
         disabled={disabled}
         title={label}
         type='color'
         value={picking ?? value}
         onChange={(event) => setPicking(event.target.value)}
      />
   );
};

export default ColorInput;

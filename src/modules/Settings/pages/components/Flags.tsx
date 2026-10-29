import { FLAG_FIELDS } from '@modules/Settings/constants';
import { Card } from '@shared/components';
import { useTranslation } from 'react-i18next';
import type { Draft } from '..';

interface FlagsProps {
   draft: Draft;
   editable: boolean;
   onChange: (draft: Draft) => void;
}

// The portfolio's risk flags: the thresholds Портфель raises a flag at.
const Flags = ({ draft, editable, onChange }: FlagsProps) => {
   const { t } = useTranslation('settings');

   return (
      <Card className='flex flex-col'>
         <div className='flex max-w-xl flex-col gap-2.5 px-4.5 py-3.5'>
            {FLAG_FIELDS.map(({ key, label, unit }) => (
               <label
                  key={key}
                  className='flex items-center justify-between gap-4'
               >
                  <span className='text-ink-soft'>{t(label)}</span>
                  <span className='border-line-strong has-focus-visible:outline-accent flex h-8 w-40 items-center gap-1.5 rounded-lg border bg-white px-2.5 has-focus-visible:outline-2'>
                     <input
                        className='text-meta disabled:text-ink-soft w-10 min-w-0 flex-1 bg-transparent outline-none'
                        disabled={!editable}
                        inputMode='numeric'
                        value={draft.flags[key]}
                        onChange={(event) => {
                           const value = Number(
                              event.target.value.replace(',', '.'),
                           );
                           if (!Number.isNaN(value))
                              onChange({
                                 ...draft,
                                 flags: { ...draft.flags, [key]: value },
                              });
                        }}
                     />
                     <span className='text-ink-soft text-meta'>{t(unit)}</span>
                  </span>
               </label>
            ))}
         </div>
         <p className='text-ink-soft border-line mt-auto border-t px-4.5 py-2.5 text-xs'>
            {t(
               'Флаги считаются по последнему подтверждённому кварталу каждой компании.',
            )}
         </p>
      </Card>
   );
};

export default Flags;

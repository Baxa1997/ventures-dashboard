import useSaveQueue from '@shared/hooks/useSaveQueue';
import clsx from 'clsx';
import {
   type HTMLAttributes,
   type KeyboardEvent,
   useEffect,
   useRef,
   useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from './Button';

export interface InlineOption {
   value: string;
   label: string;
}

export type InlineKind =
   | 'text'
   | 'multiline'
   | 'number'
   | 'date'
   | 'select'
   | 'email'
   | 'url'
   | 'tel';

interface InlineFieldProps {
   label: string; // what the value is: for screen readers and the hint
   value: string; // as saved
   onSave: (next: string) => unknown; // the text as typed, trimmed
   kind?: InlineKind;
   options?: InlineOption[]; // a select's choices
   format?: (value: string) => string; // how a saved value reads, e.g. $250,000
   placeholder?: string; // shown while the value is empty
   validate?: (text: string) => string | undefined; // why the text is refused
   disabled?: boolean; // read only: shown as text
   maxLength?: number;
   autoFocus?: boolean;
   className?: string; // the text's size and weight: the field takes them on
   inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
   onDone?: () => void; // after leaving the field, saved or not
}

const NUMERIC: InlineKind[] = ['number'];

/* A value changed where it stands, as in Notion: it reads as text, shows its
   frame on hover and becomes a field on a click. Leaving it, or Enter, saves
   what changed; Esc gives the saved value back. A select saves its choice at
   once. A text the check refuses stays, marked, with why under it. Saves go
   one after another, and a failure says so; the value then reads as saved. */
const InlineField = ({
   label,
   value,
   onSave,
   kind = 'text',
   options = [],
   format,
   placeholder,
   validate,
   disabled = false,
   maxLength = 200,
   autoFocus = false,
   className,
   inputMode,
   onDone,
}: InlineFieldProps) => {
   const { t } = useTranslation('components');
   const save = useSaveQueue();
   const [focused, setFocused] = useState(false);
   const [text, setText] = useState(value);
   const [error, setError] = useState('');
   const [pending, setPending] = useState<string | null>(null);
   const cancel = useRef(false);

   // a value saved elsewhere reads here, unless it is being typed
   useEffect(() => {
      if (!focused && !error) setText(value);
   }, [value, focused, error]);

   const commit = async (raw: string) => {
      const next = raw.trim();
      if (next === value.trim()) {
         setError('');
         setText(value);
         return;
      }
      const refused = validate?.(next);
      if (refused) {
         setError(refused);
         return;
      }
      setError('');
      setPending(next);
      await save(async () => {
         await onSave(next);
      });
      setPending(null);
   };

   const leave = async (raw: string) => {
      setFocused(false);
      if (cancel.current) {
         cancel.current = false;
         setError('');
         setText(value);
      } else await commit(raw);
      onDone?.();
   };

   const onKeyDown = (
      event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
   ) => {
      if (event.key === 'Escape') {
         event.preventDefault();
         event.stopPropagation(); // a dialog around it stays open
         cancel.current = true;
         event.currentTarget.blur();
      } else if (
         event.key === 'Enter' &&
         (kind !== 'multiline' || event.metaKey || event.ctrlKey)
      ) {
         event.preventDefault();
         event.currentTarget.blur();
      }
   };

   const shown =
      focused || error
         ? text
         : (pending ?? (format && value ? format(value) : value));
   const hint = disabled
      ? undefined
      : kind === 'select'
        ? t('Выбрать: {{name}}', { name: label })
        : t('Нажмите, чтобы изменить: {{name}}', { name: label });
   const common = {
      'aria-label': label,
      'aria-invalid': !!error || undefined,
      'aria-busy': pending !== null || undefined,
      'data-hint': hint,
      disabled,
      className: clsx('inline-input', className),
   };

   const field =
      kind === 'select' ? (
         <select
            {...common}
            className={clsx(common.className, !disabled && 'select-chevron pr-6')}
            value={pending ?? value}
            onChange={async (event) => {
               const next = event.target.value;
               if (next === value) return;
               setPending(next);
               await save(async () => {
                  await onSave(next);
               });
               setPending(null);
            }}
         >
            {!options.some((option) => option.value === (pending ?? value)) && (
               <option value={pending ?? value}>
                  {placeholder ?? '—'}
               </option>
            )}
            {options.map((option) => (
               <option key={option.value} value={option.value}>
                  {option.label}
               </option>
            ))}
         </select>
      ) : kind === 'multiline' ? (
         <textarea
            {...common}
            autoFocus={autoFocus}
            className={clsx(common.className, 'field-sizing-content resize-none')}
            maxLength={maxLength}
            placeholder={disabled ? '—' : (placeholder ?? t('Добавить'))}
            rows={1}
            value={shown}
            onBlur={(event) => leave(event.target.value)}
            onChange={(event) => {
               setText(event.target.value);
               setError('');
            }}
            onFocus={() => {
               setFocused(true);
               setText(error ? text : value);
            }}
            onKeyDown={onKeyDown}
         />
      ) : (
         <input
            {...common}
            autoFocus={autoFocus}
            inputMode={
               inputMode ?? (NUMERIC.includes(kind) ? 'decimal' : undefined)
            }
            maxLength={maxLength}
            placeholder={disabled ? '—' : (placeholder ?? t('Добавить'))}
            type={
               kind === 'date'
                  ? 'date'
                  : kind === 'email'
                    ? 'email'
                    : kind === 'tel'
                      ? 'tel'
                      : 'text'
            }
            value={
               kind === 'date'
                  ? focused || error
                     ? text
                     : (pending ?? value)
                  : shown
            }
            onBlur={(event) => leave(event.target.value)}
            onChange={(event) => {
               setText(event.target.value);
               setError('');
            }}
            onFocus={() => {
               setFocused(true);
               setText(error ? text : value);
            }}
            onKeyDown={onKeyDown}
         />
      );

   return (
      <span className='relative block min-w-0'>
         {field}
         {pending !== null && (
            <Spinner className='text-ink-soft pointer-events-none absolute top-1/2 -right-1 size-3.5 -translate-y-1/2' />
         )}
         {error && (
            <span role='alert' className='text-danger mt-0.5 block text-xs'>
               {error}
            </span>
         )}
      </span>
   );
};

export default InlineField;

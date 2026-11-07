import clsx from 'clsx';
import { Ellipsis, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export interface MenuAction {
   label: string;
   icon: LucideIcon;
   danger?: boolean; // a delete: red, and kept last
   accent?: boolean; // the main step: in the accent colour
   hint?: string; // what it does, on hover; «label: name» unless given
   onSelect: () => void;
}

interface ActionMenuProps {
   name: string; // the item, for screen readers: «Действия: Устав.pdf»
   actions: MenuAction[];
   className?: string;
   // the head of a card: a 36px bordered button, as the icons beside it
   bordered?: boolean;
   label?: string; // the button's own hint; «Действия: name» unless given
   text?: string; // a bordered button's visible name, beside its «⋯»
}

const GAP = 4; // between the button and the list

/* A card's head button with its name, as «Изменить», «Задача», «Чат» and
   «Действия» on a deal's or a company's card: 36px, bordered, the icon
   before the word. */
export const HEAD_BUTTON =
   'border-line text-ink hover:bg-hover inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-semibold whitespace-nowrap transition-colors';

/* A row's «⋯» and the list of what can be done with it. The list is a
   popover: it opens over everything (a table's scroll does not cut it),
   and a click outside or Escape closes it. Clicks inside do not reach the
   row, which has its own. */
const ActionMenu = ({
   name,
   actions,
   className,
   bordered = false,
   label,
   text,
}: ActionMenuProps) => {
   const { t } = useTranslation('components');
   const id = useId();
   const button = useRef<HTMLButtonElement>(null);
   const list = useRef<HTMLDivElement>(null);

   // the list under the button, its right edge at the button's, kept on screen
   const place = () => {
      const anchor = button.current?.getBoundingClientRect();
      const menu = list.current;
      if (!anchor || !menu) return;
      const below = anchor.bottom + GAP + menu.offsetHeight <= innerHeight;
      const top = below
         ? anchor.bottom + GAP
         : Math.max(GAP, anchor.top - GAP - menu.offsetHeight);
      menu.style.top = `${top}px`;
      menu.style.left = `${Math.max(GAP, anchor.right - menu.offsetWidth)}px`;
   };

   // the page moving under an open list would leave it behind: it closes
   const close = useRef(() => list.current?.hidePopover());
   const follow = (on: boolean) => {
      const listen = on ? addEventListener : removeEventListener;
      listen('scroll', close.current, true);
      listen('resize', close.current);
   };
   useEffect(() => () => follow(false), []);

   if (!actions.length) return null;

   return (
      <span
         className={clsx('inline-flex', className)}
         onClick={(event) => event.stopPropagation()}
         onKeyDown={(event) => event.stopPropagation()}
      >
         <button
            ref={button}
            type='button'
            aria-label={label ?? t('Действия: {{name}}', { name })}
            className={
               bordered && text
                  ? HEAD_BUTTON
                  : bordered
                    ? 'border-line text-ink-soft hover:bg-hover hover:text-ink grid size-9 place-items-center rounded-lg border bg-white transition-colors'
                    : 'text-ink-soft hover:bg-ground hover:text-ink grid size-7 place-items-center rounded-md'
            }
            data-hint={label ?? t('Действия: {{name}}', { name })}
            popoverTarget={id}
         >
            <Ellipsis
               aria-hidden
               className={clsx('size-4', text && 'text-ink-soft')}
            />
            {bordered && text}
         </button>
         <div
            ref={list}
            className='border-line shadow-popup fixed inset-auto m-0 min-w-48 rounded-lg border bg-white p-1'
            id={id}
            popover='auto'
            onToggle={(event) => {
               const open = event.newState === 'open';
               follow(open);
               if (!open) return;
               place();
               list.current?.querySelector('button')?.focus();
            }}
         >
            {actions.map(({ label, icon: Icon, danger, accent, hint, onSelect }) => (
               <button
                  key={label}
                  type='button'
                  className={clsx(
                     'text-meta hover:bg-ground flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.75 text-left',
                     danger
                        ? 'text-danger'
                        : accent
                          ? 'text-accent font-semibold'
                          : 'text-ink',
                  )}
                  data-hint={hint ?? `${label}: ${name}`}
                  onClick={() => {
                     list.current?.hidePopover();
                     onSelect();
                  }}
               >
                  <Icon
                     aria-hidden
                     className={clsx(
                        'size-4 shrink-0',
                        !danger && !accent && 'text-ink-soft',
                     )}
                  />
                  {label}
               </button>
            ))}
         </div>
      </span>
   );
};

export default ActionMenu;
